import type { PrismaClient, UserRole } from "@prisma/client";
import { ConflictError, NotFound } from "../common/exceptions.js";
import type { RequestUser } from "../types/auth.js";

export class RestaurantsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll() {
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, slug: true, address: true, imageUrl: true, ownerId: true, createdAt: true, updatedAt: true },
    });
  }

  async getMine(user: RequestUser) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { ownerId: user.id },
      select: { id: true, name: true, slug: true, address: true, imageUrl: true, ownerId: true, createdAt: true, updatedAt: true },
    });
    if (!restaurant) throw new NotFound("Restaurant not found.");
    return restaurant;
  }

  async updateMine(user: RequestUser, data: { name?: string; address?: string | null; imageUrl?: string | null }) {
    const existing = await this.prisma.restaurant.findFirst({ where: { ownerId: user.id }, select: { id: true } });
    if (!existing) throw new NotFound("Restaurant not found.");
    return this.prisma.restaurant.update({
      where: { id: existing.id },
      data,
      select: { id: true, name: true, slug: true, address: true, imageUrl: true, ownerId: true, createdAt: true, updatedAt: true },
    });
  }

  async createAsAdmin(input: {
    email: string;
    passwordHash: string;
    name: string;
    slug: string;
    address?: string | null;
    imageUrl?: string | null;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw new ConflictError("Email already exists.");

    const owner = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: "RESTAURANT" satisfies UserRole,
      },
      select: { id: true, email: true, role: true },
    });

    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: input.name,
        slug: input.slug,
        address: input.address ?? null,
        imageUrl: input.imageUrl ?? null,
        ownerId: owner.id,
      },
      select: { id: true, name: true, slug: true, address: true, imageUrl: true, ownerId: true, createdAt: true, updatedAt: true },
    });

    return { owner, restaurant };
  }

  async deleteAsAdmin(restaurantId: string) {
    const existing = await this.prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
    if (!existing) throw new NotFound("Restaurant not found.");
    await this.prisma.restaurant.delete({ where: { id: restaurantId } });
    return { deleted: true as const };
  }
}

