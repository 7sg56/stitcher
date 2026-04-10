"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

interface CourseRating {
    course_id: string;
    course_name: string;
    course_code: string;
    weighted_avg_rating: number;
    total_reviews: number;
    is_flagged: boolean;
    last_aggregated_at: string;
}

interface WeakConcept {
    concept: string;
    source: string;
    detail?: string;
}

interface SessionInsight {
    session_id: string;
    topic: string | null;
    started_at: string;
    weak_concepts: WeakConcept[];
    quiz_accuracy_pct: number | null;
    avg_rating: number | null;
    total_feedback: number;
}

interface PortfolioData {
    ratings: CourseRating[];
    overall_avg: number;
    total_reviews: number;
    is_any_flagged: boolean;
    recent_insights: SessionInsight[];
    profile?: {
        designation: string | null;
        contact_email: string | null;
        orcid_id: string | null;
        personal_website: string | null;
        mastery_tags: string[];
        bio: string | null;
    } | null;
}

export default function TeacherPortfolio() {
    const { getToken } = useAuth();
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        designation: "",
        contact_email: "",
        orcid_id: "",
        personal_website: "",
        mastery_tags: "",
        bio: ""
    });
    const [savingProfile, setSavingProfile] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    useEffect(() => {
        async function fetchPortfolio() {
            const token = await getToken();
            if (!token) return;

            try {
                const res = await fetch(`${apiUrl}/dashboard/teacher/portfolio`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setPortfolio(data.portfolio);
                    if (data.portfolio.profile) {
                        setProfileForm({
                            designation: data.portfolio.profile.designation || "",
                            contact_email: data.portfolio.profile.contact_email || "",
                            orcid_id: data.portfolio.profile.orcid_id || "",
                            personal_website: data.portfolio.profile.personal_website || "",
                            mastery_tags: (data.portfolio.profile.mastery_tags || []).join(", "),
                            bio: data.portfolio.profile.bio || ""
                        });
                    }
                }
            } catch {
                /* ignore */
            } finally {
                setLoading(false);
            }
        }

        fetchPortfolio();
    }, [getToken, apiUrl]);

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setSavingProfile(true);
        const token = await getToken();
        if (!token) return;

        try {
            const tags = profileForm.mastery_tags.split(",").map(t => t.trim()).filter(Boolean);
            const res = await fetch(`${apiUrl}/dashboard/teacher/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...profileForm, mastery_tags: tags })
            });

            if (res.ok) {
                const refreshed = await fetch(`${apiUrl}/dashboard/teacher/portfolio`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (refreshed.ok) {
                    const data = await refreshed.json();
                    setPortfolio(data.portfolio);
                }
                setIsEditingProfile(false);
            } else {
                alert("Failed to save profile");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSavingProfile(false);
        }
    }

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 animate-pulse">
                <div className="h-6 w-48 bg-zinc-800 rounded mb-4" />
                <div className="h-4 w-full bg-zinc-800 rounded mb-2" />
                <div className="h-4 w-3/4 bg-zinc-800 rounded" />
            </div>
        );
    }

    if (!portfolio) {
        return null;
    }

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

        return <span className="text-lg">{stars}</span>;
    }

    return (
        <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Teaching Portfolio</h2>
                    {portfolio.is_any_flagged && (
                        <span className="text-xs font-medium text-amber-400 bg-amber-900/30 px-3 py-1.5 rounded-full">
                            Review Needed
                        </span>
                    )}
                </div>

                {/* Summary Stats */}
                {portfolio.ratings.length === 0 ? (
                    <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500 text-sm mb-6">
                        No rating data available yet. Ratings are generated after sessions end and students submit feedback.
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-white">{portfolio.overall_avg.toFixed(1)}</div>
                            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Overall Rating</div>
                            <div className="mt-2">{renderStars(portfolio.overall_avg)}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-white">{portfolio.total_reviews}</div>
                            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Total Reviews</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-white">{portfolio.ratings.length}</div>
                            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Courses Rated</div>
                        </div>
                    </div>
                )}

                {/* Per-course ratings */}
                {portfolio.ratings.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Ratings by Course</h3>
                        <div className="space-y-2">
                            {portfolio.ratings.map((r) => (
                                <div
                                    key={r.course_id}
                                    className={`flex items-center justify-between p-4 rounded-xl border ${r.is_flagged
                                        ? "border-amber-800/50 bg-amber-900/10"
                                        : "border-zinc-800 bg-zinc-800/30"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="text-white font-medium text-sm">{r.course_name}</span>
                                            <span className="text-zinc-600 font-mono text-xs ml-2">{r.course_code}</span>
                                        </div>
                                        {r.is_flagged && (
                                            <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
                                                Flagged
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {renderStars(r.weighted_avg_rating)}
                                        <span className="text-sm text-white font-medium w-8 text-right">
                                            {r.weighted_avg_rating.toFixed(1)}
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            ({r.total_reviews} review{r.total_reviews !== 1 ? "s" : ""})
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Session Insights */}
            {portfolio.recent_insights.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-1">Session Insights</h2>
                    <p className="text-zinc-500 text-sm mb-6">
                        Weak concepts and feedback from recent sessions to help prepare for the next class.
                    </p>

                    <div className="space-y-3">
                        {portfolio.recent_insights.map((insight) => (
                            <div key={insight.session_id} className="border border-zinc-800 rounded-xl overflow-hidden">
                                <button
                                    onClick={() =>
                                        setExpandedInsight(
                                            expandedInsight === insight.session_id ? null : insight.session_id
                                        )
                                    }
                                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors text-left"
                                >
                                    <div>
                                        <span className="text-white font-medium text-sm">
                                            {insight.topic || "Untitled Session"}
                                        </span>
                                        <span className="text-zinc-600 text-xs ml-3">
                                            {new Date(insight.started_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {insight.avg_rating !== null && (
                                            <span className="text-xs text-zinc-400">
                                                {insight.avg_rating.toFixed(1)} avg
                                            </span>
                                        )}
                                        {insight.quiz_accuracy_pct !== null && (
                                            <span className="text-xs text-zinc-400">
                                                {insight.quiz_accuracy_pct.toFixed(0)}% quiz acc
                                            </span>
                                        )}
                                        <span className="text-xs text-zinc-500">
                                            {insight.total_feedback} feedback
                                        </span>
                                        <span className={`text-zinc-500 transition-transform ${expandedInsight === insight.session_id ? "rotate-180" : ""
                                            }`}>
                                            &#9660;
                                        </span>
                                    </div>
                                </button>

                                {expandedInsight === insight.session_id && (
                                    <div className="px-4 pb-4 border-t border-zinc-800">
                                        {insight.weak_concepts.length === 0 ? (
                                            <p className="text-zinc-500 text-sm py-3">
                                                No weak concepts identified for this session.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 pt-3">
                                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                                                    Weak Concepts ({insight.weak_concepts.length})
                                                </p>
                                                {insight.weak_concepts.map((wc, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg"
                                                    >
                                                        <span
                                                            className={`text-xs font-mono px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${wc.source === "quiz"
                                                                ? "bg-indigo-900/30 text-indigo-400"
                                                                : "bg-amber-900/30 text-amber-400"
                                                                }`}
                                                        >
                                                            {wc.source}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-sm text-zinc-300 break-words">
                                                                {wc.concept}
                                                            </p>
                                                            {wc.detail && (
                                                                <p className="text-xs text-zinc-500 mt-0.5">
                                                                    {wc.detail}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Public Profile Configuration */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Public Profile Settings</h2>
                        <p className="text-sm text-zinc-500 mt-1">Enhance your public portfolio page for students.</p>
                    </div>
                    {!isEditingProfile && (
                        <button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
                            Edit Profile
                        </button>
                    )}
                </div>

                {isEditingProfile ? (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Designation</label>
                                <input type="text" value={profileForm.designation} onChange={e => setProfileForm({ ...profileForm, designation: e.target.value })} placeholder="e.g. Associate Professor of CS" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Contact Email</label>
                                <input type="email" value={profileForm.contact_email} onChange={e => setProfileForm({ ...profileForm, contact_email: e.target.value })} placeholder="Public email address" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">ORCID ID</label>
                                <input type="text" value={profileForm.orcid_id} onChange={e => setProfileForm({ ...profileForm, orcid_id: e.target.value })} placeholder="e.g. 0000-0002-1825-0097" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Personal Website</label>
                                <input type="url" value={profileForm.personal_website} onChange={e => setProfileForm({ ...profileForm, personal_website: e.target.value })} placeholder="https://..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs text-zinc-500 mb-1">Mastery Tags (comma separated)</label>
                                <input type="text" value={profileForm.mastery_tags} onChange={e => setProfileForm({ ...profileForm, mastery_tags: e.target.value })} placeholder="e.g. Artificial Intelligence, Machine Learning, Graph Theory" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs text-zinc-500 mb-1">Biography</label>
                                <textarea value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="A short bio about your academic background..." rows={4} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={savingProfile} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                                {savingProfile ? "Saving..." : "Save Profile"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-sm text-zinc-400">
                        {portfolio.profile ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mt-4 bg-zinc-800/30 rounded-xl p-6 border border-zinc-700/50">
                                <div>
                                    <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Designation</span>
                                    <span className="text-white">{portfolio.profile.designation || <span className="text-zinc-600 italic">Not set</span>}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Contact Email</span>
                                    <span className="text-white">{portfolio.profile.contact_email || <span className="text-zinc-600 italic">Not set</span>}</span>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Mastery Areas</span>
                                    {portfolio.profile.mastery_tags && portfolio.profile.mastery_tags.length > 0 ? (
                                        <div className="flex gap-2 flex-wrap mt-1">
                                            {portfolio.profile.mastery_tags.map(tag => (
                                                <span key={tag} className="px-2 py-0.5 bg-zinc-700/50 text-zinc-300 rounded text-xs">{tag}</span>
                                            ))}
                                        </div>
                                    ) : <span className="text-zinc-600 italic">Not set</span>}
                                </div>
                            </div>
                        ) : (
                            <p className="py-4 text-center border border-zinc-800 rounded-lg bg-zinc-800/20 italic">
                                Your public profile is currently empty. Click Edit Profile to add details.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
