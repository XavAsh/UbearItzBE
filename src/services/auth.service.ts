import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, UserRole } from "@prisma/client";
import { addDays } from "../util/time.js";
import { ConflictError, Unauthorized } from "../common/exceptions.js";

type RegisterInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type RefreshInput = {
  refreshToken: string;
};

type PublicUser = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
};

type RefreshTokenUser = PublicUser;

type RefreshTokenRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: RefreshTokenUser;
};

export type RegisterResult = PublicUser & {
  createdAt: Date;
  updatedAt: Date;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

type AuthServiceDeps = {
  prisma: PrismaClient;
  signAccessToken: (userId: string) => string | Promise<string>;
};

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function createRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  async register(input: RegisterInput): Promise<RegisterResult> {
    const { prisma } = this.deps;
    const { email, password, firstName, lastName } = input;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError("Email already exists.");

    const passwordHash = await bcrypt.hash(password, 12);
    return prisma.user.create({
      data: { email, passwordHash, firstName, lastName, role: "USER" },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true, updatedAt: true },
    });
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const { prisma, signAccessToken } = this.deps;
    const { email, password } = input;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, passwordHash: true, firstName: true, lastName: true },
    });
    if (!user) throw new Unauthorized("Invalid credentials.");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Unauthorized("Invalid credentials.");

    const accessToken = await signAccessToken(user.id);
    const refreshToken = createRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: addDays(new Date(), 14),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async refresh(input: RefreshInput): Promise<LoginResult> {
    const { prisma, signAccessToken } = this.deps;
    const tokenHash = sha256(input.refreshToken);

    const record = (await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, role: true, firstName: true, lastName: true },
        },
      },
    })) as RefreshTokenRecord | null;

    if (!record) throw new Unauthorized("Invalid refresh token.");
    if (record.revokedAt) throw new Unauthorized("Refresh token revoked.");
    if (record.expiresAt <= new Date()) throw new Unauthorized("Refresh token expired.");

    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const nextRefreshToken = createRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: sha256(nextRefreshToken),
        expiresAt: addDays(new Date(), 14),
      },
    });

    const accessToken = await signAccessToken(record.userId);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: record.user,
    };
  }
}
