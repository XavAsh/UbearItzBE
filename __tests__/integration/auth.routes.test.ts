import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";

async function resetDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
}

describe("auth routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = createApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("POST /auth/register creates a user", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "register@example.com",
        password: "password123",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      email: "register@example.com",
      role: "USER",
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("POST /auth/login returns tokens for valid credentials", async () => {
    await prisma.user.create({
      data: {
        email: "login@example.com",
        passwordHash: await bcrypt.hash("password123", 12),
        role: "USER",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "login@example.com",
        password: "password123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: {
        email: "login@example.com",
        role: "USER",
      },
    });
  });

  it("GET /auth/me returns the authenticated user", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "me@example.com",
        password: "password123",
        firstName: "Grace",
        lastName: "Hopper",
      },
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "me@example.com",
        password: "password123",
      },
    });

    const { accessToken } = loginResponse.json();

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: {
        email: "me@example.com",
        role: "USER",
      },
    });
  });
});
