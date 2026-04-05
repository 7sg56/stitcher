"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { syncUser, getMe } from "../lib/api";

interface AuthGateProps {
    children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
    const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
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
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
                {/* Subtle background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl max-w-md w-full text-center relative z-10">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-bold text-white tracking-tight mb-2">Authentication Failed</h2>
                    <p className="text-sm text-zinc-400 mb-8">{error}</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => signOut({ redirectUrl: '/sign-in' })}
                            className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-900 border border-zinc-700 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                            Sign Out & Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-2.5 px-4 text-zinc-400 hover:text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Verified and onboarded
    return <>{children}</>;
}
