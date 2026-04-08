"use client";

import { useState } from "react";

interface Session {
    id: string;
    course_id: string;
    teacher_id: string;
    topic: string | null;
    started_at: string;
    ended_at: string | null;
    location: string | null;
    is_cancelled: boolean;
}

interface AttendanceRecord {
    id: string;
    student_id: string;
    session_id: string;
    status: string;
    student_name: string | null;
    student_alias: string | null;
}

interface EnrolledStudent {
    id: string;
    user_id: string;
    student_name: string | null;
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
    const [topic, setTopic] = useState("");
    const [location, setLocation] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Attendance state
    const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

    const canManage = role === "teacher" || role === "admin";

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
                body: JSON.stringify({ course_id: courseId, topic: topic.trim(), location: location.trim() || undefined }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            setTopic("");
            setLocation("");
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
                setAttendanceRecords(data.attendance || []);
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

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                </div>
            )}

            {/* Start Session Form (teacher only) */}
            {canManage && !activeSession && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-white mb-3">Start a New Session</h3>
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-zinc-500 mb-1">Topic / Description</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="What is this session about?"
                            />
                        </div>
                        <div className="w-40">
                            <label className="block text-xs text-zinc-500 mb-1">Location (optional)</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="Room 101"
                            />
                        </div>
                        <button
                            onClick={handleStartSession}
                            disabled={loading}
                            className="px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                        >
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
                                Started {new Date(activeSession.started_at).toLocaleTimeString()}
                                {activeSession.location && ` -- ${activeSession.location}`}
                            </p>
                        </div>
                        {canManage && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => loadAttendance(activeSession.id)}
                                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                                >
                                    Mark Attendance
                                </button>
                                <button
                                    onClick={() => handleEndSession(activeSession.id)}
                                    className="px-4 py-2 text-sm bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
                                >
                                    End Session
                                </button>
                                <button
                                    onClick={() => handleCancelSession(activeSession.id)}
                                    className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Attendance Panel */}
            {attendanceSessionId && canManage && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-white">Attendance</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleMarkAll("present")}
                                className="px-3 py-1 text-xs bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors"
                            >
                                Mark All Present
                            </button>
                            <button
                                onClick={() => handleMarkAll("absent")}
                                className="px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                            >
                                Mark All Absent
                            </button>
                            <button
                                onClick={() => setAttendanceSessionId(null)}
                                className="px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {enrolledStudents.length === 0 ? (
                            <p className="text-zinc-500 text-sm">No enrolled students.</p>
                        ) : (
                            enrolledStudents.map((student) => {
                                const status = attendanceMap[student.user_id] || "absent";
                                return (
                                    <div
                                        key={student.user_id}
                                        className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-zinc-800/50 cursor-pointer"
                                        onClick={() => handleToggleStudent(student.user_id)}
                                    >
                                        <span className="text-sm text-zinc-300">{student.student_name || "Unknown"}</span>
                                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status === "present"
                                                ? "bg-emerald-900/30 text-emerald-400"
                                                : "bg-red-900/30 text-red-400"
                                            }`}>
                                            {status}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
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
                                className={`px-5 py-4 flex items-center justify-between ${i > 0 ? "border-t border-zinc-800" : ""} hover:bg-zinc-800/30`}
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
                                            <span>{new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                            {session.location && <span>{session.location}</span>}
                                            {session.is_cancelled && <span className="text-red-400">Cancelled</span>}
                                            {session.ended_at && !session.is_cancelled && (
                                                <span>Ended {new Date(session.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {canManage && !session.ended_at && !session.is_cancelled && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => loadAttendance(session.id)}
                                            className="text-xs text-indigo-400 hover:text-indigo-300"
                                        >
                                            Attendance
                                        </button>
                                    </div>
                                )}
                                {canManage && session.ended_at && (
                                    <button
                                        onClick={() => loadAttendance(session.id)}
                                        className="text-xs text-zinc-400 hover:text-white"
                                    >
                                        View Attendance
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
