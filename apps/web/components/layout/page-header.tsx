"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

export interface PageHeaderProps {
    title: React.ReactNode;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    roleName: string;
    action?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs, roleName, action }: PageHeaderProps) {
    const { user, isLoaded } = useUser();
    const displayName = isLoaded && user ? (user.firstName || user.username || "User") : "Loading...";

    return (
        <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 lg:px-8 shrink-0">
            {/* Left Box: Breadcrumb & Title */}
            <div className="flex items-center gap-4">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                        {breadcrumbs.map((bc, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                {bc.href ? (
                                    <Link href={bc.href} className="hover:text-foreground transition-colors">
                                        {bc.label}
                                    </Link>
                                ) : (
                                    <span className="text-foreground">{bc.label}</span>
                                )}
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        ))}
                    </div>
                )}
                <h1 className="text-2xl font-serif text-foreground tracking-tight">{title}</h1>
            </div>

            {/* Right Box: Action, Role, Profile */}
            <div className="flex items-center gap-6">
                {action && (
                    <div className="hidden sm:block">
                        {action}
                    </div>
                )}

                <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

                {/* Role Badge */}
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-semibold leading-6 text-foreground">
                        {displayName}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest leading-none mt-1">
                        {roleName}
                    </span>
                </div>

                {/* Profile Image */}
                {isLoaded && user?.imageUrl ? (
                    <Image
                        src={user.imageUrl}
                        alt="Profile"
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 rounded-full bg-muted object-cover border border-border shrink-0"
                    />
                ) : (
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground border border-border shrink-0 animate-pulse">
                        {displayName.charAt(0)}
                    </div>
                )}
            </div>
        </header>
    );
}
