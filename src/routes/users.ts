import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import { authorize } from "../lib/authorize.js";
import { UsersService } from "../services/users.service.js";

export function registerUsersRoutes(app: FastifyInstance) {
  const service = new UsersService(app.prisma);

  app.get(
    "/users/me",
    { preHandler: [app.authenticate] },
    async (request) => {
      authorize(request, "USER");
      return service.getMe(request.user);
    },
  );

  app.patch(
    "/users/me",
    {
      preHandler: [app.authenticate],
      schema: {
        body: Type.Object({
          firstName: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()])),
          lastName: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()])),
        }),
      },
    },
    async (request) => {
      authorize(request, "USER");
      return service.updateMe(request.user, request.body as any);
    },
  );

  app.delete(
    "/users/me",
    { preHandler: [app.authenticate] },
    async (request) => {
      authorize(request, "USER");
      return service.deleteMe(request.user);
    },
  );
}
