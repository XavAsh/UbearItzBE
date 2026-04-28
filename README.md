# Ubearitz Backend (Fastify + Prisma)

## Setup

```bash
npm install --prefix ./backend
```

## Database (MySQL via Docker)

Start MySQL:

```bash
docker compose -f ./backend/docker-compose.yml up -d
```

Configure `backend/.env` (already provided for local dev):

- `DATABASE_URL="mysql://ubearitz:ubearitz_password@localhost:3306/ubearitz"`

Run the initial migration (creates tables and generates Prisma Client):

```bash
npm --prefix ./backend run db:migrate -- --name init
```

Seed some dev data:

```bash
npm --prefix ./backend run db:seed
```

## Run the API

```bash
npm --prefix ./backend run dev
```

Endpoints:

- `GET /health`
- `GET /debug/db`

