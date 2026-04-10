"use client";

import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function SignInPage() {
    const { signIn, errors, fetchStatus } = useSignIn();
    const { isLoaded, isSignedIn } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.push("/dashboard");
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || isSignedIn) {
        return null;
    }

    const handleGoogleSignIn = async () => {
        if (!signIn) return;

        await signIn.sso({
            strategy: "oauth_google",
            redirectCallbackUrl: "/sign-in/sso-callback",
            redirectUrl: "/dashboard",
        });
    };

    const handleSubmit = async (formData: FormData) => {
        if (!signIn) return;

        const emailAddress = formData.get("email") as string;
        const password = formData.get("password") as string;

        const { error } = await signIn.password({
            emailAddress,
            password,
        });

        if (error) {
            console.error(JSON.stringify(error, null, 2));
            return;
        }

        if (signIn.status === "complete") {
            await signIn.finalize({
                navigate: ({ session, decorateUrl }) => {
                    if (session?.currentTask) {
                        console.log(session?.currentTask);
                        return;
                    }

                    const url = decorateUrl("/dashboard");
                    if (url.startsWith("http")) {
                        window.location.href = url;
                    } else {
                        router.push(url);
                    }
                },
            });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                <div className="bg-card border border-border p-8 shadow-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-medium text-foreground tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Sign in to your Stitcher account
                        </p>
                    </div>

                    {/* Google sign-in */}
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring mb-6"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-card text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">or</span>
                        </div>
                    </div>

                    <form action={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full px-4 py-2.5 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                                placeholder="you@example.com"
                            />
                            {errors?.fields?.identifier && (
                                <p className="mt-1.5 text-sm text-destructive">
                                    {errors.fields.identifier.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full px-4 py-2.5 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                                placeholder="Enter your password"
                            />
                            {errors?.fields?.password && (
                                <p className="mt-1.5 text-sm text-destructive">
                                    {errors.fields.password.message}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={fetchStatus === "fetching"}
                            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            {fetchStatus === "fetching" ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    {errors && !errors.fields && (
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                            <p>
                                {errors.global?.[0]?.message || "Something went wrong. Try again."}
                            </p>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/sign-up"
                                className="text-primary hover:text-primary/80 font-medium transition-colors"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
