"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { syncUser, getMe } from "../lib/api";

interface AuthGateProps {
    children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function verifyUser() {
            if (!isLoaded) return;

            if (!isSignedIn) {
                if (mounted) router.push("/sign-in");
                return;
            }

            try {
                const token = await getToken();
                if (!token) throw new Error("No token available");

                // 1. Always sync the user to ensure Supabase record exists (idempotent)
                await syncUser(token);

                // 2. Fetch the user's current status from our backend
                const response = await getMe(token);
                const user = response.data.user;

                if (!mounted) return;

                // 3. Check onboarding status
                if (user.onboarding_status === "pending" && pathname !== "/onboard") {
                    router.push("/onboard");
                } else {
                    setIsVerified(true);
                }
            } catch (err) {
                console.error("Auth verification failed:", err);
                if (mounted) setError("Failed to verify authentication status.");
            }
        }

        verifyUser();

        return () => {
            mounted = false;
        };
    }, [isLoaded, isSignedIn, getToken, pathname, router]);

    // Show nothing while Clerk loads, or while we're waiting for our backend verification
    if (!isLoaded || (!isVerified && !error)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg max-w-md text-center">
                    <p className="font-medium mb-2">Authentication Error</p>
                    <p className="text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-md transition-colors text-sm"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Verified and onboarded
    return <>{children}</>;
}
