"use client";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function SignUpPage() {
    const { signUp, errors, fetchStatus } = useSignUp();
    const { isLoaded, isSignedIn } = useAuth();
    const router = useRouter();
    const [passwordError, setPasswordError] = useState("");

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.push("/dashboard");
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || isSignedIn) {
        return null;
    }

    const handleGoogleSignUp = async () => {
        if (!signUp) return;

        await signUp.sso({
            strategy: "oauth_google",
            redirectCallbackUrl: "/sign-up/sso-callback",
            redirectUrl: "/dashboard",
        });
    };

    const handleSubmit = async (formData: FormData) => {
        setPasswordError("");

        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const emailAddress = formData.get("email") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            setPasswordError("Passwords do not match");
            return;
        }

        const { error } = await signUp.password({
            firstName,
            lastName,
            emailAddress,
            password,
        });

        if (error) {
            console.error(JSON.stringify(error, null, 2));
            return;
        }

        if (!error) await signUp.verifications.sendEmailCode();
    };

    const handleVerify = async (formData: FormData) => {
        const code = formData.get("code") as string;

        await signUp.verifications.verifyEmailCode({ code });

        if (signUp.status === "complete") {
            await signUp.finalize({
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

    if (signUp?.status === "complete") {
        return null;
    }

    // Verification step
    if (
        signUp.status === "missing_requirements" &&
        signUp.unverifiedFields.includes("email_address") &&
        signUp.missingFields.length === 0
    ) {
        return (
            <div className="min-h-screen flex w-full bg-background">
                <div className="hidden lg:flex relative w-1/2 justify-center items-center overflow-hidden">
                    <Image src="/auth-bg.png" alt="Verification background" fill priority className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background" />
                    <div className="relative z-10 p-12 w-full max-w-xl left-0 absolute bottom-32">
                        <h1 className="text-5xl font-serif text-white tracking-tight mb-4 drop-shadow-lg">
                            Secure your access.
                        </h1>
                        <p className="text-xl text-zinc-300 font-light tracking-wide max-w-md drop-shadow-md">
                            Check your inbox for the verification code.
                        </p>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 flex items-center justify-center px-4 relative">
                    <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none"></div>

                    <div className="w-full max-w-md z-10 relative">
                        <div className="bg-card rounded-[1.5rem] p-10 shadow-[0_32px_64px_-8px_rgba(218,226,253,0.06)] relative overflow-hidden">

                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-serif text-foreground tracking-tight mb-2">
                                    Verify Email
                                </h2>
                                <p className="text-muted-foreground mt-2 text-sm font-light tracking-wide">
                                    Enter the code sent to your email
                                </p>
                            </div>

                            <form action={handleVerify} className="space-y-6">
                                <div>
                                    <label
                                        htmlFor="code"
                                        className="block text-sm font-medium text-zinc-300 mb-2"
                                    >
                                        Verification Code
                                    </label>
                                    <input
                                        id="code"
                                        name="code"
                                        type="text"
                                        required
                                        className="w-full px-4 py-4 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all font-light tracking-widest text-center text-2xl"
                                        placeholder="000000"
                                    />
                                    {errors?.fields?.code && (
                                        <p className="mt-2 text-sm text-red-400 text-center">
                                            {errors.fields.code.message}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={fetchStatus === "fetching"}
                                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {fetchStatus === "fetching" ? "Verifying..." : "Verify"}
                                </button>
                            </form>

                            <div className="mt-6 text-center border-t border-white/5 pt-6">
                                <button
                                    onClick={() => signUp.verifications.sendEmailCode()}
                                    className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                >
                                    Resend code
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Sign-up form
    return (
        <div className="min-h-screen flex w-full bg-[#0d0d0d]">
            {/* Left Side: Premium Image Cover */}
            <div className="hidden lg:flex relative w-1/2 justify-center items-center overflow-hidden">
                <Image
                    src="/auth-bg.png"
                    alt="Stitcher Platform Aesthetics"
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0d0d0d]/40 to-[#0d0d0d]" />
                <div className="relative z-10 p-12 w-full max-w-xl left-0 absolute bottom-32">
                    <h1 className="text-5xl font-medium text-white tracking-tight mb-4 drop-shadow-lg">
                        Join the platform.
                    </h1>
                    <p className="text-xl text-zinc-300 font-light tracking-wide max-w-md drop-shadow-md">
                        Get started with the next evolution of academic management.
                    </p>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-4 relative py-12">
                {/* Subtle ambient light behind form */}
                <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="w-full max-w-md z-10 relative">
                    <div className="bg-card rounded-[1.5rem] p-10 shadow-[0_32px_64px_-8px_rgba(218,226,253,0.06)] relative overflow-hidden">

                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-serif text-foreground tracking-tight mb-2">
                                Create Account
                            </h2>
                            <p className="text-muted-foreground mt-2 text-sm font-light tracking-wide">
                                Get started with Stitcher
                            </p>
                        </div>

                        {/* Google sign-up */}
                        <button
                            onClick={handleGoogleSignUp}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-muted hover:bg-accent border-none rounded-xl text-foreground font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 mb-8 backdrop-blur-md"
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

                        <form action={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        htmlFor="firstName"
                                        className="block text-sm font-medium text-zinc-300 mb-1.5"
                                    >
                                        First name
                                    </label>
                                    <input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all font-light"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="lastName"
                                        className="block text-sm font-medium text-zinc-300 mb-1.5"
                                    >
                                        Last name
                                    </label>
                                    <input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all font-light"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-zinc-300 mb-1.5"
                                >
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all font-light"
                                    placeholder="you@example.com"
                                />
                                {errors?.fields?.emailAddress && (
                                    <p className="mt-1.5 text-sm text-red-400">
                                        {errors.fields.emailAddress.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-zinc-300 mb-1.5"
                                >
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all font-light"
                                    placeholder="Create a password"
                                />
                                {errors?.fields?.password && (
                                    <p className="mt-1.5 text-sm text-red-400">
                                        {errors.fields.password.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-zinc-300 mb-1.5"
                                >
                                    Confirm password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all font-light"
                                    placeholder="Re-enter password"
                                />
                                {passwordError && (
                                    <p className="mt-1.5 text-sm text-red-400">
                                        {passwordError}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={fetchStatus === "fetching"}
                                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-6"
                            >
                                {fetchStatus === "fetching" ? "Creating account..." : "Create account"}
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
                                Already have an account?{" "}
                                <Link
                                    href="/sign-in"
                                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </div>

                        {/* Required for Clerk bot protection */}
                        <div id="clerk-captcha" />
                    </div>
                </div>
            </div>
        </div>
    );
}
