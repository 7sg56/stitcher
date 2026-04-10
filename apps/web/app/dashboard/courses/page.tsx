"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

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
}

interface Enrollment {
    id: string;
    course_id: string;
    status: string;
}

interface Teacher {
    id: string;
    real_name: string | null;
    teacher_title: string | null;
}

export default function CoursesPage() {
    const router = useRouter();
    const { getToken } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [role, setRole] = useState<string>("student");
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<string | null>(null);
    const [passkey, setPasskey] = useState("");
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [formData, setFormData] = useState({
        name: "", code: "", semester_number: 1, department: "", teacher_id: "", class_name: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const fetchData = useCallback(async () => {
        const token = await getToken();
        if (!token) return;

        try {
            const [coursesRes, meRes] = await Promise.all([
                fetch(`${apiUrl}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            if (coursesRes.ok) {
                const data = await coursesRes.json();
                setCourses(data.courses || []);
            }

            if (meRes.ok) {
                const meData = await meRes.json();
                const userRole = meData.user?.role?.name || "student";
                setRole(userRole);

                // Fetch teachers list for admin course creation
                if (userRole === "admin" || userRole === "teacher") {
                    const teachersRes = await fetch(`${apiUrl}/users/teachers`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (teachersRes.ok) {
                        const tData = await teachersRes.json();
                        setTeachers(tData.teachers || []);
                    }
                }
            }

            const enrollRes = await fetch(`${apiUrl}/enrollment/my`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (enrollRes.ok) {
                const enrollData = await enrollRes.json();
                setEnrollments(enrollData.enrollments || []);
            }
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    }, [getToken, apiUrl]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const isEnrolled = (courseId: string) =>
        enrollments.some((e) => e.course_id === courseId && e.status === "active");

    async function handlePasskeyEnroll(e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token || !passkey.trim()) return;

        try {
            const res = await fetch(`${apiUrl}/enrollment/passkey`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ passkey: passkey.trim().toUpperCase() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); setSuccess(null); return; }
            setError(null);
            setSuccess("Enrolled successfully!");
            setPasskey("");
            await fetchData();
        } catch { setError("Failed to enroll"); }
    }

    async function handleCreateCourse(e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/courses`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...formData,
                    department: formData.department || undefined,
                    teacher_id: formData.teacher_id || undefined,
                    class_name: formData.class_name || undefined,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to create course");
                return;
            }
            setError(null);
            setShowCreateForm(false);
            setFormData({ name: "", code: "", semester_number: 1, department: "", teacher_id: "", class_name: "" });
            await fetchData();
        } catch { setError("Failed to create course"); }
    }

    async function handleUpdateCourse(courseId: string, e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/courses/${courseId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: formData.name,
                    code: formData.code,
                    semester_number: formData.semester_number,
                    department: formData.department || null,
                    teacher_id: formData.teacher_id || null,
                    class_name: formData.class_name || null,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to update course");
                return;
            }
            setError(null);
            setEditingCourse(null);
            await fetchData();
        } catch { setError("Failed to update course"); }
    }

    async function handleDeleteCourse(courseId: string) {
        if (!confirm("Are you sure you want to delete this course? This will remove all subjects, units, and enrollments.")) return;
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/courses/${courseId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to delete course");
                return;
            }
            setError(null);
            await fetchData();
        } catch { setError("Failed to delete course"); }
    }

    async function handleToggleActive(courseId: string) {
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/courses/${courseId}/toggle`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to toggle course status");
                return;
            }
            await fetchData();
        } catch { setError("Failed to toggle course status"); }
    }

    function startEditing(course: Course) {
        setEditingCourse(course.id);
        setFormData({
            name: course.name,
            code: course.code,
            semester_number: course.semester_number,
            department: course.department || "",
            teacher_id: course.teacher_id || "",
            class_name: course.class_name || "",
        });
    }

    if (loading) {
        return (
            <div className="flex flex-col w-full min-h-screen bg-background">
                <PageHeader title="Courses" roleName={role} />
                <main className="w-full max-w-6xl mx-auto p-4 sm:px-6 lg:px-8 py-8 space-y-4">
                    <div className="bg-card border border-border rounded-xl p-8 animate-pulse">
                        <div className="h-6 w-1/4 bg-muted rounded mb-4" />
                        <div className="h-4 w-1/2 bg-muted rounded mb-2" />
                    </div>
                    <div className="bg-card border border-border rounded-xl p-8 animate-pulse">
                        <div className="h-6 w-1/4 bg-muted rounded mb-4" />
                        <div className="h-4 w-1/2 bg-muted rounded mb-2" />
                    </div>
                </main>
            </div>
        );
    }

    const canManage = role === "admin" || role === "teacher";

    return (
        <div className="flex flex-col w-full min-h-screen bg-background">
            <PageHeader
                title="Courses"
                roleName={role}
                breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}
                action={canManage ? (
                    <button
                        onClick={() => { setShowCreateForm(!showCreateForm); setEditingCourse(null); }}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-md"
                    >
                        {showCreateForm ? "Cancel" : "+ New Course"}
                    </button>
                ) : undefined}
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

                {/* Student: Join by Passkey */}
                {role === "student" && (
                    <div className="mb-8 bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-3">Join a Course</h2>
                        <p className="text-muted-foreground text-sm mb-4">Enter the 6-character passkey shared by your teacher.</p>
                        <form onSubmit={handlePasskeyEnroll} className="flex gap-3">
                            <input
                                type="text"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="w-40 px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground text-center font-mono text-lg tracking-widest focus:outline-none focus:border-ring uppercase"
                                placeholder="ABCD12"
                                required
                            />
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary text-primary-foreground transition-colors"
                            >
                                Join
                            </button>
                        </form>
                    </div>
                )}

                {/* Create Course Form */}
                {showCreateForm && canManage && (
                    <div className="mb-8 bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Create New Course</h2>
                        <form onSubmit={handleCreateCourse} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Course Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="e.g. Computer Networks" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Course Code</label>
                                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="e.g. CS401" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Semester</label>
                                <input type="number" value={formData.semester_number} onChange={(e) => setFormData({ ...formData, semester_number: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" min={1} required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Department</label>
                                <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="e.g. Computer Science" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Class Name</label>
                                <input type="text" value={formData.class_name} onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="e.g. 10th Grade" />
                            </div>
                            {role === "admin" && teachers.length > 0 && (
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Assign Teacher</label>
                                    <select value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring">
                                        <option value="">-- Unassigned (Select Teacher) --</option>
                                        {teachers.map((t) => (
                                            <option key={t.id} value={t.id}>{t.real_name || "Unnamed"} {t.teacher_title ? `(${t.teacher_title})` : ""}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="sm:col-span-2">
                                <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary text-primary-foreground transition-colors">
                                    Create Course
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Course List */}
                {courses.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <p className="text-lg">No courses available yet.</p>
                        {role === "student" && <p className="text-sm mt-2">Ask your teacher for a course passkey to join.</p>}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {courses.map((course) => (
                            <div key={course.id} className="bg-card border border-border rounded-xl p-5 hover:border-border transition-colors">
                                {editingCourse === course.id ? (
                                    /* Edit Form */
                                    <form onSubmit={(e) => handleUpdateCourse(course.id, e)} className="space-y-3">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" required />
                                            <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                                className="px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" required />
                                            <input type="text" value={formData.class_name} onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                                                className="px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring" placeholder="Class Name" />
                                            {role === "admin" && teachers.length > 0 && (
                                                <div className="sm:col-span-3 mt-1">
                                                    <select value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                                                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring">
                                                        <option value="">-- Unassigned --</option>
                                                        {teachers.map((t) => (
                                                            <option key={t.id} value={t.id}>{t.real_name || "Unnamed"} {t.teacher_title ? `(${t.teacher_title})` : ""}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="submit" className="px-4 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary text-primary-foreground">Save</button>
                                            <button type="button" onClick={() => setEditingCourse(null)} className="px-4 py-1.5 text-muted-foreground border border-border text-xs rounded-lg hover:bg-muted">Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    /* Display */
                                    <div className="flex items-start justify-between">
                                        <div onClick={() => router.push(`/dashboard/courses/${course.id}`)} className="flex-1 group cursor-pointer relative block">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-foreground font-semibold group-hover:text-primary transition-colors">{course.name}</h3>
                                                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{course.code}</span>
                                                {!course.is_active && <span className="text-xs text-warning bg-warning/20 px-2 py-0.5 rounded">Enrollment Closed</span>}
                                                {isEnrolled(course.id) && <span className="text-xs text-success bg-success/20 px-2 py-0.5 rounded">Enrolled</span>}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                {course.class_name && <><span className="text-foreground">{course.class_name}</span><span className="text-muted-foreground">|</span></>}
                                                <span>Semester {course.semester_number}</span>
                                                {course.department && <><span className="text-muted-foreground">|</span><span>{course.department}</span></>}
                                                {course.teacher_name ? (
                                                    <div className="flex items-center gap-1 relative z-10 pointer-events-auto">
                                                        <span className="text-muted-foreground mr-3">|</span>
                                                        {course.teacher_id ? (
                                                            <Link
                                                                href={`/dashboard/teachers/${course.teacher_id}`}
                                                                className="text-primary hover:text-primary hover:underline transition-colors"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {course.teacher_name}{course.teacher_title ? ` (${course.teacher_title})` : ""}
                                                            </Link>
                                                        ) : (
                                                            <span>{course.teacher_name}{course.teacher_title ? ` (${course.teacher_title})` : ""}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <><span className="text-muted-foreground">|</span><span className="italic text-muted-foreground">Unassigned</span></>
                                                )}
                                            </div>
                                            {canManage && course.passkey && (
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    Passkey: <span className="font-mono text-primary bg-muted px-2 py-0.5 rounded select-all">{course.passkey}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            {canManage && (
                                                <>
                                                    <button onClick={(e) => { e.preventDefault(); startEditing(course); }} className="px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">Edit</button>
                                                    <button onClick={(e) => { e.preventDefault(); handleToggleActive(course.id); }}
                                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${course.is_active ? "text-warning border border-warning/50 hover:bg-warning/20" : "text-success border border-success/50 hover:bg-success/20"}`}>
                                                        {course.is_active ? "Close Enrollment" : "Open Enrollment"}
                                                    </button>
                                                    <button onClick={(e) => { e.preventDefault(); handleDeleteCourse(course.id); }} className="px-3 py-1.5 text-xs font-medium text-danger border border-danger/50 rounded-lg hover:bg-danger/20 transition-colors">Delete</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
