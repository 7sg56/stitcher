import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    withCredentials: true,
});

/**
 * Sync the currently signed-in Clerk user to the Supabase database.
 * Call this after every successful sign-in or sign-up.
 */
export async function syncUser(token: string, data?: { real_name?: string; real_email?: string; real_phone?: string }) {
    return api.post("/auth/sync", data ?? {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Get current user profile from the backend.
 */
export async function getMe(token: string) {
    return api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Complete onboarding -- submit real name + phone, receive alias.
 */
export async function onboardUser(token: string, data: { real_name: string; real_phone: string }) {
    return api.post("/auth/onboard", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Get a user's visibility-filtered profile.
 */
export async function getUserProfile(token: string, userId: string) {
    return api.get(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Admin: update a user's role.
 */
export async function updateUserRole(token: string, userId: string, role: string) {
    return api.patch(`/users/${userId}/role`, { role }, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Admin: toggle shadow ban on a user.
 */
export async function toggleShadowBan(token: string, userId: string, isBanned: boolean) {
    return api.patch(`/users/${userId}/shadow-ban`, { is_shadow_banned: isBanned }, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export default api;
