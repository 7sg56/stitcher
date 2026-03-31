import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Get the current user's auth state on the server.
 * Use in Server Components and Route Handlers.
 */
export async function getServerAuth() {
    return await auth();
}

/**
 * Get the full current user object on the server.
 * Returns null if not authenticated.
 */
export async function getServerUser() {
    return await currentUser();
}

/**
 * Get the auth token for making API calls to the backend.
 * Use in Server Components, Route Handlers, or Server Actions.
 */
export async function getAuthToken(): Promise<string | null> {
    const { getToken } = await auth();
    return await getToken();
}
