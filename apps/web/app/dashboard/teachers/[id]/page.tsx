"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getPublicTeacherPortfolio } from "../../../../lib/api";

interface PublicPortfolio {
    profile: {
        id: string;
        real_name: string | null;
        real_email: string | null;
        teacher_title: string | null;
        designation: string | null;
        contact_email: string | null;
        orcid_id: string | null;
        personal_website: string | null;
        mastery_tags: string[];
        bio: string | null;
    };
    ratings: {
        course_id: string;
        course_name: string;
        course_code: string;
        weighted_avg_rating: number;
        total_reviews: number;
        last_aggregated_at: string;
    }[];
    overall_avg: number;
    total_reviews: number;
}

export default function PublicTeacherPortfolioPage() {
    const { id } = useParams();
    const { getToken } = useAuth();
    const [portfolio, setPortfolio] = useState<PublicPortfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPortfolio = useCallback(async () => {
        const token = await getToken();
        if (!token || !id) return;

        try {
            const res = await getPublicTeacherPortfolio(token, id as string);
            if (res.data) {
                setPortfolio(res.data.portfolio);
            }
        } catch {
            setError("Failed to load teacher portfolio or teacher not found.");
        } finally {
            setLoading(false);
        }
    }, [getToken, id]);

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    function renderStars(rating: number) {
        const fullStars = Math.floor(rating);
        const hasHalf = rating - fullStars >= 0.25;
        const stars = [];

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(
                    <span key={i} className="text-amber-400">&#9733;</span>
                );
            } else if (i === fullStars && hasHalf) {
                stars.push(
                    <span key={i} className="text-amber-400/50">&#9733;</span>
                );
            } else {
                stars.push(
                    <span key={i} className="text-zinc-700">&#9733;</span>
                );
            }
        }
        return <span className="text-lg tracking-widest">{stars}</span>;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm">Loading Teacher Portfolio...</p>
                </div>
            </div>
        );
    }

    if (error || !portfolio) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p className="text-zinc-300 text-lg font-medium">{error || "Portfolio not found."}</p>
                <Link href="/dashboard" className="text-indigo-400 text-sm mt-4 block hover:text-indigo-300 transition-colors">
                    &larr; Back to Dashboard
                </Link>
            </div>
        );
    }

    const { profile, ratings, overall_avg, total_reviews } = portfolio;
    const displayName = profile.teacher_title
        ? `${profile.teacher_title} ${profile.real_name || "Unknown"}`
        : profile.real_name || "Unknown";

    return (
        <div className="min-h-screen bg-zinc-950">
            <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm">
                            &larr; Back
                        </Link>
                        <h1 className="text-lg font-semibold text-white tracking-tight">Public Portfolio</h1>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
                {/* Header Profile Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden">
                    {/* Decorative blurred background orb */}
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_minmax(250px,auto)] gap-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
                            {profile.designation && (
                                <p className="text-indigo-400 font-medium text-lg mb-4">{profile.designation}</p>
                            )}

                            {profile.bio && (
                                <div className="mt-4 text-zinc-400 text-sm leading-relaxed border-l-2 border-zinc-800 pl-4">
                                    {profile.bio}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-4">
                                {profile.contact_email && (
                                    <a href={`mailto:${profile.contact_email}`} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700/50">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        Contact
                                    </a>
                                )}
                                {profile.orcid_id && (
                                    <a href={`https://orcid.org/${profile.orcid_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-[#A6CE39] transition-colors bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700/50">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-4.741 17.51H4.29V6.49h2.969v11.02zM5.772 5.28A1.72 1.72 0 115.772 1.84a1.72 1.72 0 010 3.44zm14.116 8.571c0 3.284-2.128 5.659-6.02 5.659H9.412V6.49h4.29c3.784 0 5.8 2.052 5.8 5.176 0 1.942-1.077 3.39-2.73 4.227 1.874.57 3.116 2.071 3.116 4.168zm-2.845 3.992c1.782-1.127 2.115-3.078 2.115-4.526 0-2.822-1.898-3.797-4.322-3.797h-2.348v8.323h2.155c2.193 0 3.514-1.013 3.514-2.31 0-1.424-1.45-2.22-3.13-2.22h-1.05v-1.784h1.05c1.476 0 2.655.43 2.655 1.748.064-1.318-1.115-1.748-2.655-1.748zm-1.63-7.838c0-1.874-1.424-2.457-3.207-2.457h-1.938v5.166h1.938c1.731 0 3.207-.633 3.207-2.709z" />
                                        </svg>
                                        ORCID
                                    </a>
                                )}
                                {profile.personal_website && (
                                    <a href={profile.personal_website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700/50">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        Website
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="flex flex-col justify-center space-y-4">
                            <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/30 text-center shadow-inner">
                                <div className="text-3xl font-extrabold text-white">{overall_avg.toFixed(1)}</div>
                                <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-semibold flex items-center justify-center gap-1">
                                    Overall Rating
                                </div>
                                <div className="mt-2.5">
                                    {renderStars(overall_avg)}
                                </div>
                            </div>

                            <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/30 text-center flex items-center justify-between shadow-inner">
                                <div className="text-left">
                                    <div className="text-lg font-bold text-white">{total_reviews}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Student Reviews</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-white">{ratings.length}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Courses</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mastery Areas (Tags) */}
                {profile.mastery_tags && profile.mastery_tags.length > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                        <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            Areas of Mastery
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {profile.mastery_tags.map(tag => (
                                <span key={tag} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm rounded-full font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Courses Listing */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 pb-4">
                    <h2 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        Course Metrics
                    </h2>

                    {ratings.length === 0 ? (
                        <div className="text-zinc-500 text-sm text-center py-8">
                            No courses with metrics found yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ratings.map((r) => (
                                <div
                                    key={r.course_id}
                                    className="p-5 rounded-2xl border border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-white font-medium">{r.course_name}</h3>
                                            <span className="inline-block mt-1 text-zinc-500 font-mono text-xs bg-zinc-800 px-2 py-0.5 rounded">
                                                {r.course_code}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-white leading-none">
                                                {r.weighted_avg_rating.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-zinc-700/50 pt-3">
                                        <div className="text-zinc-500 text-xs">
                                            {r.total_reviews} Student Review{r.total_reviews !== 1 ? "s" : ""}
                                        </div>
                                        <div>{renderStars(r.weighted_avg_rating)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
