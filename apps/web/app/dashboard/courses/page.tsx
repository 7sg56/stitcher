"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

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
        name: "", code: "", semester_number: 1, department: "", teacher_id: "",
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
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to create course");
                return;
            }
            setError(null);
            setShowCreateForm(false);
            setFormData({ name: "", code: "", semester_number: 1, department: "", teacher_id: "" });
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
        });
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const canManage = role === "admin" || role === "teacher";

    return (
        <div className="min-h-screen bg-zinc-950">
            <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm">
                            &larr; Dashboard
                        </Link>
                        <h1 className="text-lg font-semibold text-white tracking-tight">Courses</h1>
                    </div>
                    {canManage && (
                        <button
                            onClick={() => { setShowCreateForm(!showCreateForm); setEditingCourse(null); }}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                        >
                            {showCreateForm ? "Cancel" : "+ New Course"}
                        </button>
                    )}
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {error && (
                    <div className="mb-4 bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                    </div>
                )}
                {success && (
                    <div className="mb-4 bg-emerald-900/30 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-lg text-sm">
                        {success}
                        <button onClick={() => setSuccess(null)} className="ml-3 text-emerald-400 hover:text-emerald-200">&times;</button>
                    </div>
                )}

                {/* Student: Join by Passkey */}
                {role === "student" && (
                    <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-3">Join a Course</h2>
                        <p className="text-zinc-400 text-sm mb-4">Enter the 6-character passkey shared by your teacher.</p>
                        <form onSubmit={handlePasskeyEnroll} className="flex gap-3">
                            <input
                                type="text"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="w-40 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-indigo-500 uppercase"
                                placeholder="ABCD12"
                                required
                            />
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                            >
                                Join
                            </button>
                        </form>
                    </div>
                )}

                {/* Create Course Form */}
                {showCreateForm && canManage && (
                    <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Create New Course</h2>
                        <form onSubmit={handleCreateCourse} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Course Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Computer Networks" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Course Code</label>
                                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. CS401" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Semester</label>
                                <input type="number" value={formData.semester_number} onChange={(e) => setFormData({ ...formData, semester_number: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" min={1} required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Department</label>
                                <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Computer Science" />
                            </div>
                            {role === "admin" && teachers.length > 0 && (
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Assign Teacher</label>
                                    <select value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
                                        <option value="">-- Select Teacher --</option>
                                        {teachers.map((t) => (
                                            <option key={t.id} value={t.id}>{t.real_name || "Unnamed"} {t.teacher_title ? `(${t.teacher_title})` : ""}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="sm:col-span-2">
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors">
                                    Create Course
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Course List */}
                {courses.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500">
                        <p className="text-lg">No courses available yet.</p>
                        {role === "student" && <p className="text-sm mt-2">Ask your teacher for a course passkey to join.</p>}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {courses.map((course) => (
                            <div key={course.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                                {editingCourse === course.id ? (
                                    /* Edit Form */
                                    <form onSubmit={(e) => handleUpdateCourse(course.id, e)} className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" required />
                                            <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" required />
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500">Save</button>
                                            <button type="button" onClick={() => setEditingCourse(null)} className="px-4 py-1.5 text-zinc-400 border border-zinc-700 text-xs rounded-lg hover:bg-zinc-800">Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    /* Display */
                                    <div className="flex items-start justify-between">
                                        <Link href={`/dashboard/courses/${course.id}`} className="flex-1 group">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-white font-semibold group-hover:text-indigo-400 transition-colors">{course.name}</h3>
                                                <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{course.code}</span>
                                                {!course.is_active && <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">Enrollment Closed</span>}
                                                {isEnrolled(course.id) && <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">Enrolled</span>}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                                                <span>Semester {course.semester_number}</span>
                                                {course.department && <><span className="text-zinc-700">|</span><span>{course.department}</span></>}
                                                {course.teacher_name && (
                                                    <><span className="text-zinc-700">|</span><span>{course.teacher_name}{course.teacher_title ? ` (${course.teacher_title})` : ""}</span></>
                                                )}
                                            </div>
                                            {canManage && course.passkey && (
                                                <div className="mt-2 text-xs text-zinc-500">
                                                    Passkey: <span className="font-mono text-indigo-400 bg-zinc-800 px-2 py-0.5 rounded select-all">{course.passkey}</span>
                                                </div>
                                            )}
                                        </Link>
                                        <div className="flex items-center gap-2 ml-4">
                                            {canManage && (
                                                <>
                                                    <button onClick={(e) => { e.preventDefault(); startEditing(course); }} className="px-3 py-1.5 text-xs font-medium text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">Edit</button>
                                                    <button onClick={(e) => { e.preventDefault(); handleToggleActive(course.id); }}
                                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${course.is_active ? "text-amber-400 border border-amber-800 hover:bg-amber-900/30" : "text-emerald-400 border border-emerald-800 hover:bg-emerald-900/30"}`}>
                                                        {course.is_active ? "Close Enrollment" : "Open Enrollment"}
                                                    </button>
                                                    <button onClick={(e) => { e.preventDefault(); handleDeleteCourse(course.id); }} className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-800 rounded-lg hover:bg-red-900/30 transition-colors">Delete</button>
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
