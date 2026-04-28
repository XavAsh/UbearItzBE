import type { FastifyInstance } from "fastify";
import mercurius from "mercurius";

import { schema } from "./restaurant.schema.js";
import { resolvers } from "./restaurant.resolvers.js";

export async function registerGraphql(app: FastifyInstance) {
  await app.register(mercurius as any, {
    schema,
    resolvers,
    graphiql: true,
    context: async (request: any) => {
      const prisma = request.server.prisma;

      // Optional auth support (no auth required for queries).
      const auth: string | undefined = request?.headers?.authorization;
      if (!auth?.startsWith("Bearer ")) return { prisma, user: null };

      try {
        const token = auth.slice("Bearer ".length);
        const payload = await app.jwt.verify<{ sub: string }>(token);
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true, firstName: true, lastName: true },
        });
        return { prisma, user };
      } catch {
        return { prisma, user: null };
      }
    },
  });
}

