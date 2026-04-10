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
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="bg-card border border-border p-8 shadow-sm max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-medium text-card-foreground tracking-tight mb-2">Authentication Failed</h2>
                    <p className="text-sm text-muted-foreground mb-8">{error}</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => signOut({ redirectUrl: '/sign-in' })}
                            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background border-none flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                            Sign Out & Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-2.5 px-4 text-muted-foreground hover:text-foreground font-medium transition-colors text-sm"
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
