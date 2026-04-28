import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

import type { RequestUser } from "../types/auth.js";
import { websocketService } from "../services/websocket.service.js";

export interface AuthenticatedSocket {
  user: RequestUser;
  restaurantId: string;
  socket: WebSocket;
}

function asText(raw: unknown) {
  if (typeof raw === "string") return raw;
  if (raw instanceof Buffer) return raw.toString("utf8");
  return "";
}

export function registerWebsocketRoutes(app: FastifyInstance) {
  app.get("/ws/restaurant", { websocket: true }, (socket) => {
    let authSocket: AuthenticatedSocket | null = null;
    let closed = false;

    const closeAuth = (reason: string) => {
      if (closed) return;
      closed = true;
      socket.close(1008, reason);
    };

    const closeServer = (reason: string) => {
      if (closed) return;
      closed = true;
      socket.close(1011, reason);
    };

    const cleanup = () => {
      if (!authSocket) return;
      websocketService.unregisterRestaurantConnection(authSocket.restaurantId, socket);
    };

    const sendJson = (payload: unknown) => {
      try {
        socket.send(JSON.stringify(payload));
      } catch {
        // Ignore; if it fails we'll let the error/close path handle cleanup.
      }
    };

    socket.on("message", async (raw: unknown) => {
      if (closed) return;

      let msg: { event?: unknown; token?: unknown } & Record<string, unknown>;
      try {
        const text = asText(raw);
        msg = JSON.parse(text) as any;
      } catch {
        closeAuth("Invalid JSON.");
        return;
      }

      if (!authSocket) {
        if (msg.event !== "authenticate" || typeof msg.token !== "string") {
          closeAuth("Authentication required.");
          return;
        }

        let payload: { sub: string };
        try {
          payload = await app.jwt.verify<{ sub: string }>(msg.token);
        } catch (err) {
          app.log.warn({ err }, "WebSocket token verification failed");
          closeAuth("Invalid or expired token.");
          return;
        }

        let user: RequestUser | null;
        try {
          user = await app.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, role: true },
          });
        } catch (err) {
          app.log.error({ err }, "WebSocket user lookup failed");
          closeServer("Server error.");
          return;
        }

        if (!user || user.role !== "RESTAURANT") {
          closeAuth("Restaurant role required.");
          return;
        }

        let restaurantId: string | null;
        try {
          const restaurant = await app.prisma.restaurant.findFirst({
            where: { ownerId: user.id },
            select: { id: true },
          });
          restaurantId = restaurant?.id ?? null;
        } catch (err) {
          app.log.error({ err }, "WebSocket restaurant lookup failed");
          closeServer("Server error.");
          return;
        }

        if (!restaurantId) {
          closeAuth("Restaurant not found for user.");
          return;
        }

        authSocket = { user: user satisfies RequestUser, restaurantId, socket: socket as WebSocket };
        websocketService.registerRestaurantConnection(authSocket.restaurantId, socket as WebSocket);

        sendJson({
          event: "connected",
          data: { restaurantId: authSocket.restaurantId, message: "Connected." },
          timestamp: new Date().toISOString(),
        });

        return;
      }

      if (msg.event === "ping") {
        sendJson({ event: "pong", timestamp: new Date().toISOString() });
        return;
      }

      // Unknown events are ignored (best effort).
    });

    socket.on("close", () => {
      closed = true;
      cleanup();
    });

    socket.on("error", (err: unknown) => {
      app.log.error({ err }, "WebSocket error");
      cleanup();
      closeServer("WebSocket server error.");
    });
  });
}

