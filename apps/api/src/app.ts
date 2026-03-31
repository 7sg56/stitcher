import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import supabasePlugin from "./core/plugins/supabase";
import { clerkPlugin } from "@clerk/fastify";
import authRoutes from "./modules/auth/auth.route";

const app = Fastify({ logger: true });

// --- Plugins ---
app.register(cors, {
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true,
});

app.register(clerkPlugin);
app.register(supabasePlugin);

// --- Routes ---
app.register(authRoutes, { prefix: "/auth" });

// --- Health check ---
app.get("/health", async () => ({ status: "ok" }));

export default app;
