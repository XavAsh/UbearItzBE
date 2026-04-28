import type { UserRole } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { Forbidden, Unauthorized } from "../common/exceptions.js";

const roleRank: Record<UserRole, number> = {
  USER: 1,
  RESTAURANT: 2,
  ADMIN: 3,
};

export function authorize(request: FastifyRequest, requiredRole: UserRole) {
  const user = request.user;
  if (!user) throw new Unauthorized("Missing authentication.");
  if (roleRank[user.role] < roleRank[requiredRole]) {
    throw new Forbidden("Insufficient role.");
  }
}

