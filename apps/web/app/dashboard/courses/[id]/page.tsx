"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import SessionsPanel from "./SessionsPanel";
import DoubtsPanel from "./DoubtsPanel";
import ResourcesPanel from "./ResourcesPanel";


interface Unit {
    id: string;
    unit_number: number;
    title: string;
    description: string | null;
}

interface ExamSection {
    id: string;
    type: string;
    date: string | null;
    description: string | null;
    exam_board: string | null;
}

interface EnrolledStudent {
    id: string;
    user_id: string;
    student_name: string | null;
    student_alias: string | null;
    enrolled_at: string;
}

interface Course {
    id: string;
    name: string;
    code: string;
    semester_number: number;
    department: string | null;
    is_active: boolean;
    passkey?: string;
    teacher_id: string | null;
    teacher_name: string | null;
    teacher_title: string | null;
    class_name: string | null;
    units: Unit[];
    exam_sections: ExamSection[];
}

export default function CourseDetailPage() {
    const { id } = useParams();
    const { getToken } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [role, setRole] = useState<string>("student");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
    const [tab, setTab] = useState<"units" | "exams" | "students" | "sessions" | "doubts" | "resources">("units");

    // Phase 3+4 data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [sessions, setSessions] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [activeSession, setActiveSession] = useState<any>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [doubtThreads, setDoubtThreads] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [resources, setResources] = useState<any[]>([]);


    // Forms
    const [showUnitForm, setShowUnitForm] = useState(false);
    const [unitForm, setUnitForm] = useState({ unit_number: 1, title: "", description: "" });
    const [showExamForm, setShowExamForm] = useState(false);
    const [examForm, setExamForm] = useState({ type: "", date: "", description: "", exam_board: "" });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const fetchCourse = useCallback(async () => {
        const token = await getToken();
        if (!token || !id) return;

        try {
            const [courseRes, meRes] = await Promise.all([
                fetch(`${apiUrl}/courses/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            if (courseRes.ok) {
                const data = await courseRes.json();
                setCourse(data.course);
            } else {
                setError("Course not found");
            }

            if (meRes.ok) {
                const meData = await meRes.json();
                const userRole = meData.user?.role?.name || "student";
                setRole(userRole);

                const enrollRes = await fetch(`${apiUrl}/enrollment/course/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (enrollRes.ok) {
                    const eData = await enrollRes.json();
                    setEnrolledStudents(eData.enrollments || []);
                }

                const [sessionsRes, activeRes, doubtsRes, resourcesRes] = await Promise.all([
                    fetch(`${apiUrl}/sessions/course/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${apiUrl}/sessions/active/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${apiUrl}/doubts/threads/course/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${apiUrl}/resources/course/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                if (sessionsRes.ok) { const d = await sessionsRes.json(); setSessions(d.sessions || []); }
                if (activeRes.ok) { const d = await activeRes.json(); setActiveSession(d.session || null); }
                if (doubtsRes.ok) { const d = await doubtsRes.json(); setDoubtThreads(d.threads || []); }
                if (resourcesRes.ok) { const d = await resourcesRes.json(); setResources(d.resources || []); }

            }
        } catch {
            setError("Failed to fetch course");
        } finally {
            setLoading(false);
        }
    }, [getToken, id, apiUrl]);

    const refreshDoubts = useCallback(async () => {
        const token = await getToken();
        if (!token || !id) return;
        const res = await fetch(`${apiUrl}/doubts/threads/course/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const d = await res.json();
            setDoubtThreads(d.threads || []);
        }
    }, [getToken, id, apiUrl]);

    useEffect(() => { fetchCourse(); }, [fetchCourse]);

    async function handleRemoveStudent(enrollmentId: string) {
        if (!confirm("Remove this student from the course?")) return;
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/enrollment/manage/${enrollmentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) { const data = await res.json(); setError(data.error); return; }
            await fetchCourse();
        } catch { setError("Failed to remove student"); }
    }

    async function handleAddUnit(e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token || !id) return;
        try {
            const res = await fetch(`${apiUrl}/courses/${id}/units`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...unitForm, description: unitForm.description || undefined }),
            });
            if (!res.ok) { const data = await res.json(); setError(data.error); return; }
            setShowUnitForm(false);
            setUnitForm({ unit_number: 1, title: "", description: "" });
            await fetchCourse();
        } catch { setError("Failed to add unit"); }
    }

    async function handleDeleteUnit(unitId: string) {
        if (!confirm("Delete this unit?")) return;
        const token = await getToken();
        if (!token || !id) return;
        try {
            await fetch(`${apiUrl}/courses/${id}/units/${unitId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchCourse();
        } catch { setError("Failed to delete unit"); }
    }

    async function handleAddExamSection(e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token || !id) return;
        try {
            const res = await fetch(`${apiUrl}/courses/${id}/exam-sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...examForm, exam_board: examForm.exam_board || undefined }),
            });
            if (!res.ok) { const data = await res.json(); setError(data.error); return; }
            setShowExamForm(false);
            setExamForm({ type: "", date: "", description: "", exam_board: "" });
            await fetchCourse();
        } catch { setError("Failed to add exam section"); }
    }

    async function handleDeleteExamSection(sectionId: string) {
        if (!confirm("Delete this exam section?")) return;
        const token = await getToken();
        if (!token || !id) return;
        try {
            await fetch(`${apiUrl}/courses/${id}/exam-sections/${sectionId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchCourse();
        } catch { setError("Failed to delete exam section"); }
    }

    async function handleRegeneratePasskey() {
        const token = await getToken();
        if (!token || !id) return;
        try {
            const res = await fetch(`${apiUrl}/courses/${id}/passkey`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) await fetchCourse();
        } catch { setError("Failed to regenerate passkey"); }
    }

    function handleShareCourse() {
        if (!course) return;
        const classNameStr = course.class_name ? ` (${course.class_name})` : "";
        const teacherStr = course.teacher_name || "your teacher";
        const titleStr = course.teacher_title ? ` (${course.teacher_title})` : "";
        const msg = `Join my class "${course.name}"${classNameStr} taught by ${teacherStr}${titleStr}. Access code: ${course.passkey}`;
        navigator.clipboard.writeText(msg).then(() => {
            setSuccess("Share message copied to clipboard!");
            setTimeout(() => setSuccess(null), 3000);
        }).catch(() => {
            setError("Failed to copy to clipboard");
        });
    }

    if (loading) {
        return (
            <div className="flex flex-col w-full min-h-screen bg-background">
                <PageHeader title="Loading Course..." roleName={role} />
                <main className="w-full max-w-6xl mx-auto p-4 sm:px-6 lg:px-8 py-8 space-y-4">
                    <div className="bg-card border border-border rounded-xl p-8 animate-pulse">
                        <div className="h-6 w-1/4 bg-muted rounded mb-4" />
                        <div className="h-4 w-1/2 bg-muted rounded mb-2" />
                    </div>
                </main>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground text-lg">{error || "Course not found"}</p>
                    <Link href="/dashboard/courses" className="text-primary text-sm mt-2 block hover:underline">&larr; Back to Courses</Link>
                </div>
            </div>
        );
    }

    const canManage = role === "admin" || role === "teacher";

    return (
        <div className="flex flex-col w-full min-h-screen bg-background">
            <PageHeader
                title={course.name}
                roleName={role}
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Courses", href: "/dashboard/courses" }
                ]}
            />

            <main className="w-full max-w-6xl mx-auto p-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-4 bg-danger/20 border border-danger/50 text-danger px-4 py-3 rounded-lg text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="ml-3 text-danger hover:text-danger">&times;</button>
                    </div>
                )}
                {success && (
                    <div className="mb-4 bg-success/20 border border-success/50 text-success px-4 py-3 rounded-lg text-sm">
                        {success}
                        <button onClick={() => setSuccess(null)} className="ml-3 text-success hover:text-success/80">&times;</button>
                    </div>
                )}

                {/* Course Info */}
                <div className="bg-card border border-border rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Semester</dt>
                            <dd className="mt-1 text-sm text-foreground">{course.semester_number}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</dt>
                            <dd className="mt-1 text-sm text-foreground">{course.department || "N/A"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</dt>
                            <dd className={`mt-1 text-sm font-medium ${course.is_active ? "text-success" : "text-warning"}`}>
                                {course.is_active ? "Active" : "Inactive"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Teacher</dt>
                            <dd className="mt-1 text-sm text-foreground">
                                {course.teacher_id && course.teacher_name ? (
                                    <Link href={`/dashboard/teachers/${course.teacher_id}`} className="text-primary hover:text-primary hover:underline transition-colors block w-fit">
                                        {course.teacher_name}
                                        {course.teacher_title && <span className="text-muted-foreground text-xs ml-1">({course.teacher_title})</span>}
                                    </Link>
                                ) : (
                                    <>
                                        {course.teacher_name || "Not assigned"}
                                        {course.teacher_title && <span className="text-muted-foreground text-xs ml-1">({course.teacher_title})</span>}
                                    </>
                                )}
                            </dd>
                        </div>
                    </div>

                    {canManage && course.passkey && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">Passkey:</span>
                            <span className="font-mono text-lg text-primary bg-muted px-3 py-1 rounded select-all tracking-widest">{course.passkey}</span>
                            <button onClick={handleRegeneratePasskey} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Regenerate</button>
                            <button onClick={handleShareCourse} className="ml-auto px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary text-primary-foreground transition-colors">Share via Message</button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit flex-wrap">
                    {([
                        { key: "units", label: `Units (${course.units?.length || 0})` },
                        { key: "exams", label: `Exams (${course.exam_sections?.length || 0})` },
                        { key: "students", label: `Students (${enrolledStudents.length})` },
                        { key: "sessions", label: `Sessions (${sessions.length})` },
                        { key: "resources", label: "Resources" },
                        { key: "doubts", label: `Doubts (${doubtThreads.length})` },
                    ] as const).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === t.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Units Tab */}
                {tab === "units" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Units</h2>
                            {canManage && (
                                <button onClick={() => setShowUnitForm(!showUnitForm)}
                                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary text-primary-foreground transition-colors">
                                    {showUnitForm ? "Cancel" : "+ Add Unit"}
                                </button>
                            )}
                        </div>

                        {showUnitForm && canManage && (
                            <div className="mb-4 bg-card border border-border rounded-xl p-5">
                                <form onSubmit={handleAddUnit} className="flex gap-3 items-end">
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Unit #</label>
                                        <input type="number" value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: parseInt(e.target.value) || 1 })}
                                            className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" min={1} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-muted-foreground mb-1">Title</label>
                                        <input type="text" value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="e.g. Introduction to Networking" required />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-muted-foreground mb-1">Description (optional)</label>
                                        <input type="text" value={unitForm.description} onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="Brief description" />
                                    </div>
                                    <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary text-primary-foreground">Add</button>
                                </form>
                            </div>
                        )}

                        {(!course.units || course.units.length === 0) ? (
                            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                                <p>No units added yet.</p>
                            </div>
                        ) : (
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                {course.units.map((unit, i) => (
                                    <div key={unit.id} className={`px-5 py-4 flex items-center justify-between ${i > 0 ? "border-t border-border" : ""} hover:bg-muted`}>
                                        <div className="flex items-center gap-4">
                                            <span className="text-primary font-mono text-sm font-semibold w-10">U{unit.unit_number}</span>
                                            <div>
                                                <p className="text-foreground font-medium">{unit.title}</p>
                                                {unit.description && <p className="text-muted-foreground text-sm mt-0.5">{unit.description}</p>}
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button onClick={() => handleDeleteUnit(unit.id)} className="text-xs text-danger hover:text-danger">Delete</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Exams Tab */}
                {tab === "exams" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Exam Sections</h2>
                            {canManage && (
                                <button onClick={() => setShowExamForm(!showExamForm)}
                                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary text-primary-foreground transition-colors">
                                    {showExamForm ? "Cancel" : "+ Add Exam Section"}
                                </button>
                            )}
                        </div>

                        {showExamForm && canManage && (
                            <div className="mb-4 bg-card border border-border rounded-xl p-5">
                                <form onSubmit={handleAddExamSection} className="flex flex-wrap gap-3 items-end">
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Type</label>
                                        <input type="text" value={examForm.type} onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
                                            className="w-24 px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="e.g. MCQ" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Date</label>
                                        <input type="date" value={examForm.date} onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                                            className="w-36 px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" required />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs text-muted-foreground mb-1">Description (optional)</label>
                                        <input type="text" value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="e.g. Chapter 1-3" />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs text-muted-foreground mb-1">Board (optional)</label>
                                        <input type="text" value={examForm.exam_board} onChange={(e) => setExamForm({ ...examForm, exam_board: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="e.g. University Board" />
                                    </div>
                                    <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary text-primary-foreground">Add</button>
                                </form>
                            </div>
                        )}

                        {(!course.exam_sections || course.exam_sections.length === 0) ? (
                            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                                <p>No exam sections added yet.</p>
                            </div>
                        ) : (
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                {course.exam_sections.map((section, i) => (
                                    <div key={section.id} className={`px-5 py-4 flex items-center justify-between ${i > 0 ? "border-t border-border" : ""} hover:bg-muted`}>
                                        <div className="flex items-center gap-4">
                                            <span className="text-success font-medium capitalize">{section.type}</span>
                                            {section.date && <span className="text-muted-foreground text-sm">{new Date(section.date).toLocaleDateString()}</span>}
                                            {section.description && <span className="text-muted-foreground text-sm">{section.description}</span>}
                                            {section.exam_board && <span className="text-muted-foreground text-sm italic">({section.exam_board})</span>}
                                        </div>
                                        {canManage && (
                                            <button onClick={() => handleDeleteExamSection(section.id)} className="text-xs text-danger hover:text-danger">Delete</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Students Tab */}
                {tab === "students" && (
                    <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4">Enrolled Students</h2>
                        {enrolledStudents.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                                <p>No students enrolled yet.</p>
                                {canManage && <p className="text-sm mt-1">Share the passkey with your students.</p>}
                            </div>
                        ) : (
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            {role === "admin" && <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Alias</th>}
                                            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Enrolled</th>
                                            {canManage && <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {enrolledStudents.map((student) => (
                                            <tr key={student.id} className="border-b border-border/50 last:border-0 hover:bg-muted">
                                                {role === "admin" && <td className="px-5 py-3 text-sm text-primary font-medium">{student.student_alias || "--"}</td>}
                                                <td className="px-5 py-3 text-sm text-foreground">{student.student_name || "--"}</td>
                                                <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(student.enrolled_at).toLocaleDateString()}</td>
                                                {canManage && (
                                                    <td className="px-5 py-3 text-right">
                                                        <button onClick={() => handleRemoveStudent(student.id)} className="text-xs text-danger hover:text-danger transition-colors">Remove</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Sessions Tab */}
                {tab === "sessions" && (
                    <SessionsPanel
                        courseId={id as string}
                        role={role}
                        sessions={sessions}
                        activeSession={activeSession}
                        enrolledStudents={enrolledStudents}
                        apiUrl={apiUrl}
                        getToken={getToken}
                        onRefresh={fetchCourse}
                    />
                )}



                {/* Resources Tab */}
                {tab === "resources" && (
                    <ResourcesPanel
                        courseId={id as string}
                        role={role}
                        resources={resources}
                        units={course.units}
                        examSections={course.exam_sections}
                        apiUrl={apiUrl}
                        getToken={getToken}
                        onRefresh={fetchCourse}
                    />
                )}

                {/* Doubts Tab */}
                {tab === "doubts" && (
                    <DoubtsPanel
                        courseId={id as string}
                        role={role}
                        threads={doubtThreads}
                        apiUrl={apiUrl}
                        getToken={getToken}
                        onRefresh={refreshDoubts}
                    />
                )}
            </main>
        </div>
    );
}
