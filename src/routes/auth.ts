import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { addDays } from "../util/time.js";
import { authorize } from "../lib/authorize.js";
import { ConflictError, Unauthorized } from "../common/exceptions.js";

const Email = Type.String({ format: "email" });
const Password = Type.String({ minLength: 8, maxLength: 72 });

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function createRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function registerAuthRoutes(app: FastifyInstance) {
  app.post(
    "/auth/register",
    {
      schema: {
        body: Type.Object({
          email: Email,
          password: Password,
          firstName: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
          lastName: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
        }),
      },
    },
    async (request, reply) => {
      const { email, password, firstName, lastName } = request.body as {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
      };

      const existing = await app.prisma.user.findUnique({ where: { email } });
      if (existing) throw new ConflictError("Email already exists.");

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await app.prisma.user.create({
        data: { email, passwordHash, firstName, lastName, role: "USER" },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true, updatedAt: true },
      });

      reply.status(201).send(user);
    },
  );

  app.post(
    "/auth/login",
    {
      schema: {
        body: Type.Object({
          email: Email,
          password: Password,
        }),
      },
    },
    async (request) => {
      const { email, password } = request.body as { email: string; password: string };

      const user = await app.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, role: true, passwordHash: true, firstName: true, lastName: true },
      });
      if (!user) throw new Unauthorized("Invalid credentials.");

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new Unauthorized("Invalid credentials.");

      const accessToken = await app.jwt.sign({ sub: user.id }, { expiresIn: "30m" });

      const refreshToken = createRefreshToken();
      await app.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(refreshToken),
          expiresAt: addDays(new Date(), 14),
        },
      });

      return {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      };
    },
  );

  app.post(
    "/auth/refresh",
    {
      schema: {
        body: Type.Object({
          refreshToken: Type.String({ minLength: 20 }),
        }),
      },
    },
    async (request) => {
      const { refreshToken } = request.body as { refreshToken: string };
      const tokenHash = sha256(refreshToken);

      const record = await app.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, email: true, role: true, firstName: true, lastName: true } } },
      });
      if (!record) throw new Unauthorized("Invalid refresh token.");
      if (record.revokedAt) throw new Unauthorized("Refresh token revoked.");
      if (record.expiresAt <= new Date()) throw new Unauthorized("Refresh token expired.");

      // Rotate: revoke old, create new
      await app.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });

      const nextRefreshToken = createRefreshToken();
      await app.prisma.refreshToken.create({
        data: {
          userId: record.userId,
          tokenHash: sha256(nextRefreshToken),
          expiresAt: addDays(new Date(), 14),
        },
      });

      const accessToken = await app.jwt.sign({ sub: record.userId }, { expiresIn: "30m" });

      return {
        accessToken,
        refreshToken: nextRefreshToken,
        user: record.user,
      };
    },
  );

  // Example protected route for Postman testing
  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    authorize(request, "USER");
    return { user: request.user };
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (request) => {
    authorize(request, "USER");
    return { user: request.user };
  });
}

