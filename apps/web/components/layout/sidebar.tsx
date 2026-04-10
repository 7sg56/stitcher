"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    MessageSquare,
    BookOpen,
    Settings,
    LayoutDashboard
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

    return (
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-border bg-background sm:flex">
            <div className="flex h-14 items-center border-b border-border px-6">
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
                    <span className="text-lg tracking-tight">Stitcher</span>
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
                                "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
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

            <div className="p-4 border-t border-border">
                {/* Minimal User Profile placeholder or UserButton for Clerk will go here */}
            </div>
        </aside>
    );
}
