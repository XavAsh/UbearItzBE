import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import { authorize } from "../lib/authorize.js";
import { AuthService } from "../services/auth.service.js";

const Email = Type.String({ format: "email" });
const Password = Type.String({ minLength: 8, maxLength: 72 });

export function registerAuthRoutes(app: FastifyInstance) {
  const authService = new AuthService({
    prisma: app.prisma,
    signAccessToken: (userId) => app.jwt.sign({ sub: userId }, { expiresIn: "30m" }),
  });

  app.post(
    "/auth/register",
    {
      schema: {
        body: Type.Object({
          email: Email,
          password: Password,
          firstName: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
          lastName: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
        }),
      },
    },
    async (request, reply) => {
      const user = await authService.register(request.body as {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
      });
      reply.status(201).send(user);
    },
  );

  app.post(
    "/auth/login",
    {
      schema: {
        body: Type.Object({
          email: Email,
          password: Password,
        }),
      },
    },
    async (request) => authService.login(request.body as { email: string; password: string }),
  );

  app.post(
    "/auth/refresh",
    {
      schema: {
        body: Type.Object({
          refreshToken: Type.String({ minLength: 20 }),
        }),
      },
    },
    async (request) => authService.refresh(request.body as { refreshToken: string }),
  );

  // Example protected route for Postman testing
  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    authorize(request, "USER");
    return { user: request.user };
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (request) => {
    authorize(request, "USER");
    return { user: request.user };
  });
}

