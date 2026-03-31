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

async function fetchMe(token: string) {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        const res = await fetch(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (error) {
        console.error("Failed to fetch user:", error);
    }
    return null;
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

        // Check onboarding status
        const meData = await fetchMe(token);
        if (meData?.user?.onboarding_status === "pending") {
            redirect("/onboard");
        }
    }

    // Get display info from backend
    let displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    let roleName = "student";
    let aliasName: string | null = null;

    if (token) {
        const meData = await fetchMe(token);
        if (meData?.user) {
            roleName = meData.user.role?.name || "student";
            if (meData.user.alias?.display_name) {
                aliasName = meData.user.alias.display_name;
            }
            // For students, show alias instead of real name
            if (roleName === "student" && aliasName) {
                displayName = aliasName;
            }
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-white tracking-tight">
                        Stitcher
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-800 px-2.5 py-1 rounded-full">
                            {roleName}
                        </span>
                        <SignOutButton />
                    </div>
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
                                    {displayName}
                                </p>
                                {aliasName && roleName === "student" && (
                                    <p className="text-indigo-400 text-sm">
                                        Alias: {aliasName}
                                    </p>
                                )}
                                <p className="text-zinc-400 text-sm">
                                    {user.emailAddresses[0]?.emailAddress}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                        Role
                                    </dt>
                                    <dd className="mt-1 text-sm text-zinc-300 capitalize">
                                        {roleName}
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
