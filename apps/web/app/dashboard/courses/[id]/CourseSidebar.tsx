"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    LayoutList,
    FileEdit,
    Users,
    CalendarDays,
    MessageCircle,
    Folder,
    Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CourseTab = "units" | "exams" | "students" | "sessions" | "doubts" | "resources" | "violations";

interface SidebarItem {
    id: CourseTab;
    label: string;
    icon: React.ElementType;
    adminOnly?: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
    { id: "units", label: "Units", icon: LayoutList },
    { id: "exams", label: "Exams", icon: FileEdit },
    { id: "students", label: "Students", icon: Users },
    { id: "sessions", label: "Sessions", icon: CalendarDays },
    { id: "doubts", label: "Doubts", icon: MessageCircle },
    { id: "resources", label: "Resources", icon: Folder },
    { id: "violations", label: "Violations", icon: Shield, adminOnly: true },
];

interface CourseSidebarProps {
    role: string;
    activeTab: CourseTab;
    onTabChange: (tab: CourseTab) => void;
}

export default function CourseSidebar({ role, activeTab, onTabChange }: CourseSidebarProps) {
    const visibleItems = SIDEBAR_ITEMS.filter((item) => {
        if (item.adminOnly && role !== "admin" && role !== "teacher") return false;
        return true;
    });

    return (
        <>
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col bg-muted sm:flex border-r border-border"
            >
                <div className="flex h-20 items-center px-6 border-b border-border">
                    <Link href="/dashboard/courses" className="flex items-center gap-2 font-semibold">
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

                <div className="px-6 py-4">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Course Details</p>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    {visibleItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "flex w-full items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isActive
                                        ? "bg-secondary text-secondary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </motion.aside>

            {/* Mobile Bottom Navigation (similar to global mobile nav) */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden border-t border-border bg-background pb-safe items-center justify-around px-2 py-2 overflow-x-auto">
                {visibleItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={cn(
                                "flex min-w-[64px] flex-col items-center gap-1 p-2 text-[10px] font-medium transition-colors rounded-lg",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </>
    );
}
