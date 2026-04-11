"use client";

import { useState, useEffect } from "react";

interface Violation {
    id: string;
    user_id: string;
    course_id: string;
    type: string;
    severity: number;
    hours_deducted: number;
    content_ref: string | null;
    student_alias: string;
    profanity_score: number;
    created_at: string;
}

interface Report {
    id: string;
    reporter_alias: string | null;
    offender_alias: string | null;
    content_type: string;
    content_text: string | null;
    reason: string | null;
    ai_classification: {
        isFlagged: boolean;
        category: string;
        confidence: number;
        reasoning: string;
    } | null;
    status: string;
    created_at: string;
}

interface ViolationsPanelProps {
    courseId: string;
    role: string;
    apiUrl: string;
    getToken: () => Promise<string | null>;
    onProfileClick?: (userId: string) => void;
}

function categoryBadgeClass(category: string): string {
    switch (category) {
        case "profanity": return "bg-warning/20 text-warning";
        case "harassment": return "bg-danger/20 text-danger";
        case "hate_speech": return "bg-danger/20 text-danger";
        case "personal_attack": return "bg-warning/20 text-warning";
        case "sexual": return "bg-danger/20 text-danger";
        case "spam": return "bg-muted text-muted-foreground";
        default: return "bg-muted text-muted-foreground";
    }
}

export default function ViolationsPanel({ courseId, role, apiUrl, getToken, onProfileClick }: ViolationsPanelProps) {
    const [violations, setViolations] = useState<Violation[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [view, setView] = useState<"violations" | "reports">("violations");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const token = await getToken();
            if (!token) return;

            try {
                const [vRes, rRes] = await Promise.all([
                    fetch(`${apiUrl}/violations/course/${courseId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${apiUrl}/reports/course/${courseId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (vRes.ok) {
                    const d = await vRes.json();
                    setViolations(d.violations || []);
                }
                if (rRes.ok) {
                    const d = await rRes.json();
                    setReports(d.reports || []);
                }
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [courseId, apiUrl, getToken]);

    if (role !== "admin" && role !== "teacher") {
        return null;
    }

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
                    <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                    <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
            </div>
        );
    }

    const flaggedReports = reports.filter((r) => r.status === "flagged");
    const dismissedReports = reports.filter((r) => r.status === "dismissed");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Moderation</h2>
                <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                    <button
                        onClick={() => setView("violations")}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === "violations" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Violations ({violations.length})
                    </button>
                    <button
                        onClick={() => setView("reports")}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === "reports" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Reports ({reports.length})
                    </button>
                </div>
            </div>

            {view === "violations" && (
                <>
                    {violations.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                            <p className="text-sm">No violations recorded.</p>
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Content</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {violations.map((v) => (
                                        <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm">
                                                {onProfileClick ? (
                                                    <button onClick={() => onProfileClick(v.user_id)} className="text-primary hover:underline font-medium">
                                                        {v.student_alias}
                                                    </button>
                                                ) : (
                                                    <span className="text-primary font-medium">{v.student_alias}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${categoryBadgeClass(v.type)}`}>
                                                    {v.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate" title={v.content_ref ?? ""}>
                                                {v.content_ref ? `"${v.content_ref.slice(0, 50)}${v.content_ref.length > 50 ? "..." : ""}"` : "--"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-mono ${v.profanity_score >= 3 ? "text-danger" : v.profanity_score >= 2 ? "text-warning" : "text-muted-foreground"}`}>
                                                    {v.profanity_score}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {new Date(v.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {view === "reports" && (
                <>
                    {reports.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                            <p className="text-sm">No reports submitted.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {flaggedReports.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-medium text-danger uppercase tracking-wide mb-2">Flagged ({flaggedReports.length})</h4>
                                    <div className="space-y-2">
                                        {flaggedReports.map((r) => (
                                            <div key={r.id} className="bg-danger/5 border border-danger/20 rounded-xl p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryBadgeClass(r.ai_classification?.category ?? "")}`}>
                                                                {r.ai_classification?.category ?? "unknown"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {r.ai_classification?.confidence ? `${Math.round(r.ai_classification.confidence * 100)}% confidence` : ""}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-foreground truncate">{r.content_text ?? "--"}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Reported by {r.reporter_alias ?? "Unknown"} | Offender: {r.offender_alias ?? "Unknown"}
                                                        </p>
                                                        {r.ai_classification?.reasoning && (
                                                            <p className="text-xs text-muted-foreground mt-1 italic">AI: {r.ai_classification.reasoning}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {new Date(r.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {dismissedReports.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Dismissed ({dismissedReports.length})</h4>
                                    <div className="space-y-2">
                                        {dismissedReports.map((r) => (
                                            <div key={r.id} className="bg-card border border-border rounded-xl p-4 opacity-60">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-foreground truncate">{r.content_text ?? "--"}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Reported by {r.reporter_alias ?? "Unknown"} | {r.reason ?? "No reason given"}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {new Date(r.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
