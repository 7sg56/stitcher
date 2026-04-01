# Docker Setup & Environment Guide

This guide explains how to set up the environment and use Docker for both Production and Local Development. Because the Docker setup is organized within the `docker/` directory, the commands are slightly different from a standard `docker compose up`.

---

## 1. Production Environment

If you have access to remote services (Clerk for Authentication, Upstash for Redis cache, and Supabase for PostgreSQL database), you can run the production setup.

This configuration spins up only the **API (Fastify)** and **Web (Next.js)** services, as it expects to connect to your remote cloud providers for the database and cache.

### Environment Variables

Create a `.env` file at the root of your project by copying the provided template:

```bash
cp .env.example .env
```

Ensure you fill out the following values in your `.env` file for remote production services:

- **Clerk**: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Supabase**: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- **Redis (e.g. Upstash)**: `REDIS_URL` (and optionally `REDIS_PASSWORD`)
- **API/App Endpoints**: Make sure `API_URL`, `NEXT_PUBLIC_API_URL`, and `APP_URL` point to your actual production domains instead of `localhost`.
- **Node Env**: Set `NODE_ENV=production`

### Commands

Run these commands from the **root directory** of your project:

**Build and Start (Detached mode):**

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

**Stop Services:**

```bash
docker compose -f docker/docker-compose.yml down
```

**View Logs:**

```bash
docker compose -f docker/docker-compose.yml logs -f
```

---

## 2. Local Development Environment

The development environment is fully self-contained. It spins up a local **PostgreSQL database**, a local **Redis cache**, and the **API & Web** services. It relies on volume mounts to map your local source code (`apps/` and `packages/`) into the containers, meaning hot-reloading will work natively as you change files.

### Local Environment Variables

Create your `.env` file by copying the template:

```bash
cp .env.example .env
```

You must fill in the **Clerk** variables for local authentication to work:

- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Since `docker-compose.dev.yml` automatically maps the database and cache to your local containers, you can leave `SUPABASE_URL`, `REDIS_URL`, and all the `http://localhost:*` endpoints exactly as they are in the `.env.example` template for local development. Make sure `NODE_ENV=development`.

### Local Commands

Run these commands from the **root directory** of your project:

**Build and Start:**

```bash
docker compose -f docker/docker-compose.dev.yml up --build
```

*(Omit `-d` if you want to see the logs in real-time, which is usually better for local development).*

**Stop Services:**

```bash
docker compose -f docker/docker-compose.dev.yml down
```

**Stop Services and Wipe Database/Cache Volumes:**
Use this command if your local database or cache enters a corrupted state and you want to start fresh:

```bash
docker compose -f docker/docker-compose.dev.yml down -v
```
