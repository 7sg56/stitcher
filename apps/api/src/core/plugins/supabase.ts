import fp from "fastify-plugin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { FastifyInstance } from "fastify";

declare module "fastify" {
    interface FastifyInstance {
        supabase: SupabaseClient;
    }
}

export default fp(
    async (fastify: FastifyInstance) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        fastify.decorate("supabase", supabase);
        fastify.log.info("Supabase client registered");
    },
    { name: "supabase" }
);
