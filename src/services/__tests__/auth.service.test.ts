import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { ConflictError, Unauthorized } from "../../common/exceptions.js";
import { AuthService } from "../auth.service.js";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

function createPrismaMock() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("AuthService", () => {
  const bcryptMock = bcrypt as unknown as {
    hash: ReturnType<typeof vi.fn>;
    compare: ReturnType<typeof vi.fn>;
  };
  const signAccessToken = vi.fn(async (_userId: string) => "signed-access-token");
  const prismaMock = createPrismaMock();
  const authService = new AuthService({
    prisma: prismaMock as unknown as PrismaClient,
    signAccessToken,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    signAccessToken.mockResolvedValue("signed-access-token");
  });

  it("registers a user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    bcryptMock.hash.mockResolvedValue("hashed-password");
    prismaMock.user.create.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "USER",
      firstName: "Ada",
      lastName: "Lovelace",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await authService.register({
      email: "test@example.com",
      password: "password123",
      firstName: "Ada",
      lastName: "Lovelace",
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
    expect(bcryptMock.hash).toHaveBeenCalledWith("password123", 12);
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(result.email).toBe("test@example.com");
  });

  it("rejects duplicate registration emails", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing-user" });

    await expect(
      authService.register({
        email: "test@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("logs in a user with valid credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "USER",
      passwordHash: "hashed-password",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    bcryptMock.compare.mockResolvedValue(true);
    signAccessToken.mockResolvedValue("signed-access-token");
    prismaMock.refreshToken.create.mockResolvedValue({ id: "refresh-1" });

    const result = await authService.login({
      email: "test@example.com",
      password: "password123",
    });

    expect(bcryptMock.compare).toHaveBeenCalledWith("password123", "hashed-password");
    expect(signAccessToken).toHaveBeenCalledWith("user-1");
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
    expect(result.accessToken).toBe("signed-access-token");
    expect(result.user.email).toBe("test@example.com");
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it("rejects a bad password during login", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "USER",
      passwordHash: "hashed-password",
      firstName: null,
      lastName: null,
    });
    bcryptMock.compare.mockResolvedValue(false);

    await expect(
      authService.login({
        email: "test@example.com",
        password: "wrongpassword",
      }),
    ).rejects.toBeInstanceOf(Unauthorized);
  });
});
