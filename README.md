# Stitcher

A modular monorepo connecting students and teachers through attendance, feedback, and analytics.

## Stack

- **Frontend**: Next.js 16 (React 19)
- **Backend**: Fastify
- **Auth**: Clerk
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Infra**: Docker

## Project Structure

```
stitcher/
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # Fastify backend
├── packages/
│   ├── types/      # Shared TypeScript types
│   ├── config/     # Shared configs
│   └── ui/         # Shared UI components
├── docker/         # Docker & compose
└── .env            # Environment variables (root)
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for infra)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- Clerk keys for authentication
- Database URL (PostgreSQL)
- Redis URL

### 3. Start Infrastructure

```bash
cd docker
docker-compose up -d
```

This starts PostgreSQL on port `5432` and Redis on `6379`.

### 4. Run Services

```bash
# API (port 3001)
npm run dev:api

# Web (port 3000) - in another terminal
npm run dev:web
```

### 5. Run Migrations

```bash
cd apps/api
npx prisma migrate dev
```

## Docker Deployment

```bash
cd docker
docker-compose up -d --build
```

- Web: http://localhost:3000
- API: http://localhost:3001
- DB: localhost:5432
- Redis: localhost:6379

## Backend Architecture

Pattern: **Route → Controller → Service → DB**

```
apps/api/src/
├── modules/         # Feature modules (auth, users, etc.)
│   └── [module]/
│       ├── *.route.ts
│       ├── *.controller.ts
│       ├── *.service.ts
│       ├── *.schema.ts
│       └── *.types.ts
├── core/            # Shared infra (plugins, utils)
└── config/          # Env config
```

## MVP Modules

- `auth` - Clerk integration
- `users` - User management
- `attendance` - Attendance tracking
- `feedback` - Feedback system
- `dashboard` - Analytics
- `quiz` - Quiz functionality
