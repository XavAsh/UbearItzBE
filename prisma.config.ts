import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  migrations: {
    seed: "node --import tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

