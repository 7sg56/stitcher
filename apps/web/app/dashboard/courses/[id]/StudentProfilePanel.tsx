"use client";

import { useState, useEffect } from "react";

interface StudentProfile {
    alias: string;
    course: { name: string; code: string; class_name: string | null };
    attendance: { present: number; total: number; percentage: number };
    violation_count: number;
    enrolled_courses: { name: string; code: string }[];
    enrolled_at: string;
}

interface StudentProfilePanelProps {
    studentId: string;
    courseId: string;
    apiUrl: string;
    getToken: () => Promise<string | null>;
    onClose: () => void;
}

export default function StudentProfilePanel({
    studentId,
    courseId,
    apiUrl,
    getToken,
    onClose,
}: StudentProfilePanelProps) {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const token = await getToken();
            if (!token) return;
            try {
                const res = await fetch(`${apiUrl}/dashboard/student-profile/${studentId}/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error((await res.json()).error);
                const data = await res.json();
                setProfile(data.profile);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load profile");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [studentId, courseId, apiUrl, getToken]);

    return (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
            <div
                className="w-full max-w-sm bg-card border-l border-border h-full overflow-y-auto shadow-xl animate-in slide-in-from-right duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="text-base font-semibold text-foreground">Student Profile</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {loading && (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-12 w-12 rounded-full bg-muted" />
                            <div className="h-4 w-2/3 bg-muted rounded" />
                            <div className="h-3 w-1/2 bg-muted rounded" />
                            <div className="h-20 bg-muted rounded-lg" />
                        </div>
                    )}

                    {error && (
                        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    {profile && (
                        <>
                            {/* Avatar + Alias */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-base font-semibold">
                                    {profile.alias.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{profile.alias}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Enrolled {new Date(profile.enrolled_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                </div>
                            </div>

                            {/* Course Info */}
                            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Course</p>
                                <p className="text-sm font-medium text-foreground">{profile.course.name}</p>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span>{profile.course.code}</span>
                                    {profile.course.class_name && (
                                        <>
                                            <span>|</span>
                                            <span>{profile.course.class_name}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Attendance */}
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Attendance</p>
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <div className="flex items-end justify-between mb-2">
                                        <span className={`text-2xl font-bold tabular-nums ${profile.attendance.percentage >= 75 ? "text-success" :
                                            profile.attendance.percentage >= 50 ? "text-warning" : "text-danger"
                                            }`}>
                                            {profile.attendance.percentage}%
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {profile.attendance.present} / {profile.attendance.total} sessions
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${profile.attendance.percentage >= 75 ? "bg-success" :
                                                profile.attendance.percentage >= 50 ? "bg-warning" : "bg-danger"
                                                }`}
                                            style={{ width: `${profile.attendance.percentage}%` }}
                                        />
                                    </div>
                                    {profile.attendance.percentage < 75 && profile.attendance.total > 0 && (
                                        <div className="mt-3 text-xs text-muted-foreground bg-warning/10 border border-warning/20 p-2.5 rounded-md flex items-start gap-2">
                                            <svg className="w-4 h-4 text-warning shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p>
                                                Needs to attend the next <strong className="text-warning font-semibold">{Math.max(0, 3 * profile.attendance.total - 4 * profile.attendance.present)}</strong> session{Math.max(0, 3 * profile.attendance.total - 4 * profile.attendance.present) !== 1 ? 's' : ''} to reach 75%.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Violations */}
                            <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Violations</span>
                                <span className={`text-lg font-bold tabular-nums ${profile.violation_count > 0 ? "text-danger" : "text-success"}`}>
                                    {profile.violation_count}
                                </span>
                            </div>

                            {/* Enrolled Courses */}
                            {profile.enrolled_courses.length > 1 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        All Enrolled Courses ({profile.enrolled_courses.length})
                                    </p>
                                    <div className="space-y-1.5">
                                        {profile.enrolled_courses.map((c, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                                <span className="text-foreground">{c.name}</span>
                                                <span className="text-xs text-muted-foreground ml-auto">{c.code}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
