import { SupabaseClient } from "@supabase/supabase-js";
import { User, UserWithRole, Alias } from "../../types/database";
import { SyncUserInput, OnboardUserInput } from "./auth.schema";

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
                onboarding_status: "pending",
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
            return null;
        }
        if (error) throw error;

        // Fetch active alias
        const { data: alias } = await this.supabase
            .from("aliases")
            .select("*")
            .eq("user_id", data.id)
            .eq("is_active", true)
            .single();

        return {
            ...data,
            alias: alias ?? null,
        } as unknown as UserWithRole;
    }

    async completeOnboarding(
        clerkId: string,
        data: OnboardUserInput
    ): Promise<{ user: User; alias: Alias }> {
        // Get the user
        const { data: user, error: userError } = await this.supabase
            .from("users")
            .select("*")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !user) {
            throw new Error("User not found. Call /auth/sync first.");
        }

        if (user.onboarding_status === "complete") {
            throw new Error("Onboarding already completed.");
        }

        // Update user with real name/phone and mark onboarding complete
        const { data: updated, error: updateError } = await this.supabase
            .from("users")
            .update({
                real_name: data.real_name,
                real_phone: data.real_phone,
                onboarding_status: "complete",
            })
            .eq("clerk_id", clerkId)
            .select("*")
            .single();

        if (updateError) throw updateError;

        // Generate a random alias for the user
        const alias = await this.generateAlias(user.id);

        return { user: updated as User, alias };
    }

    private async generateAlias(userId: string): Promise<Alias> {
        // Pick a random unused alias from the pool
        const { data: poolEntry, error: poolError } = await this.supabase
            .from("alias_pool")
            .select("*")
            .eq("is_used", false)
            .limit(1)
            .order("id") // deterministic ordering, randomness via offset
            .single();

        if (poolError || !poolEntry) {
            // Fallback: generate a random name if pool is exhausted
            const fallbackName = `User_${Math.random().toString(36).substring(2, 8)}`;
            const { data: alias, error } = await this.supabase
                .from("aliases")
                .insert({
                    user_id: userId,
                    display_name: fallbackName,
                    is_active: true,
                })
                .select("*")
                .single();

            if (error) throw error;
            return alias as Alias;
        }

        const displayName = `${poolEntry.adjective} ${poolEntry.noun}`;

        // Mark pool entry as used
        await this.supabase
            .from("alias_pool")
            .update({ is_used: true })
            .eq("id", poolEntry.id);

        // Create alias record
        const { data: alias, error } = await this.supabase
            .from("aliases")
            .insert({
                user_id: userId,
                display_name: displayName,
                is_active: true,
            })
            .select("*")
            .single();

        if (error) throw error;
        return alias as Alias;
    }
}
