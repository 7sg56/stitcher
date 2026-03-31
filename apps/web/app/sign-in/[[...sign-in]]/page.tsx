"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
    const { signIn, errors, fetchStatus } = useSignIn();
    const router = useRouter();

    const handleSubmit = async (formData: FormData) => {
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
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
            <div className="w-full max-w-md">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-zinc-400 mt-2 text-sm">
                            Sign in to your Stitcher account
                        </p>
                    </div>

                    <form action={handleSubmit} className="space-y-5">
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
                            {errors?.fields?.identifier && (
                                <p className="mt-1.5 text-sm text-red-400">
                                    {errors.fields.identifier.message}
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
                                placeholder="Enter your password"
                            />
                            {errors?.fields?.password && (
                                <p className="mt-1.5 text-sm text-red-400">
                                    {errors.fields.password.message}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={fetchStatus === "fetching"}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                        >
                            {fetchStatus === "fetching" ? "Signing in..." : "Sign in"}
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
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/sign-up"
                                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
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
