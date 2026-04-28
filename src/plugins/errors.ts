import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { HttpError } from "../common/exceptions.js";
import type { ProblemDetails } from "../common/exceptions.js";
export { HttpError, problem } from "../common/exceptions.js";
export type { ProblemDetails };

export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler(async (err: FastifyError | HttpError, _req: FastifyRequest, reply: FastifyReply) => {
    const isHttpError = err instanceof HttpError;
    const prismaCode = (err as FastifyError & { code?: string }).code;
    const isPrismaTooLong = prismaCode === "P2000";
    const status = isPrismaTooLong ? 400 : (isHttpError ? err.status : (err.statusCode ?? undefined)) ?? 500;

    // Fastify AJV validation errors: treat as 400 with a clear message.
    const isValidation = (err as FastifyError).code === "FST_ERR_VALIDATION";
    const validationDetail =
      isValidation && Array.isArray((err as unknown as { validation?: unknown }).validation)
        ? JSON.stringify((err as unknown as { validation: unknown }).validation)
        : undefined;

    const body: ProblemDetails = isHttpError
      ? { type: err.type, title: err.title, detail: err.detail, status: err.status }
      : isValidation
        ? {
            type: "https://example.com/problems/validation-error",
            title: "Validation error",
            detail: validationDetail
              ? `Request payload is invalid: ${validationDetail}`
              : "Request payload is invalid.",
            status: 400,
          }
        : isPrismaTooLong
          ? {
              type: "https://example.com/problems/validation-error",
              title: "Validation error",
              detail: "One of the provided fields is too long.",
              status: 400,
            }
        : {
            type: "about:blank",
            title: status >= 500 ? "Internal Server Error" : "Request Error",
            detail: status >= 500 ? "An unexpected error occurred." : err.message || "Request failed.",
            status,
          };

    // Avoid leaking internals.
    if (status >= 500) {
      app.log.error({ err }, "Unhandled error");
    } else {
      app.log.info({ err: { message: err.message, code: (err as FastifyError).code, status } }, "Request error");
    }

    reply.status(body.status).send(body);
  });
}

