import type { OrderStatus, PrismaClient } from "@prisma/client";
import { BadRequest, Forbidden, NotFound } from "../common/exceptions.js";
import type { RequestUser } from "../types/auth.js";
import { websocketService } from "./websocket.service.js";

type CreateOrderItemInput = { dishId: string; quantity: number };

const allowedNext: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export class OrdersService {
  constructor(private readonly prisma: PrismaClient) {}

  async createOrder(user: RequestUser, input: { restaurantId: string; items: CreateOrderItemInput[] }) {
    if (input.items.length === 0) throw new BadRequest("Order must contain at least one item.");

    const dishes = await this.prisma.dish.findMany({
      where: { id: { in: input.items.map((i) => i.dishId) }, isActive: true },
      select: { id: true, restaurantId: true, priceCents: true },
    });
    if (dishes.length !== input.items.length) throw new BadRequest("One or more dishes do not exist.");

    const restaurantId = dishes[0].restaurantId;
    if (restaurantId !== input.restaurantId) throw new BadRequest("Restaurant mismatch.");
    if (dishes.some((d) => d.restaurantId !== restaurantId)) throw new BadRequest("All dishes must belong to the same restaurant.");

    const priceByDish = new Map(dishes.map((d) => [d.id, d.priceCents] as const));
    const totalCents = input.items.reduce((acc, i) => acc + i.quantity * (priceByDish.get(i.dishId) ?? 0), 0);

    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        restaurantId,
        status: "PENDING",
        totalCents,
        items: {
          create: input.items.map((i) => ({
            dishId: i.dishId,
            quantity: i.quantity,
            unitPriceCents: priceByDish.get(i.dishId)!,
          })),
        },
      },
      include: { items: true },
    });

    // Best effort: notify the restaurant in real-time, but don't break the HTTP request.
    try {
      websocketService.notifyRestaurant(restaurantId, "new-order", {
        orderId: order.id,
        totalPrice: order.totalCents,
        itemCount: order.items.length,
        createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
      });
    } catch (err) {
      // Only log; notifications are optional for correct HTTP behaviour.
      // eslint-disable-next-line no-console
      console.error(err);
    }

    return order;
  }

  async getOrderById(user: RequestUser, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, restaurant: { select: { ownerId: true } } },
    });
    if (!order) throw new NotFound("Order not found.");

    if (user.role === "ADMIN") return order;
    if (user.role === "USER" && order.userId !== user.id) throw new Forbidden("Not your order.");
    if (user.role === "RESTAURANT" && order.restaurant.ownerId !== user.id) throw new Forbidden("Not your restaurant.");
    return order;
  }

  async getUserOrders(user: RequestUser) {
    return this.prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  }

  async getRestaurantOrders(user: RequestUser) {
    const restaurant = await this.prisma.restaurant.findFirst({ where: { ownerId: user.id }, select: { id: true } });
    if (!restaurant) throw new NotFound("Restaurant not found.");
    return this.prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  }

  async updateStatusAsRestaurant(user: RequestUser, orderId: string, next: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!order) throw new NotFound("Order not found.");
    if (order.restaurant.ownerId !== user.id) throw new Forbidden("Not your restaurant.");

    const allowed = allowedNext[order.status] ?? [];
    if (!allowed.includes(next)) throw new BadRequest("Invalid status transition.");

    return this.prisma.order.update({ where: { id: orderId }, data: { status: next } });
  }

  async cancelAsUser(user: RequestUser, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true, userId: true, status: true } });
    if (!order) throw new NotFound("Order not found.");
    if (order.userId !== user.id) throw new Forbidden("Not your order.");
    if (order.status !== "PENDING") throw new BadRequest("Only PENDING orders can be cancelled.");
    return this.prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  }
}

