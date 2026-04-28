import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

export function registerSecurity(app: FastifyInstance) {
  app.register(helmet);

  app.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser tools (curl/postman) and same-origin.
      if (!origin) return cb(null, true);
      // Dev allowlist
      const allowed = new Set([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]);
      cb(null, allowed.has(origin));
    },
    credentials: true,
  });
}

