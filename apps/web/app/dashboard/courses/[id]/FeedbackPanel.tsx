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
}

interface Session {
    id: string;
    topic: string | null;
    started_at: string;
    ended_at: string | null;
    is_cancelled: boolean;
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
    const [courseRating, setCourseRating] = useState<{ average_rating: number; total_feedback: number } | null>(null);

    // Student submission state
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const canManage = role === "teacher" || role === "admin";
    const isStudent = role === "student";

    // Active (non-cancelled, non-ended) sessions for triggering feedback
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

    async function checkWindowForSession(sessionId: string) {
        const token = await getToken();
        if (!token) return;
        setSelectedSessionId(sessionId);
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

    async function handleSubmitFeedback(e: React.FormEvent) {
        e.preventDefault();
        if (rating === 0 || !selectedSessionId) return;
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    session_id: selectedSessionId,
                    rating,
                    comment: comment.trim() || undefined,
                    is_anonymous: isAnonymous,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            setSubmitted(true);
        } catch {
            setError("Failed to submit feedback");
        }
    }

    // Calculate average from displayed list
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

            {/* Teacher: Open Feedback Window for Active Session */}
            {canManage && activeSessions.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-white mb-3">Trigger Feedback</h3>
                    <div className="space-y-2">
                        {activeSessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-lg">
                                <div>
                                    <p className="text-sm text-white">{session.topic || "Untitled Session"}</p>
                                    <p className="text-xs text-zinc-500">Started {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedSessionId(session.id);
                                        checkWindowForSession(session.id);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                                >
                                    Feedback
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Feedback Window Controls (when session selected) */}
            {selectedSessionId && canManage && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-white">
                            Feedback Window
                            {currentWindow?.is_open && (
                                <span className="ml-2 text-xs text-emerald-400 animate-pulse">OPEN</span>
                            )}
                        </h3>
                        <div className="flex gap-2">
                            {!currentWindow?.is_open && (
                                <button
                                    onClick={handleOpenWindow}
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 transition-colors"
                                >
                                    Open Window
                                </button>
                            )}
                            {currentWindow?.is_open && (
                                <button
                                    onClick={handleCloseWindow}
                                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-500 transition-colors"
                                >
                                    Close Window
                                </button>
                            )}
                            <button
                                onClick={() => { setSelectedSessionId(null); setCurrentWindow(null); setFeedbackList([]); }}
                                className="px-3 py-2 text-sm text-zinc-400 hover:text-white"
                            >
                                Back
                            </button>
                        </div>
                    </div>

                    {/* Feedback Results */}
                    {feedbackList.length > 0 && (
                        <div>
                            {avgRating && (
                                <p className="text-sm text-zinc-400 mb-3">Average: <span className="text-white font-medium">{avgRating}/5</span> ({feedbackList.length} responses)</p>
                            )}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {feedbackList.map((fb) => (
                                    <div key={fb.id} className="px-4 py-3 bg-zinc-800/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <span key={star} className={`text-xs ${star <= fb.rating ? "text-amber-400" : "text-zinc-700"}`}>
                                                        &#9733;
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="text-xs text-zinc-500">
                                                {new Date(fb.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        {fb.comment && <p className="text-sm text-zinc-300 mt-1">{fb.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {feedbackList.length === 0 && (
                        <p className="text-sm text-zinc-500 text-center py-4">No feedback submitted yet.</p>
                    )}
                </div>
            )}

            {/* Student: Submit Feedback */}
            {isStudent && activeSessions.length > 0 && (
                <div className="space-y-3">
                    {activeSessions.map((session) => (
                        <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            <p className="text-sm text-white mb-1">{session.topic || "Current Session"}</p>
                            {submitted && selectedSessionId === session.id ? (
                                <p className="text-sm text-emerald-400">Feedback submitted. Thank you!</p>
                            ) : (
                                <div>
                                    <button
                                        onClick={() => { setSelectedSessionId(session.id); checkWindowForSession(session.id); }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300"
                                    >
                                        Check for feedback window
                                    </button>
                                    {selectedSessionId === session.id && currentWindow?.is_open && !submitted && (
                                        <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-3">
                                            <div>
                                                <p className="text-xs text-zinc-500 mb-2">How was this session?</p>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setRating(star)}
                                                            className={`text-2xl transition-colors ${star <= rating ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"}`}
                                                        >
                                                            &#9733;
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                placeholder="Comment (optional)"
                                            />
                                            <label className="flex items-center gap-2 text-sm text-zinc-400">
                                                <input
                                                    type="checkbox"
                                                    checked={isAnonymous}
                                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                                    className="accent-indigo-500"
                                                />
                                                Submit anonymously
                                            </label>
                                            <button
                                                type="submit"
                                                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                                            >
                                                Submit Feedback
                                            </button>
                                        </form>
                                    )}
                                    {selectedSessionId === session.id && (!currentWindow || !currentWindow.is_open) && (
                                        <p className="text-xs text-zinc-500 mt-2">No feedback window is open for this session right now.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Past sessions feedback (teacher view) */}
            {canManage && endedSessions.length > 0 && !selectedSessionId && (
                <div>
                    <h3 className="text-sm font-medium text-white mb-3">Past Session Feedback</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        {endedSessions.slice(0, 10).map((session, i) => (
                            <div
                                key={session.id}
                                onClick={() => checkWindowForSession(session.id)}
                                className={`px-5 py-3.5 flex items-center justify-between cursor-pointer ${i > 0 ? "border-t border-zinc-800" : ""} hover:bg-zinc-800/30 transition-colors`}
                            >
                                <div>
                                    <p className="text-sm text-white">{session.topic || "Untitled"}</p>
                                    <p className="text-xs text-zinc-500">{new Date(session.started_at).toLocaleDateString()}</p>
                                </div>
                                <span className="text-xs text-zinc-400">View Feedback</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
