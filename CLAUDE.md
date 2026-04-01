# Stitcher Architecture Guide

## 🧩 Overview

Stitcher is a modular monorepo application built to connect students and teachers through features like attendance, feedback, and analytics.

Stack:

- Frontend: Next.js (apps/web)
- Backend: Fastify (apps/api)
- Auth: Clerk
- DB: Supabase
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

## 📦 Modules & Phases

1. Foundation: auth, users, roles
2. Core Academics: courses, subjects, enrollment
3. Class Management: sessions, attendance
4. Engagement: resources, quiz, doubts (chat), feedback
5. Analytics & Moderation: violations, dashboard, insights
6. Future: lms-sync, predictions

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

## Database (Supabase)

- Uses @supabase/supabase-js directly (no ORM)
- SQL migrations in apps/api/supabase/migrations/
- Types defined in apps/api/src/types/database.ts
- Access via Fastify decorator (fastify.supabase) in services only

---

## 🔁 Async Jobs (Phase 5+)

- Use Redis + BullMQ (or serverless Upstash)
- Critical for End-of-Session Aggregation: When a session ends, defer heavy tasks (Teacher rating calculation, outline "Weak Concept" from quiz/feedback) to a Redis queue. This prevents the synchronous 30-sec feedback burst from crashing the database.
- Needed for: Weak concept generation, LMS Sync, Attendance predictions, and heavy analytical reports.

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
