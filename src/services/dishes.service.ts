import type { PrismaClient } from "@prisma/client";
import { Forbidden, NotFound } from "../common/exceptions.js";
import type { RequestUser } from "../types/auth.js";

export class DishesService {
  constructor(private readonly prisma: PrismaClient) {}

  async getByRestaurant(restaurantId: string) {
    return this.prisma.dish.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, restaurantId: true, name: true, description: true, priceCents: true, imageUrl: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async getById(id: string) {
    const dish = await this.prisma.dish.findUnique({
      where: { id },
      select: { id: true, restaurantId: true, name: true, description: true, priceCents: true, imageUrl: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!dish) throw new NotFound("Dish not found.");
    return dish;
  }

  async createForMyRestaurant(user: RequestUser, input: { name: string; description?: string | null; priceCents: number; imageUrl?: string | null }) {
    const restaurant = await this.prisma.restaurant.findFirst({ where: { ownerId: user.id }, select: { id: true } });
    if (!restaurant) throw new NotFound("Restaurant not found.");
    return this.prisma.dish.create({
      data: {
        restaurantId: restaurant.id,
        name: input.name,
        description: input.description ?? null,
        priceCents: input.priceCents,
        imageUrl: input.imageUrl ?? null,
      },
      select: { id: true, restaurantId: true, name: true, description: true, priceCents: true, imageUrl: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async updateMyDish(user: RequestUser, dishId: string, data: { name?: string; description?: string | null; priceCents?: number; imageUrl?: string | null; isActive?: boolean }) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true, restaurantId: true, restaurant: { select: { ownerId: true } } },
    });
    if (!dish) throw new NotFound("Dish not found.");
    if (dish.restaurant.ownerId !== user.id) throw new Forbidden("Not your restaurant.");

    return this.prisma.dish.update({
      where: { id: dishId },
      data,
      select: { id: true, restaurantId: true, name: true, description: true, priceCents: true, imageUrl: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async deleteMyDish(user: RequestUser, dishId: string) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true, restaurant: { select: { ownerId: true } } },
    });
    if (!dish) throw new NotFound("Dish not found.");
    if (dish.restaurant.ownerId !== user.id) throw new Forbidden("Not your restaurant.");
    await this.prisma.dish.delete({ where: { id: dishId } });
    return { deleted: true };
  }
}

