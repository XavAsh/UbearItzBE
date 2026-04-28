import type { WebSocket } from "ws";

const WS_OPEN = 1;

class WebsocketService {
  // restaurantId -> active sockets
  private readonly restaurantConnections = new Map<string, Set<WebSocket>>();

  registerRestaurantConnection(restaurantId: string, socket: WebSocket) {
    const set = this.restaurantConnections.get(restaurantId) ?? new Set<WebSocket>();
    set.add(socket);
    this.restaurantConnections.set(restaurantId, set);
  }

  unregisterRestaurantConnection(restaurantId: string, socket: WebSocket) {
    const set = this.restaurantConnections.get(restaurantId);
    if (!set) return;

    set.delete(socket);
    if (set.size === 0) {
      this.restaurantConnections.delete(restaurantId);
    }
  }

  notifyRestaurant(restaurantId: string, event: string, data: unknown) {
    const set = this.restaurantConnections.get(restaurantId);
    if (!set || set.size === 0) return;

    const message = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const socket of set) {
      try {
        if (socket.readyState !== WS_OPEN) continue;
        socket.send(message);
      } catch {
        // Best effort cleanup: if sending fails, remove the socket.
        this.unregisterRestaurantConnection(restaurantId, socket);
      }
    }
  }
}

export const websocketService = new WebsocketService();

