import type { UserRole } from "@prisma/client";

export type RequestUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type JwtPayload = {
  sub: string;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: RequestUser;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user: RequestUser;
  }
}

