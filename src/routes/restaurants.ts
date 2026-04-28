import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import bcrypt from "bcryptjs";
import { authorize } from "../lib/authorize.js";
import { RestaurantsService } from "../services/restaurants.service.js";

const Slug = Type.String({ minLength: 2, maxLength: 80, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" });

export function registerRestaurantsRoutes(app: FastifyInstance) {
  const service = new RestaurantsService(app.prisma);

  app.get(
    "/restaurants",
    {
      schema: {
        response: {
          200: Type.Array(
            Type.Object({
              id: Type.String(),
              name: Type.String(),
              slug: Type.String(),
              address: Type.Union([Type.String(), Type.Null()]),
              imageUrl: Type.Union([Type.String(), Type.Null()]),
              ownerId: Type.String(),
              createdAt: Type.String(),
              updatedAt: Type.String(),
            }),
          ),
        },
      },
    },
    async () => service.getAll(),
  );

  app.get(
    "/restaurants/me",
    { preHandler: [app.authenticate] },
    async (request) => {
      authorize(request, "RESTAURANT");
      return service.getMine(request.user);
    },
  );

  app.patch(
    "/restaurants/me",
    {
      preHandler: [app.authenticate],
      schema: {
        body: Type.Object({
          name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
          address: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 255 }), Type.Null()])),
          imageUrl: Type.Optional(Type.Union([Type.String({ maxLength: 191 }), Type.Null()])),
        }),
      },
    },
    async (request) => {
      authorize(request, "RESTAURANT");
      return service.updateMine(request.user, request.body as any);
    },
  );

  // ADMIN: create restaurant owner + restaurant in one request
  app.post(
    "/restaurants",
    {
      preHandler: [app.authenticate],
      schema: {
        body: Type.Object({
          email: Type.String({ format: "email" }),
          password: Type.String({ minLength: 8, maxLength: 72 }),
          name: Type.String({ minLength: 1, maxLength: 120 }),
          slug: Slug,
          address: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 255 }), Type.Null()])),
          imageUrl: Type.Optional(Type.Union([Type.String({ maxLength: 191 }), Type.Null()])),
        }),
      },
    },
    async (request, reply) => {
      authorize(request, "ADMIN");
      const body = request.body as any;
      const passwordHash = await bcrypt.hash(body.password, 12);
      const result = await service.createAsAdmin({
        email: body.email,
        passwordHash,
        name: body.name,
        slug: body.slug,
        address: body.address,
        imageUrl: body.imageUrl,
      });
      reply.status(201).send(result);
    },
  );

  app.delete(
    "/restaurants/:restaurantId",
    {
      preHandler: [app.authenticate],
      schema: { params: Type.Object({ restaurantId: Type.String() }) },
    },
    async (request) => {
      authorize(request, "ADMIN");
      const { restaurantId } = request.params as any;
      return service.deleteAsAdmin(restaurantId);
    },
  );
}

