"use client";

import { useState, useEffect } from "react";

interface Session {
    id: string;
    course_id: string;
    teacher_id: string;
    topic: string | null;
    started_at: string;
    ended_at: string | null;
    location: string | null;
    duration_minutes: number | null;
    quiz_id: string | null;
    is_cancelled: boolean;
}

interface EnrolledStudent {
    id: string;
    user_id: string;
    student_name: string | null;
}

interface FeedbackEntry {
    id: string;
    student_id: string | null;
    rating: number;
    comment: string | null;
    is_anonymous: boolean;
    submitted_at: string;
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
    submitted_at: string | null;
}

interface SessionsPanelProps {
    courseId: string;
    role: string;
    sessions: Session[];
    activeSession: Session | null;
    enrolledStudents: EnrolledStudent[];
    apiUrl: string;
    getToken: () => Promise<string | null>;
    onRefresh: () => Promise<void>;
}

export default function SessionsPanel({
    courseId,
    role,
    sessions,
    activeSession,
    enrolledStudents,
    apiUrl,
    getToken,
    onRefresh,
}: SessionsPanelProps) {
    // Session creation
    const [topic, setTopic] = useState("");
    const [location, setLocation] = useState("");
    const [durationMins, setDurationMins] = useState("60");
    const [questions, setQuestions] = useState<{ question_text: string; options: string[]; correct_index: number }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Attendance
    const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

    // Session drill-down
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
    const [sessionTab, setSessionTab] = useState<"attendance" | "feedback" | "mcq" | "students">("attendance");
    const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
    const [distribution, setDistribution] = useState<DistQuestion[]>([]);
    const [attempts, setAttempts] = useState<AttemptRow[]>([]);

    // Course rating
    const [courseRating, setCourseRating] = useState<{ average_rating: number; total_feedback: number } | null>(null);

    const canManage = role === "teacher" || role === "admin";
    const isStudent = role === "student";

    // Share feedback link
    const [shareCopied, setShareCopied] = useState(false);
    function shareFeedbackLink(session: Session) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const link = `${origin}/feedback/${session.id}`;
        const msg = `Submit your feedback for today's session: "${session.topic || "Untitled Session"}"\n${link}`;
        navigator.clipboard.writeText(msg).then(() => {
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        }).catch(() => setError("Failed to copy link"));
    }

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
            if (res.ok) setCourseRating(await res.json());
        } catch { /* ignore */ }
    }

    // --- Session CRUD ---

    async function handleStartSession() {
        if (!topic.trim()) {
            setError("Topic is required to start a session");
            return;
        }
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    course_id: courseId,
                    topic: topic.trim(),
                    location: location.trim() || undefined,
                    duration_minutes: parseInt(durationMins) || 60,
                    questions: questions.filter(q => q.question_text.trim() && q.options.filter(o => o.trim()).length > 0).map(q => ({
                        question_text: q.question_text,
                        options: q.options,
                        correct_index: q.correct_index,
                    })),
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            setTopic("");
            setLocation("");
            setDurationMins("60");
            setQuestions([]);
            await onRefresh();
        } catch {
            setError("Failed to start session");
        } finally {
            setLoading(false);
        }
    }

    async function handleEndSession(sessionId: string) {
        const token = await getToken();
        if (!token) return;
        try {
            await fetch(`${apiUrl}/sessions/${sessionId}/end`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            await onRefresh();
        } catch {
            setError("Failed to end session");
        }
    }

    async function handleCancelSession(sessionId: string) {
        if (!confirm("Cancel this session?")) return;
        const token = await getToken();
        if (!token) return;
        try {
            await fetch(`${apiUrl}/sessions/${sessionId}/cancel`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            await onRefresh();
        } catch {
            setError("Failed to cancel session");
        }
    }

    // --- Attendance ---

    async function loadAttendance(sessionId: string) {
        const token = await getToken();
        if (!token) return;
        setAttendanceSessionId(sessionId);
        try {
            const res = await fetch(`${apiUrl}/attendance/session/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                const map: Record<string, string> = {};
                for (const r of data.attendance || []) {
                    map[r.student_id] = r.status;
                }
                setAttendanceMap(map);
            }
        } catch {
            setError("Failed to load attendance");
        }
    }

    async function handleMarkAll(status: string) {
        const token = await getToken();
        if (!token || !attendanceSessionId) return;
        const records = enrolledStudents.map((s) => ({
            student_id: s.user_id,
            status,
        }));
        try {
            await fetch(`${apiUrl}/attendance/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ session_id: attendanceSessionId, records }),
            });
            await loadAttendance(attendanceSessionId);
        } catch {
            setError("Failed to mark attendance");
        }
    }

    async function handleToggleStudent(studentId: string) {
        const token = await getToken();
        if (!token || !attendanceSessionId) return;
        const currentStatus = attendanceMap[studentId] || "absent";
        const newStatus = currentStatus === "present" ? "absent" : "present";
        try {
            await fetch(`${apiUrl}/attendance/mark`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    session_id: attendanceSessionId,
                    student_id: studentId,
                    status: newStatus,
                }),
            });
            setAttendanceMap((prev) => ({ ...prev, [studentId]: newStatus }));
        } catch {
            setError("Failed to toggle attendance");
        }
    }

    // --- Session Drill-Down ---

    async function expandSession(session: Session) {
        if (expandedSessionId === session.id) {
            setExpandedSessionId(null);
            return;
        }

        setExpandedSessionId(session.id);
        setSessionTab("attendance");
        setFeedbackList([]);
        setDistribution([]);
        setAttempts([]);

        const token = await getToken();
        if (!token) return;

        // Load attendance for this session
        setAttendanceSessionId(session.id);
        await loadAttendance(session.id);

        // Load feedback
        try {
            const fbRes = await fetch(`${apiUrl}/feedback/session/${session.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (fbRes.ok) {
                const fbData = await fbRes.json();
                setFeedbackList(fbData.feedback || []);
            }
        } catch { /* ignore */ }

        // Load MCQ data if quiz exists
        if (session.quiz_id) {
            try {
                const [distRes, attRes] = await Promise.all([
                    fetch(`${apiUrl}/quizzes/${session.quiz_id}/distribution`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${apiUrl}/quizzes/${session.quiz_id}/attempts`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);
                if (distRes.ok) {
                    const d = await distRes.json();
                    setDistribution(d.distribution || []);
                }
                if (attRes.ok) {
                    const a = await attRes.json();
                    setAttempts(a.attempts || []);
                }
            } catch { /* ignore */ }
        }
    }

    const avgRating = feedbackList.length > 0
        ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1)
        : null;

    const presentCount = Object.values(attendanceMap).filter(s => s === "present").length;

    function getExpandedSession(): Session | null {
        return sessions.find(s => s.id === expandedSessionId) ?? activeSession?.id === expandedSessionId ? activeSession : null;
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                </div>
            )}

            {/* Course Rating Summary */}
            {courseRating && courseRating.total_feedback > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-5">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{courseRating.average_rating}</span>
                        <span className="text-xs text-zinc-500">/ 5</span>
                    </div>
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-sm ${star <= Math.round(courseRating.average_rating) ? "text-amber-400" : "text-zinc-700"}`}>&#9733;</span>
                        ))}
                    </div>
                    <span className="text-xs text-zinc-500">{courseRating.total_feedback} feedback{courseRating.total_feedback !== 1 ? "s" : ""} across all sessions</span>
                </div>
            )}

            {/* Start Session Form (teacher only) */}
            {canManage && !activeSession && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-white mb-3">Start a New Session</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="col-span-2">
                            <label className="block text-xs text-zinc-500 mb-1">Topic / Description</label>
                            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="What is this session about?" />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Duration (min)</label>
                            <input type="number" value={durationMins} onChange={(e) => setDurationMins(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                min={1} />
                        </div>
                    </div>
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs text-zinc-500">Feedback Questions (Optional)</label>
                            <button type="button" onClick={() => setQuestions([...questions, { question_text: "", options: ["", "", "", ""], correct_index: 0 }])} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">+ Add MCQ</button>
                        </div>
                        {questions.length > 0 && (
                            <div className="space-y-4">
                                {questions.map((q, i) => (
                                    <div key={i} className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-3 relative">
                                        <button type="button" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-red-400 font-bold hover:text-red-300">&times;</button>
                                        <input type="text" value={q.question_text} onChange={(e) => {
                                            const qt = [...questions]; qt[i]!.question_text = e.target.value; setQuestions(qt);
                                        }} className="w-full pr-8 px-3 py-1.5 mb-3 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:outline-none" placeholder="Question Text" />
                                        <p className="text-xs text-zinc-500 mb-2">
                                            Options — <span className="text-emerald-400">click to mark correct answer</span>
                                        </p>
                                        <div className="space-y-1.5">
                                            {q.options.map((opt, oi) => {
                                                const optLabels = ["A", "B", "C", "D"];
                                                const isCorrect = q.correct_index === oi;
                                                return (
                                                    <div
                                                        key={oi}
                                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${isCorrect ? "border-emerald-600/60 bg-emerald-900/15" : "border-zinc-700 bg-zinc-900/50"}`}
                                                        onClick={() => {
                                                            const qt = [...questions];
                                                            qt[i]!.correct_index = oi;
                                                            setQuestions(qt);
                                                        }}
                                                    >
                                                        <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isCorrect ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"}`}>
                                                            {isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                        </div>
                                                        <span className={`flex-shrink-0 w-5 h-5 rounded text-[10px] font-semibold flex items-center justify-center ${isCorrect ? "bg-emerald-800/50 text-emerald-300" : "bg-zinc-700 text-zinc-400"}`}>
                                                            {optLabels[oi] ?? oi + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                const qt = [...questions]; qt[i]!.options[oi] = e.target.value; setQuestions(qt);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex-1 bg-transparent text-white text-xs focus:outline-none placeholder:text-zinc-600"
                                                            placeholder={`Option ${optLabels[oi] ?? oi + 1}`}
                                                        />
                                                        {isCorrect && <span className="flex-shrink-0 text-[10px] text-emerald-400 font-medium">✓ Correct</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleStartSession} disabled={loading}
                            className="px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                            {loading ? "Starting..." : "Start Session"}
                        </button>
                    </div>
                </div>
            )}

            {/* Active Session Banner */}
            {activeSession && (
                <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-emerald-400">Live Session</span>
                            </div>
                            <p className="text-white font-medium">{activeSession.topic || "Untitled Session"}</p>
                            <p className="text-zinc-400 text-xs mt-1">
                                Started {new Date(activeSession.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                {activeSession.duration_minutes && ` · ${activeSession.duration_minutes} min`}
                                {activeSession.location && ` · Room: ${activeSession.location}`}
                            </p>
                            {isStudent && (
                                <a href={`/feedback/${activeSession.id}`} className="inline-block mt-2 px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500 transition-colors">
                                    Submit Feedback
                                </a>
                            )}
                            {canManage && (
                                <div className="flex items-center gap-2 mt-2">
                                    <button
                                        onClick={() => shareFeedbackLink(activeSession)}
                                        className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                                    >
                                        {shareCopied ? "Copied!" : "Share Feedback Link"}
                                    </button>
                                    <span className="text-zinc-500 text-xs font-mono truncate max-w-[200px] select-all">
                                        /feedback/{activeSession.id.slice(0, 8)}...
                                    </span>
                                </div>
                            )}
                        </div>
                        {canManage && (
                            <div className="flex gap-2">
                                <button onClick={() => expandSession(activeSession)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                                    Details
                                </button>
                                <button onClick={() => handleEndSession(activeSession.id)} className="px-4 py-2 text-sm bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors">
                                    End Session
                                </button>
                                <button onClick={() => handleCancelSession(activeSession.id)} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Expanded Session Drill-Down */}
            {expandedSessionId && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-white">
                            Session Details
                        </h3>
                        <button onClick={() => { setExpandedSessionId(null); setAttendanceSessionId(null); }} className="text-xs text-zinc-400 hover:text-white">
                            Close
                        </button>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-white">{presentCount}/{enrolledStudents.length}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Attendance</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-white">{avgRating || "--"}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Rating</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-white">{feedbackList.length}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Responses</p>
                        </div>
                    </div>

                    {/* Sub-tabs */}
                    {(() => {
                        const expanded = getExpandedSession();
                        const tabs: ("attendance" | "feedback" | "mcq" | "students")[] = ["attendance" as const, "feedback" as const];
                        if (expanded?.quiz_id) {
                            tabs.push("mcq" as const, "students" as const);
                        }
                        return (
                            <div className="flex gap-1 mb-4 bg-zinc-800 rounded-lg p-1">
                                {tabs.map((t) => (
                                    <button key={t} onClick={() => setSessionTab(t)}
                                        className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${sessionTab === t ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-300"}`}>
                                        {t === "attendance" ? "Attendance" : t === "feedback" ? "Feedback" : t === "mcq" ? "MCQ Distribution" : "Student Responses"}
                                    </button>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Attendance Sub-tab */}
                    {sessionTab === "attendance" && canManage && (
                        <div>
                            <div className="flex gap-2 mb-3">
                                <button onClick={() => handleMarkAll("present")} className="px-3 py-1 text-xs bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors">
                                    Mark All Present
                                </button>
                                <button onClick={() => handleMarkAll("absent")} className="px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors">
                                    Mark All Absent
                                </button>
                            </div>
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                {enrolledStudents.length === 0 ? (
                                    <p className="text-zinc-500 text-sm">No enrolled students.</p>
                                ) : (
                                    enrolledStudents.map((student) => {
                                        const status = attendanceMap[student.user_id] || "absent";
                                        return (
                                            <div key={student.user_id}
                                                className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-zinc-800/50 cursor-pointer"
                                                onClick={() => handleToggleStudent(student.user_id)}>
                                                <span className="text-sm text-zinc-300">{student.student_name || "Unknown"}</span>
                                                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status === "present" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
                                                    {status}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Feedback Sub-tab */}
                    {sessionTab === "feedback" && (
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

                    {/* MCQ Distribution Sub-tab */}
                    {sessionTab === "mcq" && (
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
                                                            <div className={`h-full rounded-full transition-all ${isMax ? "bg-indigo-500" : "bg-zinc-600"}`}
                                                                style={{ width: `${opt.percentage}%` }} />
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

                    {/* Student Responses Sub-tab */}
                    {sessionTab === "students" && (
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
                                                            {att.submitted_at ? new Date(att.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                                                        </td>
                                                        <td className="py-2.5 text-right">
                                                            {fb ? (
                                                                <span className="text-amber-400 text-xs">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
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

            {/* Session History */}
            <div>
                <h3 className="text-sm font-medium text-white mb-3">Session History</h3>
                {sessions.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <p>No sessions yet.</p>
                    </div>
                ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        {sessions.map((session, i) => (
                            <div
                                key={session.id}
                                onClick={() => expandSession(session)}
                                className={`px-5 py-4 flex items-center justify-between cursor-pointer ${i > 0 ? "border-t border-zinc-800" : ""} hover:bg-zinc-800/30 transition-colors ${expandedSessionId === session.id ? "bg-zinc-800/40" : ""}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${session.is_cancelled
                                        ? "bg-red-400"
                                        : session.ended_at
                                            ? "bg-zinc-500"
                                            : "bg-emerald-400 animate-pulse"
                                        }`} />
                                    <div>
                                        <p className="text-white text-sm font-medium">{session.topic || "Untitled Session"}</p>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                                            <span>{new Date(session.started_at).toLocaleDateString()}</span>
                                            <span>Started {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                            {session.duration_minutes && <span>· {session.duration_minutes} min</span>}
                                            {session.location && <span>· {session.location}</span>}
                                            {session.is_cancelled && <span className="text-red-400">Cancelled</span>}
                                            {session.ended_at && !session.is_cancelled && (
                                                <span>· Ended {new Date(session.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isStudent && !session.ended_at && !session.is_cancelled && (
                                    <a href={`/feedback/${session.id}`} onClick={(e) => e.stopPropagation()}
                                        className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                                        Submit Feedback
                                    </a>
                                )}
                                {canManage && (
                                    <span className="text-xs text-zinc-500">
                                        {expandedSessionId === session.id ? "Viewing" : "Details"}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
