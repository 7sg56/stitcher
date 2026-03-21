# Stitcher Architecture Guide

## 🧩 Overview

Stitcher is a modular monorepo application built to connect students and teachers through features like attendance, feedback, and analytics.

Stack:
- Frontend: Next.js (apps/web)
- Backend: Fastify (apps/api)
- Auth: Clerk
- DB: PostgreSQL (Prisma ORM)
- Infra: Docker (Postgres, Redis)

---

## 🏗️ Monorepo Structure

apps/
  web/        → frontend (Next.js)
  api/        → backend (Fastify)

packages/
  types/      → shared TypeScript types
  config/     → shared configs
  ui/         → shared UI (optional)

docker/
  → infra configs (Postgres, Redis)

---

## 🧠 Backend Architecture

Pattern:
Route → Controller → Service → DB

src/
  modules/     → feature modules ONLY
  core/        → shared infra (plugins, utils)
  config/      → env config

---

## 📦 Modules (MVP only)

- auth
- users
- attendance
- feedback
- dashboard
- quiz

Each module MUST follow:

module/
  *.route.ts
  *.controller.ts
  *.service.ts
  *.schema.ts
  *.types.ts

---

## 🚨 Rules (IMPORTANT)

1. No business logic in controllers
2. No DB queries outside services
3. No cross-module imports (use services)
4. Validate all input using Zod
5. Keep modules independent

---

## 🔐 Auth (Clerk)

- Clerk handles authentication
- Backend verifies using @clerk/fastify
- Store user in DB (sync on login)

---

## 🗄️ Database (Prisma)

- Located in apps/api/prisma/
- All schema defined in schema.prisma
- Use Prisma Client in services only

---

## 🔁 Async Jobs (Future)

- Use Redis + BullMQ
- For analytics, reports, predictions

---

## 🌐 Frontend Rules

- Feature-based structure
- No direct backend calls (use lib/api.ts)
- Keep UI and logic separated

---

## 🧠 Development Philosophy

- Build MVP modules only
- Keep architecture scalable
- Prefer simplicity over abstraction
