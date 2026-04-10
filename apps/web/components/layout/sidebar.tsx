"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
    MessageSquare,
    BookOpen,
    Settings,
    LayoutDashboard,
    LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Courses", href: "/dashboard/courses", icon: BookOpen },
    { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useClerk();

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col bg-muted sm:flex border-r border-border">
                <div className="flex h-20 items-center px-6 border-b border-transparent">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        {/* Using a sleek, abstract SVG for logo */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            className="h-6 w-6 text-primary"
                        >
                            <path d="M12 2L2 22h20L12 2z" />
                        </svg>
                        <span className="text-xl tracking-tight font-serif text-primary">Stitcher</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2">
                    {sidebarLinks.map((link) => {
                        const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors hover:text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isActive
                                        ? "bg-secondary text-secondary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-border">
                    <button
                        onClick={() => signOut(() => router.push("/sign-in"))}
                        className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium transition-colors hover:text-destructive text-muted-foreground hover:bg-destructive/10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden border-t border-border bg-background pb-safe items-center justify-around px-2 py-2">
                {sidebarLinks.map((link) => {
                    const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 text-[10px] font-medium transition-colors rounded-lg",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
