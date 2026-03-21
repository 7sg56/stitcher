# Stitcher
A modular monorepo connecting students and teachers through attendance, feedback, and analytics.

## Stack
- **Frontend**: Next.js 16 (React 19)
- **Backend**: Fastify
- **Auth**: Clerk
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Infra**: Docker

## Features

### 30-Second Feedback
Lightweight, time-boxed feedback collection at the end of each session. Students submit quick ratings or comments within 30 seconds, giving teachers instant pulse checks without disrupting workflow.

### Smart Attendance
Automated attendance marking with intelligent conflict detection. Reduces manual effort for teachers while maintaining accuracy across sessions and classes.

### Resource Bridge
A centralized hub for sharing learning materials between teachers and students. Supports file uploads, links, and categorized resources tied to specific courses or sessions.

### Teacher Portfolio
A structured profile for teachers showcasing their courses, session history, feedback scores, and achievements — enabling visibility and performance tracking over time.

### Doubt Clarification
An async Q&A channel where students raise doubts linked to specific sessions or topics. Teachers can respond, and resolved doubts are archived for future reference by the class.

### Student Dashboard
A personalized overview for each student displaying attendance status, pending tasks, recent feedback, quiz scores, and resource access — all in one place.

### Attendance Prediction
ML-informed module that identifies students at risk of attendance shortfalls based on historical patterns. Enables early intervention by teachers and administrators.

### Teacher Insight Report
Aggregated analytics for teachers covering class attendance trends, feedback summaries, quiz performance, and student engagement metrics — delivered as structured reports.

### Student Attendance
Granular attendance records for individual students across all enrolled courses. Supports manual corrections, leave marking, and exportable history.

### Integration of LMS
Seamless connection with external Learning Management Systems. Syncs course data, student rosters, and grades to eliminate duplicate data entry and keep records consistent.

### Quiz
In-platform quiz creation and delivery tied to sessions or topics. Supports multiple question types, auto-grading, and result analytics visible to both students and teachers.

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
- `auth` — Clerk integration
- `users` — User management
- `attendance` — Smart attendance tracking & prediction
- `feedback` — 30-second feedback system
- `dashboard` — Student dashboard & teacher insight reports
- `quiz` — Quiz creation, delivery & analytics
- `resources` — Resource bridge for material sharing
- `doubts` — Doubt clarification & Q&A
- `portfolio` — Teacher portfolio
- `lms` — LMS integration layer