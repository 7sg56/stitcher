"use client";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function SignUpPage() {
    const { signUp, errors, fetchStatus } = useSignUp();
    const { isSignedIn } = useAuth();
    const router = useRouter();
    const [passwordError, setPasswordError] = useState("");

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

    if (signUp.status === "complete" || isSignedIn) {
        return null;
    }

    // Verification step
    if (
        signUp.status === "missing_requirements" &&
        signUp.unverifiedFields.includes("email_address") &&
        signUp.missingFields.length === 0
    ) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
                <div className="w-full max-w-md">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-white tracking-tight">
                                Verify your email
                            </h1>
                            <p className="text-zinc-400 mt-2 text-sm">
                                We sent a verification code to your email
                            </p>
                        </div>

                        <form action={handleVerify} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="code"
                                    className="block text-sm font-medium text-zinc-300 mb-1.5"
                                >
                                    Verification code
                                </label>
                                <input
                                    id="code"
                                    name="code"
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center text-lg tracking-widest"
                                    placeholder="Enter code"
                                />
                                {errors?.fields?.code && (
                                    <p className="mt-1.5 text-sm text-red-400">
                                        {errors.fields.code.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={fetchStatus === "fetching"}
                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                            >
                                {fetchStatus === "fetching" ? "Verifying..." : "Verify"}
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <button
                                onClick={() => signUp.verifications.sendEmailCode()}
                                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Resend code
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Sign-up form
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Create your account
                        </h1>
                        <p className="text-zinc-400 mt-2 text-sm">
                            Get started with Stitcher
                        </p>
                    </div>

                    {/* Google sign-up */}
                    <button
                        onClick={handleGoogleSignUp}
                        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 mb-6"
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
                            <div className="w-full border-t border-zinc-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-zinc-900 text-zinc-500">or</span>
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
                                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Re-enter your password"
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
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                        >
                            {fetchStatus === "fetching" ? "Creating account..." : "Create account"}
                        </button>
                    </form>

                    {errors && !errors.fields && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm text-red-400">
                                {errors.global?.[0]?.message || "Something went wrong. Try again."}
                            </p>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-zinc-400">
                            Already have an account?{" "}
                            <Link
                                href="/sign-in"
                                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
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
    );
}
