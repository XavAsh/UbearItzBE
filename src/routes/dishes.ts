import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import { authorize } from "../lib/authorize.js";
import { DishesService } from "../services/dishes.service.js";

export function registerDishesRoutes(app: FastifyInstance) {
  const service = new DishesService(app.prisma);

  app.get(
    "/restaurants/:restaurantId/dishes",
    {
      schema: {
        params: Type.Object({ restaurantId: Type.String() }),
      },
    },
    async (request) => {
      const { restaurantId } = request.params as any;
      return service.getByRestaurant(restaurantId);
    },
  );

  app.get(
    "/dishes/:dishId",
    {
      schema: { params: Type.Object({ dishId: Type.String() }) },
    },
    async (request) => {
      const { dishId } = request.params as any;
      return service.getById(dishId);
    },
  );

  app.post(
    "/dishes",
    {
      preHandler: [app.authenticate],
      schema: {
        body: Type.Object({
          name: Type.String({ minLength: 1, maxLength: 120 }),
          description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
          priceCents: Type.Integer({ minimum: 0 }),
          imageUrl: Type.Optional(Type.Union([Type.String({ maxLength: 191 }), Type.Null()])),
        }),
      },
    },
    async (request, reply) => {
      authorize(request, "RESTAURANT");
      const dish = await service.createForMyRestaurant(request.user, request.body as any);
      reply.status(201).send(dish);
    },
  );

  app.patch(
    "/dishes/:dishId",
    {
      preHandler: [app.authenticate],
      schema: {
        params: Type.Object({ dishId: Type.String() }),
        body: Type.Object({
          name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
          description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
          priceCents: Type.Optional(Type.Integer({ minimum: 0 })),
          imageUrl: Type.Optional(Type.Union([Type.String({ maxLength: 191 }), Type.Null()])),
          isActive: Type.Optional(Type.Boolean()),
        }),
      },
    },
    async (request) => {
      authorize(request, "RESTAURANT");
      const { dishId } = request.params as any;
      return service.updateMyDish(request.user, dishId, request.body as any);
    },
  );

  app.delete(
    "/dishes/:dishId",
    {
      preHandler: [app.authenticate],
      schema: { params: Type.Object({ dishId: Type.String() }) },
    },
    async (request) => {
      authorize(request, "RESTAURANT");
      const { dishId } = request.params as any;
      return service.deleteMyDish(request.user, dishId);
    },
  );
}
