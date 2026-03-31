import { SupabaseClient } from "@supabase/supabase-js";
import { RoleName, UserWithRole, UserProfile } from "../../types/database";

export class UsersService {
    constructor(private supabase: SupabaseClient) { }

    async getUserById(userId: string): Promise<UserWithRole | null> {
        const { data, error } = await this.supabase
            .from("users")
            .select("*, role:roles(*)")
            .eq("id", userId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;

        // Fetch active alias
        const { data: alias } = await this.supabase
            .from("aliases")
            .select("*")
            .eq("user_id", data.id)
            .eq("is_active", true)
            .single();

        return { ...data, alias: alias ?? null } as unknown as UserWithRole;
    }

    /**
     * Build a visibility-filtered profile based on who is requesting it.
     *
     * Rules:
     *   - Student real_name + real_phone: only admin can see
     *   - Admin real_phone: only other admins can see
     *   - is_shadow_banned: only admin can see
     *   - Teacher real_name + real_phone: everyone can see
     *   - Alias: everyone can see
     */
    buildProfile(target: UserWithRole, requesterRole: RoleName): UserProfile {
        const targetRole = target.role.name;
        const isAdmin = requesterRole === "admin";

        const profile: UserProfile = {
            id: target.id,
            display_name: target.alias?.display_name ?? target.real_name ?? "Unknown",
            avatar_url: target.alias?.avatar_url ?? null,
            role: targetRole,
            onboarding_status: target.onboarding_status,
            created_at: target.created_at,
        };

        // Real name visibility
        if (targetRole === "student") {
            // Student real_name: admin only
            if (isAdmin) {
                profile.real_name = target.real_name;
                profile.real_phone = target.real_phone;
            }
        } else if (targetRole === "teacher") {
            // Teacher: everyone sees real name and phone
            profile.real_name = target.real_name;
            profile.real_phone = target.real_phone;
            profile.display_name = target.real_name ?? "Unknown";
        } else if (targetRole === "admin") {
            // Admin real_name: everyone sees
            profile.real_name = target.real_name;
            profile.display_name = target.real_name ?? "Unknown";
            // Admin phone: only other admins see
            if (isAdmin) {
                profile.real_phone = target.real_phone;
            }
        }

        // Email: same rules as name for each role
        if (targetRole === "student") {
            if (isAdmin) profile.real_email = target.real_email;
        } else {
            profile.real_email = target.real_email;
        }

        // Shadow ban: admin only
        if (isAdmin) {
            profile.is_shadow_banned = target.is_shadow_banned;
        }

        return profile;
    }

    async updateRole(userId: string, newRole: RoleName): Promise<void> {
        // Get the role ID for the new role
        const { data: role, error: roleError } = await this.supabase
            .from("roles")
            .select("id")
            .eq("name", newRole)
            .single();

        if (roleError || !role) {
            throw new Error(`Role '${newRole}' not found`);
        }

        const { error } = await this.supabase
            .from("users")
            .update({ role_id: role.id })
            .eq("id", userId);

        if (error) throw error;
    }

    async toggleShadowBan(userId: string, isBanned: boolean): Promise<void> {
        const { error } = await this.supabase
            .from("users")
            .update({ is_shadow_banned: isBanned })
            .eq("id", userId);

        if (error) throw error;
    }
}
