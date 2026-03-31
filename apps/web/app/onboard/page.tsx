"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { onboardUser } from "../../lib/api";

type Step = "details" | "complete";

interface OnboardResult {
    alias: {
        display_name: string;
    };
}

export default function OnboardPage() {
    const { getToken, isSignedIn } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>("details");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [aliasName, setAliasName] = useState("");

    if (!isSignedIn) {
        router.push("/sign-in");
        return null;
    }

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        setError("");

        const realName = formData.get("realName") as string;
        const realPhone = formData.get("realPhone") as string;

        try {
            const token = await getToken();
            if (!token) {
                setError("Authentication failed. Please sign in again.");
                setLoading(false);
                return;
            }

            const response = await onboardUser(token, {
                real_name: realName,
                real_phone: realPhone,
            });

            const result = response.data as OnboardResult;
            setAliasName(result.alias.display_name);
            setStep("complete");
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { error?: string } } };
            setError(axiosError.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // Complete step -- show assigned alias
    if (step === "complete") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
                <div className="w-full max-w-md">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg
                                className="w-8 h-8 text-emerald-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 12.75l6 6 9-13.5"
                                />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                            You&apos;re all set
                        </h1>
                        <p className="text-zinc-400 text-sm mb-8">
                            Your anonymous identity has been assigned
                        </p>

                        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 mb-8">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                                Your alias
                            </p>
                            <p className="text-2xl font-bold text-indigo-400 tracking-tight">
                                {aliasName}
                            </p>
                            <p className="text-xs text-zinc-500 mt-2">
                                This is how others will see you. Your real identity is private.
                            </p>
                        </div>

                        <button
                            onClick={() => router.push("/dashboard")}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Details form
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
            <div className="w-full max-w-md">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Complete your profile
                        </h1>
                        <p className="text-zinc-400 mt-2 text-sm">
                            We need a few more details to get you started
                        </p>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mb-6">
                        <p className="text-xs text-indigo-300">
                            Your real name and phone number are kept private. You will be assigned a random anonymous alias that others will see.
                        </p>
                    </div>

                    <form action={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="realName"
                                className="block text-sm font-medium text-zinc-300 mb-1.5"
                            >
                                Full name
                            </label>
                            <input
                                id="realName"
                                name="realName"
                                type="text"
                                required
                                minLength={1}
                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Your full name"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="realPhone"
                                className="block text-sm font-medium text-zinc-300 mb-1.5"
                            >
                                Phone number
                            </label>
                            <input
                                id="realPhone"
                                name="realPhone"
                                type="tel"
                                required
                                minLength={10}
                                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="+91 9876543210"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                        >
                            {loading ? "Setting up..." : "Continue"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
