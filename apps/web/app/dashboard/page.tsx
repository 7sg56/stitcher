import { currentUser, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SignOutButton from "./sign-out-button";

async function syncUserToDb(token: string, userData: { real_name?: string; real_email?: string }) {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        await fetch(`${apiUrl}/auth/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
        });
    } catch (error) {
        console.error("Failed to sync user to DB:", error);
    }
}

export default async function DashboardPage() {
    const user = await currentUser();

    if (!user) {
        redirect("/sign-in");
    }

    // Sync user to Supabase on every dashboard load
    const { getToken } = await auth();
    const token = await getToken();
    if (token) {
        await syncUserToDb(token, {
            real_name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
            real_email: user.emailAddresses[0]?.emailAddress || undefined,
        });
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-white tracking-tight">
                        Stitcher
                    </h1>
                    <SignOutButton />
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-12">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">
                        Your Profile
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            {user.imageUrl && (
                                <img
                                    src={user.imageUrl}
                                    alt="Avatar"
                                    className="w-16 h-16 rounded-full border-2 border-zinc-700"
                                />
                            )}
                            <div>
                                <p className="text-white font-medium text-lg">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-zinc-400 text-sm">
                                    {user.emailAddresses[0]?.emailAddress}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                        Clerk ID
                                    </dt>
                                    <dd className="mt-1 text-sm text-zinc-300 font-mono">
                                        {user.id}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                        Joined
                                    </dt>
                                    <dd className="mt-1 text-sm text-zinc-300">
                                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
