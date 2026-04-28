import Fastify, { type FastifyBaseLogger } from "fastify";
import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";

import websocket from "@fastify/websocket";

import { registerErrorHandling } from "./plugins/errors.js";
import { registerSecurity } from "./plugins/security.js";
import { registerPrisma } from "./plugins/prisma.js";
import { registerJwt } from "./plugins/jwt.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerRestaurantsRoutes } from "./routes/restaurants.js";
import { registerDishesRoutes } from "./routes/dishes.js";
import { registerOrdersRoutes } from "./routes/orders.js";
import { registerUsersRoutes } from "./routes/users.js";
import { registerWebsocketRoutes } from "./routes/websocket.js";
import { registerGraphql } from "./graphql/index.js";

export type CreateAppOptions = {
  logger?: boolean | FastifyBaseLogger;
};

export function createApp(opts: CreateAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? true });

  registerErrorHandling(app);
  registerSecurity(app);
  // Ensure all plugins are registered before routes
  void app.register(async (fastify) => {
    await registerPrisma(fastify);
    await registerJwt(fastify);
    await fastify.register(websocket);
    registerWebsocketRoutes(fastify);
    await registerGraphql(fastify);

    fastify.get(
      "/health",
      {
        schema: {
          response: {
            200: Type.Object({ ok: Type.Boolean() }),
          },
        },
      },
      async () => ({ ok: true }),
    );
    fastify.get(
      "/debug/db",
      {
        schema: {
          response: {
            200: Type.Object({
              users: Type.Number(),
              restaurants: Type.Number(),
              dishes: Type.Number(),
              orders: Type.Number(),
            }),
          },
        },
      },
      async (request) => {
      const prisma = request.server.prisma;
      const [users, restaurants, dishes, orders] = await Promise.all([
        prisma.user.count(),
        prisma.restaurant.count(),
        prisma.dish.count(),
        prisma.order.count(),
      ]);
      return { users, restaurants, dishes, orders };
      },
    );

    registerAuthRoutes(fastify);
    registerRestaurantsRoutes(fastify);
    registerDishesRoutes(fastify);
    registerOrdersRoutes(fastify);
    registerUsersRoutes(fastify);
  });

  return app;
}

