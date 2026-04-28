import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export async function registerPrisma(app: FastifyInstance) {
  await app.register(
    fp(async (fastify) => {
      fastify.decorate("prisma", prisma);
      fastify.addHook("onClose", async () => {
        await prisma.$disconnect();
      });
    }),
  );
}

