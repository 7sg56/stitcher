import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envPaths = [
    path.resolve(process.cwd(), "../../.env"), // Standard monorepo root
    path.resolve(__dirname, "../../../.env"),  // Fallback via __dirname
    path.resolve(process.cwd(), ".env"),       // Fallback local API
];

for (const p of envPaths) {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        break;
    }
}

// Alias for @clerk/fastify which expects CLERK_PUBLISHABLE_KEY
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import supabasePlugin from "./core/plugins/supabase";
import redisPlugin from "./core/plugins/redis";
import { clerkPlugin } from "@clerk/fastify";
import authRoutes from "./modules/auth/auth.route";
import usersRoutes from "./modules/users/users.route";
import coursesRoutes from "./modules/courses/courses.route";
import enrollmentRoutes from "./modules/enrollment/enrollment.route";
import sessionsRoutes from "./modules/sessions/sessions.route";
import attendanceRoutes from "./modules/attendance/attendance.route";
import resourcesRoutes from "./modules/resources/resources.route";
import quizzesRoutes from "./modules/quizzes/quizzes.route";
import doubtsRoutes from "./modules/doubts/doubts.route";
import feedbackRoutes from "./modules/feedback/feedback.route";
import violationsRoutes from "./modules/violations/violations.route";
import reportsRoutes from "./modules/reports/reports.route";
import dashboardRoutes from "./modules/dashboard/dashboard.route";
import { startAggregationWorker } from "./core/queue/aggregation.worker";

const app = Fastify({ logger: true });

// --- Plugins ---
app.register(cors, {
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.register(clerkPlugin);
app.register(supabasePlugin);
app.register(redisPlugin);

// --- Routes ---
app.register(authRoutes, { prefix: "/auth" });
app.register(usersRoutes, { prefix: "/users" });
app.register(coursesRoutes, { prefix: "/courses" });
app.register(enrollmentRoutes, { prefix: "/enrollment" });
app.register(sessionsRoutes, { prefix: "/sessions" });
app.register(attendanceRoutes, { prefix: "/attendance" });
app.register(resourcesRoutes, { prefix: "/resources" });
app.register(quizzesRoutes, { prefix: "/quizzes" });
app.register(doubtsRoutes, { prefix: "/doubts" });
app.register(feedbackRoutes, { prefix: "/feedback" });
app.register(violationsRoutes, { prefix: "/violations" });
app.register(reportsRoutes, { prefix: "/reports" });
app.register(dashboardRoutes, { prefix: "/dashboard" });

// --- Health check ---
app.get("/health", async () => ({ status: "ok" }));

// --- Start background workers ---
startAggregationWorker();

export default app;
