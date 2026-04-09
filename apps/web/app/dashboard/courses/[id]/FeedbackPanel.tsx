"use client";

import { useState, useEffect } from "react";

interface FeedbackWindow {
    id: string;
    session_id: string;
    unit_id: string | null;
    is_open: boolean;
    opened_at: string;
    closed_at: string | null;
}

interface FeedbackEntry {
    id: string;
    student_id: string | null;
    session_id: string;
    rating: number;
    comment: string | null;
    is_anonymous: boolean;
    submitted_at: string;
    student_name?: string | null;
}

interface Session {
    id: string;
    topic: string | null;
    started_at: string;
    ended_at: string | null;
    is_cancelled: boolean;
    quiz_id?: string | null;
}

interface DistOption {
    option_id: string;
    option_text: string;
    count: number;
    percentage: number;
}

interface DistQuestion {
    question_id: string;
    question_text: string;
    total_responses: number;
    options: DistOption[];
}

interface AttemptRow {
    attempt_id: string;
    student_id: string;
    student_name: string | null;
    score: number | null;
    max_score: number | null;
    submitted_at: string | null;
}

interface FeedbackPanelProps {
    courseId: string;
    role: string;
    sessions: Session[];
    apiUrl: string;
    getToken: () => Promise<string | null>;
}

