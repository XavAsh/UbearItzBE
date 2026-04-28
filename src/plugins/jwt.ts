import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { Unauthorized } from "../common/exceptions.js";
import type { JwtPayload, RequestUser } from "../types/auth.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerJwt(app: FastifyInstance) {
  await app.register(
    fp(async (fastify) => {
      const secret = process.env.JWT_SECRET ?? "dev-only-secret-change-me";
      await fastify.register(jwt, { secret });

      fastify.decorate("authenticate", async (request: FastifyRequest) => {
        const auth = request.headers.authorization;
        if (!auth?.startsWith("Bearer ")) {
          throw new Unauthorized("Missing bearer token.");
        }
        const token = auth.slice("Bearer ".length);

        let payload: JwtPayload;
        try {
          payload = await fastify.jwt.verify<JwtPayload>(token);
        } catch {
          throw new Unauthorized("Invalid or expired token.");
        }

        const user = await fastify.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true },
        });
        if (!user) {
          throw new Unauthorized("User not found.");
        }

        request.user = user satisfies RequestUser;
      });
    }),
  );
}

