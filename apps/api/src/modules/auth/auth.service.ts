import { SupabaseClient } from "@supabase/supabase-js";
import { User, UserWithRole } from "../../types/database";
import { SyncUserInput } from "./auth.schema";

export class AuthService {
    constructor(private supabase: SupabaseClient) { }

    async upsertUser(
        clerkId: string,
        data: SyncUserInput
    ): Promise<User> {
        // Check if user already exists
        const { data: existing } = await this.supabase
            .from("users")
            .select("*")
            .eq("clerk_id", clerkId)
            .single();

        if (existing) {
            // Update existing user
            const { data: updated, error } = await this.supabase
                .from("users")
                .update({
                    real_name: data.real_name ?? existing.real_name,
                    real_email: data.real_email ?? existing.real_email,
                    real_phone: data.real_phone ?? existing.real_phone,
                })
                .eq("clerk_id", clerkId)
                .select("*")
                .single();

            if (error) throw error;
            return updated as User;
        }

        // Get default "student" role
        const { data: role, error: roleError } = await this.supabase
            .from("roles")
            .select("id")
            .eq("name", "student")
            .single();

        if (roleError || !role) {
            throw new Error("Default role 'student' not found. Run the migration first.");
        }

        // Create new user
        const { data: created, error } = await this.supabase
            .from("users")
            .insert({
                clerk_id: clerkId,
                role_id: role.id,
                real_name: data.real_name ?? null,
                real_email: data.real_email ?? null,
                real_phone: data.real_phone ?? null,
            })
            .select("*")
            .single();

        if (error) throw error;
        return created as User;
    }

    async getUserByClerkId(clerkId: string): Promise<UserWithRole | null> {
        const { data, error } = await this.supabase
            .from("users")
            .select("*, role:roles(*)")
            .eq("clerk_id", clerkId)
            .single();

        if (error && error.code === "PGRST116") {
            // No rows returned
            return null;
        }
        if (error) throw error;

        return data as unknown as UserWithRole;
    }
}
