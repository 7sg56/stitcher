"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SessionInfo {
    id: string;
    topic: string | null;
    quiz_id: string | null;
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

    // States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<SessionInfo | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

    // Form States
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

    useEffect(() => {
        if (!isLoaded) return;

        async function loadFeedbackDetails() {
            setLoading(true);
            try {
                const token = await getToken();
                if (!token) {
                    setError("You must be signed in to submit feedback.");
                    setLoading(false);
                    return;
                }

                // 1. Fetch Session Info
                const resSession = await fetch(`${apiUrl}/sessions/${sessionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!resSession.ok) throw new Error("Failed to load session details.");
                const session = await resSession.json();
                setSessionData(session.session as SessionInfo);

                // 2. Fetch Window Info
                const resWindow = await fetch(`${apiUrl}/feedback/window/session/${sessionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!resWindow.ok) throw new Error("Feedback window not found.");
                const wData = await resWindow.json();
                const feedbackWindow = wData.window as FeedbackWindow | undefined;

                if (!feedbackWindow?.is_open) {
                    setError("The feedback window for this session has closed.");
                    setLoading(false);
                    return;
                }

                // 3. Fetch Quiz/Questions if present
                if (session.session.quiz_id) {
                    const qRes = await fetch(`${apiUrl}/quizzes/${session.session.quiz_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (qRes.ok) {
                        const qData = await qRes.json();
                        setActiveQuiz(qData.quiz);

                        // Check or create attempt
                        const attCheckRes = await fetch(`${apiUrl}/quizzes/${session.session.quiz_id}/my-attempt`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        if (attCheckRes.ok) {
                            const attCheckData = await attCheckRes.json();
                            if (attCheckData.attempt) {
                                // Already attempted
                                setActiveQuiz(null);
                            } else {
                                const attRes = await fetch(`${apiUrl}/quizzes/${session.session.quiz_id}/attempt`, {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` }
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
                const message = err instanceof Error ? err.message : "An error occurred.";
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

        setLoading(true);
        const token = await getToken();
        if (!token) return;

        try {
            // Unify: If there is an active quiz and attempt, submit it first
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
                    const data = await attRes.json();
                    throw new Error("Failed to submit answers: " + data.error);
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
                const data = await res.json();
                throw new Error(data.error || "Failed to submit feedback");
            }

            setSubmitted(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to complete submission";
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    if (!isLoaded || loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <span className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
                <div className="bg-red-900/20 border border-red-800 p-6 rounded-xl max-w-md w-full text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button onClick={() => window.location.href = "/dashboard"} className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-white transition-colors">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
                <div className="bg-emerald-900/20 border border-emerald-800 p-8 rounded-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">✓</div>
                    <h2 className="text-xl font-semibold mb-2">Feedback Received!</h2>
                    <p className="text-emerald-400 text-sm mb-6">Your attendance has been marked.</p>
                    <button onClick={() => window.close()} className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-white transition-colors">
                        Close Window
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20">
            <div className="max-w-2xl mx-auto pt-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold">Session Feedback</h1>
                    <p className="text-zinc-500 mt-1">{sessionData?.topic || "Untitled Session"}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Native Questions */}
                    {activeQuiz && attemptId && activeQuiz.questions && activeQuiz.questions.length > 0 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-medium text-indigo-400 border-b border-zinc-800 pb-2">Questions</h2>
                            {activeQuiz.questions.map((q: QuizQuestion, i: number) => (
                                <div key={q.id} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
                                    <p className="text-white mb-3 font-medium">{i + 1}. {q.question_text}</p>
                                    <div className="space-y-2">
                                        {q.options.map((opt: QuizOption) => (
                                            <label key={opt.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-black cursor-pointer hover:border-zinc-700 transition-colors">
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    checked={quizAnswers[q.id] === opt.id}
                                                    onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt.id })}
                                                    className="accent-indigo-500 w-4 h-4"
                                                    required
                                                />
                                                <span className="text-sm text-zinc-300">{opt.option_text}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Standard Feedback */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-medium text-indigo-400 border-b border-zinc-800 pb-2">Rating & Comments</h2>
                        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
                            <p className="text-sm text-zinc-400 mb-3">Rate your understanding of this session</p>
                            <div className="flex gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className={`text-2xl transition-colors ${rating >= star ? "text-yellow-400" : "text-zinc-700 hover:text-zinc-500"}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>

                            <label className="block text-sm text-zinc-400 mb-2">Additional Comments (Optional)</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Any specific doubts or feedback?"
                                className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[100px]"
                            />

                            <p className="text-xs text-emerald-500 mt-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                Guaranteed Anonymous
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={rating === 0}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl disabled:opacity-50 transition-colors"
                    >
                        Submit Feedback
                    </button>
                </form>
            </div>
        </div>
    );
}
