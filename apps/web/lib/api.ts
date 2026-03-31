import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    withCredentials: true,
});

/**
 * Sync the currently signed-in Clerk user to the Supabase database.
 * Call this after every successful sign-in or sign-up.
 */
export async function syncUser(token: string, data?: { real_name?: string; real_email?: string }) {
    return api.post("/auth/sync", data ?? {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export default api;