export default function FeedbackPanel({
    courseId,
    role,
    sessions,
    apiUrl,
    getToken,
}: FeedbackPanelProps) {
    const [error, setError] = useState<string | null>(null);
    const [currentWindow, setCurrentWindow] = useState<FeedbackWindow | null>(null);
    const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [courseRating, setCourseRating] = useState<{ average_rating: number; total_feedback: number } | null>(null);

    // Score maintainer state
    const [distribution, setDistribution] = useState<DistQuestion[]>([]);
    const [attempts, setAttempts] = useState<AttemptRow[]>([]);
    const [reviewTab, setReviewTab] = useState<"ratings" | "mcq" | "students">("ratings");

    const canManage = role === "teacher" || role === "admin";
    const isStudent = role === "student";

    const activeSessions = sessions.filter((s) => !s.ended_at && !s.is_cancelled);
    const endedSessions = sessions.filter((s) => s.ended_at && !s.is_cancelled);

    useEffect(() => {
        loadCourseRating();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    async function loadCourseRating() {
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/feedback/rating/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCourseRating(data);
            }
        } catch { /* ignore */ }
    }

    async function checkWindowForSession(session: Session) {
        const token = await getToken();
        if (!token) return;
        const sessionId = session.id;
        setSelectedSessionId(sessionId);
        setSelectedQuizId(session.quiz_id ?? null);
        setDistribution([]);
        setAttempts([]);
        setReviewTab("ratings");

        try {
            const res = await fetch(`${apiUrl}/feedback/window/session/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentWindow(data.window);
            }
            // Load existing feedback
            const fbRes = await fetch(`${apiUrl}/feedback/session/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (fbRes.ok) {
                const fbData = await fbRes.json();
                setFeedbackList(fbData.feedback || []);
            }
            // Load MCQ distribution + attempts if quiz exists
            if (session.quiz_id) {
                const [distRes, attRes] = await Promise.all([
                    fetch(`${apiUrl}/quizzes/${session.quiz_id}/distribution`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${apiUrl}/quizzes/${session.quiz_id}/attempts`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);
                if (distRes.ok) {
                    const distData = await distRes.json();
                    setDistribution(distData.distribution || []);
                }
                if (attRes.ok) {
                    const attData = await attRes.json();
                    setAttempts(attData.attempts || []);
                }
            }
        } catch {
            setError("Failed to load feedback");
        }
    }

    async function handleOpenWindow() {
        if (!selectedSessionId) return;
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/feedback/window`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ session_id: selectedSessionId }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            const data = await res.json();
            setCurrentWindow(data.window);
        } catch {
            setError("Failed to open feedback window");
        }
    }

    async function handleCloseWindow() {
        if (!currentWindow) return;
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/feedback/window/${currentWindow.id}/close`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentWindow(data.window);
                await loadCourseRating();
            }
        } catch {
            setError("Failed to close feedback window");
        }
    }

    function handleBack() {
        setSelectedSessionId(null);
        setSelectedQuizId(null);
        setCurrentWindow(null);
        setFeedbackList([]);
        setDistribution([]);
        setAttempts([]);
    }

    const avgRating = feedbackList.length > 0
        ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1)
        : null;

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                </div>
            )}

            {/* Course Rating Banner */}
            {courseRating && courseRating.total_feedback > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-6">
                    <div>
                        <p className="text-xs text-zinc-500 mb-1">Course Rating</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">{courseRating.average_rating}</span>
                            <span className="text-sm text-zinc-400">/ 5</span>
                        </div>
                    </div>
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-lg ${star <= Math.round(courseRating.average_rating) ? "text-amber-400" : "text-zinc-700"}`}>
                                &#9733;
                            </span>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500">{courseRating.total_feedback} feedback{courseRating.total_feedback !== 1 ? "s" : ""}</p>
                </div>
            )}

            {isStudent ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                    <h3 className="text-lg font-medium text-white mb-2">Session Feedback</h3>
                    <p className="text-sm text-zinc-400">
                        Feedback is collected exclusively via unique links provided by your teacher during lectures.
                    </p>
                </div>
            ) : (
                <>
                    {/* Teacher: Trigger Feedback for Active Sessions */}
                    {canManage && activeSessions.length > 0 && !selectedSessionId && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            <h3 className="text-sm font-medium text-white mb-3">Active Sessions</h3>
                            <div className="space-y-2">
                                {activeSessions.map((session) => (
                                    <div key={session.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-lg">
                                        <div>
                                            <p className="text-sm text-white">{session.topic || "Untitled Session"}</p>
                                            <p className="text-xs text-zinc-500">Started {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                            <p className="text-xs text-indigo-400 mt-1 font-mono">/feedback/{session.id}</p>
                                        </div>
                                        <button
                                            onClick={() => checkWindowForSession(session)}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                                        >
                                            Review
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Session Detail View */}
                    {selectedSessionId && canManage && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-white">
                                    Session Review
                                    {currentWindow?.is_open && (
                                        <span className="ml-2 text-xs text-emerald-400 animate-pulse">LIVE</span>
                                    )}
                                </h3>
                                <div className="flex gap-2">
                                    {!currentWindow?.is_open && (
                                        <button onClick={handleOpenWindow} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 transition-colors">
                                            Open Window
                                        </button>
                                    )}
                                    {currentWindow?.is_open && (
                                        <button onClick={handleCloseWindow} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-500 transition-colors">
                                            Close Window
                                        </button>
                                    )}
                                    <button onClick={handleBack} className="px-3 py-2 text-sm text-zinc-400 hover:text-white">
                                        Back
                                    </button>
                                </div>
                            </div>

                            {/* Summary Bar */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-white">{avgRating || "--"}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Rating</p>
                                </div>
                                <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-white">{feedbackList.length}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Responses</p>
                                </div>
                                <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-white">{attempts.length}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">MCQ Submissions</p>
                                </div>
                            </div>

                            {/* Sub-tabs */}
                            <div className="flex gap-1 mb-4 bg-zinc-800 rounded-lg p-1">
                                {(["ratings" as const, ...(selectedQuizId ? ["mcq" as const, "students" as const] : [])]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setReviewTab(t)}
                                        className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${reviewTab === t ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-300"}`}
                                    >
                                        {t === "ratings" ? "Ratings & Comments" : t === "mcq" ? "MCQ Distribution" : "Student Responses"}
                                    </button>
                                ))}
                            </div>

                            {/* Ratings Tab */}
                            {reviewTab === "ratings" && (
                                <div>
                                    {feedbackList.length > 0 ? (
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {feedbackList.map((fb) => (
                                                <div key={fb.id} className="px-4 py-3 bg-zinc-800/50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <span key={star} className={`text-xs ${star <= fb.rating ? "text-amber-400" : "text-zinc-700"}`}>&#9733;</span>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-zinc-500">
                                                            {new Date(fb.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                        <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">Anonymous</span>
                                                    </div>
                                                    {fb.comment && <p className="text-sm text-zinc-300 mt-1">{fb.comment}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-zinc-500 text-center py-4">No feedback submitted yet.</p>
                                    )}
                                </div>
                            )}

                            {/* MCQ Distribution Tab */}
                            {reviewTab === "mcq" && (
                                <div className="space-y-6">
                                    {distribution.length === 0 ? (
                                        <p className="text-sm text-zinc-500 text-center py-4">No MCQ data available.</p>
                                    ) : (
                                        distribution.map((q, i) => (
                                            <div key={q.question_id} className="bg-zinc-800/40 rounded-lg p-4">
                                                <p className="text-sm text-white font-medium mb-3">{i + 1}. {q.question_text}</p>
                                                <div className="space-y-2">
                                                    {q.options.map((opt) => {
                                                        const maxCount = Math.max(...q.options.map(o => o.count), 1);
                                                        const isMax = opt.count === maxCount && opt.count > 0;
                                                        return (
                                                            <div key={opt.option_id} className="flex items-center gap-3">
                                                                <div className="w-32 text-xs text-zinc-400 truncate shrink-0">{opt.option_text}</div>
                                                                <div className="flex-1 bg-zinc-900 rounded-full h-5 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${isMax ? "bg-indigo-500" : "bg-zinc-600"}`}
                                                                        style={{ width: `${opt.percentage}%` }}
                                                                    />
                                                                </div>
                                                                <div className="w-16 text-right text-xs text-zinc-400 shrink-0">
                                                                    {opt.count} ({opt.percentage}%)
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-[10px] text-zinc-500 mt-2">{q.total_responses} response{q.total_responses !== 1 ? "s" : ""}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Student Responses Tab */}
                            {reviewTab === "students" && (
                                <div>
                                    {attempts.length === 0 ? (
                                        <p className="text-sm text-zinc-500 text-center py-4">No student submissions yet.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                                                        <th className="pb-2 pr-4">Student</th>
                                                        <th className="pb-2 pr-4">Submitted</th>
                                                        <th className="pb-2 pr-4 text-right">Rating</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {attempts.map((att) => {
                                                        const fb = feedbackList.find(f => f.student_id === att.student_id);
                                                        return (
                                                            <tr key={att.attempt_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                                                <td className="py-2.5 pr-4 text-zinc-300">{att.student_name || "Unknown"}</td>
                                                                <td className="py-2.5 pr-4 text-zinc-500 text-xs">
                                                                    {att.submitted_at
                                                                        ? new Date(att.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                                                        : "--"
                                                                    }
                                                                </td>
                                                                <td className="py-2.5 text-right">
                                                                    {fb ? (
                                                                        <span className="text-amber-400 text-xs">
                                                                            {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-zinc-600 text-xs">--</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Past sessions list */}
                    {canManage && endedSessions.length > 0 && !selectedSessionId && (
                        <div>
                            <h3 className="text-sm font-medium text-white mb-3">Past Session Feedback</h3>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                {endedSessions.slice(0, 10).map((session, i) => (
                                    <div
                                        key={session.id}
                                        onClick={() => checkWindowForSession(session)}
                                        className={`px-5 py-3.5 flex items-center justify-between cursor-pointer ${i > 0 ? "border-t border-zinc-800" : ""} hover:bg-zinc-800/30 transition-colors`}
                                    >
                                        <div>
                                            <p className="text-sm text-white">{session.topic || "Untitled"}</p>
                                            <p className="text-xs text-zinc-500">{new Date(session.started_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className="text-xs text-zinc-400">View Responses</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
