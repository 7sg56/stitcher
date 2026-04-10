"use client";

import Image from "next/image";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { onboardUser } from "../../lib/api";
import AuthGate from "../../components/AuthGate";

type Step = "details" | "complete";

interface OnboardResult {
    alias: {
        display_name: string;
    };
}

export default function OnboardPage() {
    const { getToken } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>("details");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [aliasName, setAliasName] = useState("");

    // Auth state is checked safely inside the AuthGate component

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
            <AuthGate>
                <div className="min-h-screen flex w-full bg-[#0d0d0d]">
                    <div className="hidden lg:flex relative w-1/2 justify-center items-center overflow-hidden">
                        <Image src="/auth-bg.png" alt="Onboarding Auth" fill priority className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0d0d0d]/40 to-[#0d0d0d]" />
                        <div className="relative z-10 p-12 w-full max-w-xl left-0 absolute bottom-32">
                            <h1 className="text-5xl font-medium text-foreground tracking-tight mb-4 drop-shadow-lg">
                                Ready to deploy.
                            </h1>
                            <p className="text-xl text-foreground font-light tracking-wide max-w-md drop-shadow-md">
                                Your anonymous management identity is initialized.
                            </p>
                        </div>
                    </div>

                    <div className="w-full lg:w-1/2 flex items-center justify-center px-4 relative">
                        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-success/20 blur-[120px] rounded-full pointer-events-none"></div>

                        <div className="w-full max-w-md z-10 relative">
                            <div className="bg-card rounded-[1.5rem] p-10 shadow-[0_32px_64px_-8px_rgba(218,226,253,0.06)] text-center relative overflow-hidden">


                                <div className="w-20 h-20 bg-success/20 border border-success/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative">
                                    <div className="absolute inset-0 rounded-full border border-success/30 animate-ping opacity-20"></div>
                                    <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>

                                <h1 className="text-3xl font-serif text-foreground tracking-tight mb-2">
                                    You&apos;re all set
                                </h1>
                                <p className="text-muted-foreground font-light text-sm mb-8">
                                    Your anonymous identity has been assigned
                                </p>

                                <div className="bg-muted rounded-xl p-6 mb-8 relative">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                                        Your Alias
                                    </p>
                                    <p className="text-3xl font-medium text-success tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                        {aliasName}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-4 leading-relaxed font-light">
                                        This is how others will see you. Your real identity is securely encrypted and isolated.
                                    </p>
                                </div>

                                <button
                                    onClick={() => router.push("/dashboard")}
                                    className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 rounded-xl text-primary-foreground font-medium tracking-wide shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    Proceed to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthGate>
        );
    }

    // Details form
    return (
        <AuthGate>
            <div className="min-h-screen flex w-full bg-background">
                <div className="hidden lg:flex relative w-1/2 justify-center items-center overflow-hidden">
                    <Image src="/auth-bg.png" alt="Onboarding Details" fill priority className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background" />
                    <div className="relative z-10 p-12 w-full max-w-xl left-0 absolute bottom-32">
                        <h1 className="text-5xl font-serif text-foreground tracking-tight mb-4 drop-shadow-lg">
                            Identity Core.
                        </h1>
                        <p className="text-xl text-foreground font-light tracking-wide max-w-md drop-shadow-md">
                            Provide your secure credentials to generate your encrypted alias.
                        </p>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 flex items-center justify-center px-4 relative">
                    <div className="absolute top-1/4 -right-20 w-96 h-96 bg-success/20 blur-[120px] rounded-full pointer-events-none"></div>

                    <div className="w-full max-w-md z-10 relative">
                        <div className="bg-background/80 backdrop-blur-2xl border border-border rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-success/30 to-transparent"></div>

                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                                    Secure Verification
                                </h1>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Final details required for your secure profile
                                </p>
                            </div>

                            <div className="bg-success/20 border border-success/30 rounded-xl p-4 mb-8">
                                <p className="text-xs text-success/90 font-light leading-relaxed">
                                    Your real name and phone number are encrypted. You will be assigned a random anonymous alias for public interactions.
                                </p>
                            </div>

                            <form action={handleSubmit} className="space-y-6">
                                <div>
                                    <label
                                        htmlFor="realName"
                                        className="block text-sm font-medium text-foreground mb-2"
                                    >
                                        Full Name
                                    </label>
                                    <input
                                        id="realName"
                                        name="realName"
                                        type="text"
                                        required
                                        minLength={1}
                                        className="w-full px-4 py-3 bg-background/80 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-success/30 focus:bg-background/80 transition-all font-light"
                                        placeholder="Your full name"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="realPhone"
                                        className="block text-sm font-medium text-foreground mb-2"
                                    >
                                        Phone Number
                                    </label>
                                    <input
                                        id="realPhone"
                                        name="realPhone"
                                        type="tel"
                                        required
                                        minLength={10}
                                        className="w-full px-4 py-3 bg-background/80 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-success/30 focus:bg-background/80 transition-all font-light"
                                        placeholder="+91 9876543210"
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-danger/20 border border-danger/50 rounded-xl text-danger text-sm font-medium">
                                        <p>{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 px-4 bg-success hover:bg-success disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-foreground font-medium tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all focus:outline-none focus:ring-2 focus:ring-success mt-4"
                                >
                                    {loading ? "Initializing..." : "Generate Alias"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}
