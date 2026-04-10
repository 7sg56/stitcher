"use client";

import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
        <div className="min-h-screen flex w-full bg-background">
            {/* Left Side: Premium Image Cover */}
            <div className="hidden lg:flex relative w-1/2 justify-center items-center overflow-hidden">
                <Image
                    src="/auth-bg.png"
                    alt="Stitcher Platform Aesthetics"
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background" />
                <div className="relative z-10 p-12 w-full max-w-xl left-0 absolute bottom-32">
                    <h1 className="text-5xl font-serif text-white tracking-tight mb-4 drop-shadow-lg">
                        Welcome back.
                    </h1>
                    <p className="text-xl text-zinc-300 font-light tracking-wide max-w-md drop-shadow-md">
                        Log in to resume your management systems in Stitcher.
                    </p>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-4 relative">
                {/* Subtle ambient light behind form */}
                <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="w-full max-w-md z-10 relative">
                    <div className="bg-card rounded-[1.5rem] p-10 shadow-[0_32px_64px_-8px_rgba(218,226,253,0.06)] relative overflow-hidden">
                        {/* No upper glow line per No-Line rule */}

                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-serif text-foreground tracking-tight mb-2">Sign in</h2>
                            <p className="text-muted-foreground text-sm font-light">
                                Enter your credentials to access your workspace.
                            </p>
                        </div>

                        {/* Google sign-in */}
                        <button
                            onClick={handleGoogleSignIn}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-8 backdrop-blur-md"
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

                        <div className="relative mb-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-transparent backdrop-blur-xl text-zinc-500 uppercase text-[10px] tracking-widest font-semibold">
                                    or
                                </span>
                            </div>
                        </div>

                        <form action={handleSubmit} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-zinc-300 mb-2"
                                >
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all font-light"
                                    placeholder="you@example.com"
                                />
                                {errors?.fields?.identifier && (
                                    <p className="mt-2 text-sm text-red-400">
                                        {errors.fields.identifier.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-zinc-300 mb-2"
                                >
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all font-light"
                                    placeholder="Enter your password"
                                />
                                {errors?.fields?.password && (
                                    <p className="mt-2 text-sm text-red-400">
                                        {errors.fields.password.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={fetchStatus === "fetching"}
                                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-4"
                            >
                                {fetchStatus === "fetching" ? "Signing in..." : "Sign in"}
                            </button>
                        </form>

                        {errors && !errors.fields && (
                            <div className="mt-6 p-4 bg-red-950/30 border border-red-900/30 rounded-xl text-red-400 text-sm font-medium">
                                <p>
                                    {errors.global?.[0]?.message || "Something went wrong. Try again."}
                                </p>
                            </div>
                        )}

                        <div className="mt-8 text-center border-t border-white/5 pt-6">
                            <p className="text-sm text-zinc-500">
                                Don&apos;t have an account?{" "}
                                <Link
                                    href="/sign-up"
                                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                >
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
