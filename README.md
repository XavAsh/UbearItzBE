# Ubearitz Backend (Fastify + Prisma)

## Setup

```bash
npm install
```

## Start the backend easily

From `ubearitzBE/`, run:

```bash
npm run db:init
npm run dev
```

That starts:

- the API on `http://localhost:3001`
- MariaDB on `localhost:3306`

Stop the database with:

```bash
npm run db:down
```

If you already had an older MySQL container using port `3306`, clear it once:

```bash
docker compose down --remove-orphans
npm run db:init
```

## Production-style run

```bash
npm run build
npm start
```

## Docker Compose

```bash
docker compose up -d
```

## CI/CD deployment (minimal VPS)

The workflow at `.github/workflows/ci.yml` does:

- run backend tests + build
- push backend Docker image to GHCR on `main`
- deploy on your VPS over SSH on `main`

Required GitHub repository secrets:

- `JWT_SECRET`
- `MARIADB_ROOT_PASS`
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT` (optional, default `22`)
- `VPS_APP_DIR` (example: `/opt/ubearitz`)
- `GHCR_USERNAME`
- `GHCR_TOKEN` (PAT with `read:packages`)
- `PROD_JWT_SECRET`
- `PROD_MARIADB_DATABASE`
- `PROD_MARIADB_USER`
- `PROD_MARIADB_PASSWORD`
- `PROD_MARIADB_ROOT_PASSWORD`

Production compose files:

- `docker-compose.prod.yml`
- `.env.production.example`

## Tests

```bash
npm test
npm run test:coverage
```

Endpoints:

- `GET /health`
- `GET /debug/db`

