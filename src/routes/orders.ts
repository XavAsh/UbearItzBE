import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import { authorize } from "../lib/authorize.js";
import { OrdersService } from "../services/orders.service.js";

export function registerOrdersRoutes(app: FastifyInstance) {
  const service = new OrdersService(app.prisma);

  app.post(
    "/orders",
    {
      preHandler: [app.authenticate],
      schema: {
        body: Type.Object({
          restaurantId: Type.String(),
          items: Type.Array(
            Type.Object({
              dishId: Type.String(),
              quantity: Type.Integer({ minimum: 1 }),
            }),
            { minItems: 1 },
          ),
        }),
      },
    },
    async (request, reply) => {
      authorize(request, "USER");
      const order = await service.createOrder(request.user, request.body as any);
      reply.status(201).send(order);
    },
  );

  app.get(
    "/orders/:orderId",
    {
      preHandler: [app.authenticate],
      schema: { params: Type.Object({ orderId: Type.String() }) },
    },
    async (request) => {
      const { orderId } = request.params as any;
      return service.getOrderById(request.user, orderId);
    },
  );

  app.get(
    "/users/me/orders",
    { preHandler: [app.authenticate] },
    async (request) => {
      authorize(request, "USER");
      return service.getUserOrders(request.user);
    },
  );

  app.get(
    "/restaurants/me/orders",
    { preHandler: [app.authenticate] },
    async (request) => {
      authorize(request, "RESTAURANT");
      return service.getRestaurantOrders(request.user);
    },
  );

  app.patch(
    "/restaurants/me/orders/:orderId/status",
    {
      preHandler: [app.authenticate],
      schema: {
        params: Type.Object({ orderId: Type.String() }),
        body: Type.Object({
          status: Type.Union([
            Type.Literal("CONFIRMED"),
            Type.Literal("PAID"),
            Type.Literal("PREPARING"),
            Type.Literal("READY"),
            Type.Literal("DELIVERED"),
            Type.Literal("CANCELLED"),
          ]),
        }),
      },
    },
    async (request) => {
      authorize(request, "RESTAURANT");
      const { orderId } = request.params as any;
      const { status } = request.body as any;
      return service.updateStatusAsRestaurant(request.user, orderId, status);
    },
  );

  app.delete(
    "/orders/:orderId",
    {
      preHandler: [app.authenticate],
      schema: { params: Type.Object({ orderId: Type.String() }) },
    },
    async (request) => {
      authorize(request, "USER");
      const { orderId } = request.params as any;
      return service.cancelAsUser(request.user, orderId);
    },
  );
}
