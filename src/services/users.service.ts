import type { PrismaClient } from "@prisma/client";
import { NotFound } from "../common/exceptions.js";
import type { RequestUser } from "../types/auth.js";

export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async getMe(user: RequestUser) {
    const me = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true, updatedAt: true },
    });
    if (!me) throw new NotFound("User not found.");
    return me;
  }

  async updateMe(user: RequestUser, data: { firstName?: string | null; lastName?: string | null }) {
    return this.prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true, updatedAt: true },
    });
  }

  async deleteMe(user: RequestUser) {
    await this.prisma.user.delete({ where: { id: user.id } });
    return { deleted: true };
  }
}

