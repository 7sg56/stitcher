import { currentUser, auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

async function fetchMe(token: string) {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        const res = await fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) return await res.json();
    } catch (error) {
        console.error("Failed to fetch user:", error);
    }
    return null;
}

export async function Topbar() {
    const user = await currentUser();
    if (!user) return null;

    const { getToken } = await auth();
    const token = await getToken();

    let roleName = "student";
    let displayName = user.firstName || user.username || "User";

    if (token) {
        const dbUser = await fetchMe(token);
        if (dbUser) {
            if (dbUser.role) roleName = dbUser.role;
            if (dbUser.real_name) displayName = dbUser.real_name;
        }
    }

    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/5 bg-background/80 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center justify-between gap-x-4 lg:gap-x-6">

                {/* Left Side: Title or empty space to replace mobile menu gap */}
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground hidden sm:block">Workspace</span>
                </div>

                {/* Right Side: Role & Actions */}
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {/* Action Buttons based on Role */}
                    {roleName === "teacher" && (
                        <Link
                            href="/dashboard/courses/new"
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors rounded-md"
                        >
                            <Plus className="h-3 w-3" />
                            Create Course
                        </Link>
                    )}
                    {roleName === "admin" && (
                        <Link
                            href="/dashboard/admin/courses"
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors rounded-md"
                        >
                            <Plus className="h-3 w-3" />
                            Manage System
                        </Link>
                    )}

                    {/* Role Badge */}
                    <div className="hidden sm:block">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-white/10 uppercase tracking-widest">
                            {roleName}
                        </span>
                    </div>

                    {/* Separator */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-white/10" aria-hidden="true" />

                    {/* User Info */}
                    <div className="flex items-center gap-x-3 text-sm font-semibold leading-6 text-foreground">
                        <span className="sr-only">Your profile</span>
                        <div className="flex flex-col items-end">
                            <span aria-hidden="true" className="text-sm">{displayName}</span>
                        </div>
                        {user.imageUrl ? (
                            <Image
                                src={user.imageUrl}
                                alt="Profile"
                                width={32}
                                height={32}
                                unoptimized
                                className="h-8 w-8 rounded-full bg-muted object-cover"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                {displayName.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
