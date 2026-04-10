"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SessionInfo {
    id: string;
    topic: string | null;
    course_id: string;
    quiz_id: string | null;
    started_at: string;
    duration_minutes: number | null;
}

interface QuizOption {
    id: string;
    option_text: string;
}

interface QuizQuestion {
    id: string;
    question_text: string;
    options: QuizOption[];
}

interface QuizData {
    questions: QuizQuestion[];
}

interface FeedbackWindow {
    is_open: boolean;
}

export default function SessionFeedbackPage() {
    const { sessionId } = useParams();
    const { getToken, isLoaded } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<SessionInfo | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    useEffect(() => {
        if (!isLoaded) return;

        async function loadFeedbackDetails() {
            setLoading(true);
            setError(null);
            try {
                const token = await getToken();
                if (!token) {
                    setError("You must be signed in to submit feedback.");
                    setLoading(false);
                    return;
                }

                // 1. Fetch Session Info
                const resSession = await fetch(`${apiUrl}/sessions/${sessionId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!resSession.ok) {
                    const errBody = await resSession.json().catch(() => ({}));
                    throw new Error(errBody.error || `Session not found (${resSession.status})`);
                }
                const sessionJson = await resSession.json();
                setSessionData(sessionJson.session as SessionInfo);

                // 2. Fetch Window Info
                const resWindow = await fetch(`${apiUrl}/feedback/window/session/${sessionId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!resWindow.ok) {
                    throw new Error("Could not check feedback window status.");
                }
                const wData = await resWindow.json();
                const feedbackWindow = wData.window as FeedbackWindow | undefined;

                if (!feedbackWindow?.is_open) {
                    setError("The feedback window for this session has closed.");
                    setLoading(false);
                    return;
                }

                // 3. Fetch Quiz/Questions if present
                if (sessionJson.session.quiz_id) {
                    const qRes = await fetch(`${apiUrl}/quizzes/${sessionJson.session.quiz_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (qRes.ok) {
                        const qData = await qRes.json();
                        setActiveQuiz(qData.quiz);

                        // Check or create attempt
                        const attCheckRes = await fetch(`${apiUrl}/quizzes/${sessionJson.session.quiz_id}/my-attempt`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });

                        if (attCheckRes.ok) {
                            const attCheckData = await attCheckRes.json();
                            if (attCheckData.attempt) {
                                // Already attempted -- skip quiz
                                setActiveQuiz(null);
                            } else {
                                const attRes = await fetch(`${apiUrl}/quizzes/${sessionJson.session.quiz_id}/attempt`, {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` },
                                });
                                if (attRes.ok) {
                                    const attData = await attRes.json();
                                    setAttemptId(attData.attempt.id);
                                }
                            }
                        }
                    }
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "An unexpected error occurred.";
                setError(message);
            } finally {
                setLoading(false);
            }
        }

        loadFeedbackDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, isLoaded]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (rating === 0) return;

        setSubmitting(true);
        setError(null);
        const token = await getToken();
        if (!token) return;

        try {
            // Submit quiz answers first if applicable
            if (attemptId && activeQuiz) {
                const responses = Object.entries(quizAnswers).map(([question_id, selected_option_id]) => ({
                    question_id,
                    selected_option_id,
                }));
                const attRes = await fetch(`${apiUrl}/quizzes/attempt/${attemptId}/submit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ responses }),
                });
                if (!attRes.ok) {
                    const data = await attRes.json().catch(() => ({}));
                    throw new Error(data.error || "Failed to submit quiz answers.");
                }
            }

            // Then submit feedback
            const res = await fetch(`${apiUrl}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    session_id: sessionId,
                    rating,
                    comment: comment.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to submit feedback.");
            }

            setSubmitted(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to complete submission.";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleRetry() {
        setError(null);
        setLoading(true);
        window.location.reload();
    }

    const ratingLabels = ["", "Poor", "Below Average", "Average", "Good", "Excellent"];
    const displayRating = hoverRating || rating;

    // --- Loading ---
    if (!isLoaded || loading) {
        return (
            <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center p-6">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <p className="text-zinc-500 text-sm mt-4">Loading session...</p>
            </div>
        );
    }

    // --- Error ---
    if (error && !sessionData) {
        return (
            <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-sm w-full text-center">
                    <div className="w-14 h-14 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-red-400 text-2xl">!</span>
                    </div>
                    <p className="text-red-400 text-sm mb-6">{error}</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleRetry}
                            className="w-full py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 active:scale-[0.98] transition-all"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => (window.location.href = "/dashboard")}
                            className="w-full py-3 bg-zinc-800 text-zinc-300 text-sm rounded-xl hover:bg-zinc-700 active:scale-[0.98] transition-all"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Success ---
    if (submitted) {
        return (
            <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold mb-1">Feedback Submitted</h2>
                    <p className="text-emerald-400 text-sm mb-1">Your attendance has been marked.</p>
                    <p className="text-zinc-500 text-xs mb-6">You can close this tab now.</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                try { window.close(); } catch { }
                                // If window.close didn't work, redirect after a moment
                                setTimeout(() => window.location.href = "/dashboard", 300);
                            }}
                            className="w-full py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 active:scale-[0.98] transition-all"
                        >
                            Done
                        </button>
                        <a
                            href="/dashboard"
                            className="w-full py-3 bg-zinc-800 text-zinc-300 text-sm rounded-xl hover:bg-zinc-700 active:scale-[0.98] transition-all text-center block"
                        >
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // --- Main Form ---
    return (
        <div className="min-h-dvh bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <p className="text-xs text-indigo-400 font-medium tracking-wide uppercase">Session Feedback</p>
                    <h1 className="text-lg font-semibold text-white mt-0.5 leading-tight">
                        {sessionData?.topic || "Untitled Session"}
                    </h1>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6 pb-32">
                {/* Inline error */}
                {error && (
                    <div className="bg-red-900/20 border border-red-800/50 text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">!</span>
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="shrink-0 text-red-500 hover:text-red-300">&times;</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* MCQ Questions */}
                    {activeQuiz && attemptId && activeQuiz.questions && activeQuiz.questions.length > 0 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-base font-medium text-white">Questions</h2>
                                <p className="text-xs text-zinc-500 mt-0.5">Answer the following before submitting your feedback</p>
                            </div>
                            {activeQuiz.questions.map((q: QuizQuestion, i: number) => (
                                <div key={q.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                                    <p className="text-white font-medium text-sm mb-4">
                                        <span className="text-indigo-400 mr-1.5">{i + 1}.</span>
                                        {q.question_text}
                                    </p>
                                    <div className="space-y-2.5">
                                        {q.options.map((opt: QuizOption) => {
                                            const selected = quizAnswers[q.id] === opt.id;
                                            return (
                                                <label
                                                    key={opt.id}
                                                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${selected
                                                        ? "border-indigo-500/50 bg-indigo-500/10"
                                                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "border-indigo-500 bg-indigo-500" : "border-zinc-600"
                                                        }`}>
                                                        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        checked={selected}
                                                        onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt.id })}
                                                        className="sr-only"
                                                        required
                                                    />
                                                    <span className="text-sm text-zinc-200">{opt.option_text}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Star Rating */}
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
                        <h2 className="text-base font-medium text-white mb-1">How was the session?</h2>
                        <p className="text-xs text-zinc-500 mb-5">Rate your understanding of the material</p>

                        <div className="flex items-center justify-center gap-3 mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onTouchStart={() => setRating(star)}
                                    className={`text-4xl transition-all duration-150 active:scale-110 select-none ${displayRating >= star
                                        ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                                        : "text-zinc-700"
                                        }`}
                                    style={{ WebkitTapHighlightColor: "transparent", minWidth: "48px", minHeight: "48px" }}
                                >
                                    &#9733;
                                </button>
                            ))}
                        </div>
                        {displayRating > 0 && (
                            <p className="text-center text-sm text-zinc-400 transition-opacity">
                                {ratingLabels[displayRating]}
                            </p>
                        )}
                    </div>

                    {/* Comment */}
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
                        <label className="block text-sm font-medium text-white mb-1">
                            Comments
                            <span className="text-zinc-600 font-normal ml-1">(optional)</span>
                        </label>
                        <p className="text-xs text-zinc-500 mb-3">Any specific doubts or feedback?</p>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your thoughts..."
                            rows={4}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none transition-colors"
                        />
                    </div>

                    {/* Anonymous badge */}
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        All feedback is anonymous
                    </div>
                </form>
            </div>

            {/* Fixed bottom submit */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-800/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="max-w-lg mx-auto">
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={rating === 0 || submitting}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-base"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </span>
                        ) : (
                            "Submit Feedback"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
