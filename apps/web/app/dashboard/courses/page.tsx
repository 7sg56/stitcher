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
}

interface Enrollment {
    id: string;
    course_id: string;
    status: string;
}

export default function CoursesPage() {
    const { getToken } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [role, setRole] = useState<string>("student");
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: "", code: "", semester_number: 1, department: "",
    });
    const [error, setError] = useState<string | null>(null);

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
                setRole(meData.user?.role?.name || "student");
            }

            // Fetch enrollments for students
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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isEnrolled = (courseId: string) =>
        enrollments.some((e) => e.course_id === courseId && e.status === "active");

    const getEnrollmentId = (courseId: string) =>
        enrollments.find((e) => e.course_id === courseId && e.status === "active")?.id;

    async function handleEnroll(courseId: string) {
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/enrollment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ course_id: courseId }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to enroll");
                return;
            }
            setError(null);
            await fetchData();
        } catch {
            setError("Failed to enroll");
        }
    }

    async function handleDrop(courseId: string) {
        const token = await getToken();
        if (!token) return;

        const enrollmentId = getEnrollmentId(courseId);
        if (!enrollmentId) return;

        try {
            const res = await fetch(`${apiUrl}/enrollment/${enrollmentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to drop");
                return;
            }
            setError(null);
            await fetchData();
        } catch {
            setError("Failed to drop enrollment");
        }
    }

    async function handleCreateCourse(e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/courses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    department: formData.department || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to create course");
                return;
            }

            setError(null);
            setShowCreateForm(false);
            setFormData({ name: "", code: "", semester_number: 1, department: "" });
            await fetchData();
        } catch {
            setError("Failed to create course");
        }
    }

    async function handleToggleActive(courseId: string) {
        const token = await getToken();
        if (!token) return;

        try {
            await fetch(`${apiUrl}/courses/${courseId}/toggle`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchData();
        } catch {
            setError("Failed to toggle course status");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isAdmin = role === "admin";
    const isTeacher = role === "teacher";
    const canManage = isAdmin || isTeacher;

    return (
        <div className="min-h-screen bg-zinc-950">
            <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm">
                            &larr; Dashboard
                        </Link>
                        <h1 className="text-lg font-semibold text-white tracking-tight">
                            Courses
                        </h1>
                    </div>
                    {canManage && (
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                        >
                            {showCreateForm ? "Cancel" : "+ New Course"}
                        </button>
                    )}
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {error && (
                    <div className="mb-6 bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {showCreateForm && canManage && (
                    <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Create New Course</h2>
                        <form onSubmit={handleCreateCourse} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                                    Course Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. Computer Networks"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                                    Course Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. CS401"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                                    Semester
                                </label>
                                <input
                                    type="number"
                                    value={formData.semester_number}
                                    onChange={(e) => setFormData({ ...formData, semester_number: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                    min={1}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                                    Department
                                </label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. Computer Science"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                                >
                                    Create Course
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {courses.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500">
                        <p className="text-lg">No courses available yet.</p>
                        {canManage && (
                            <p className="text-sm mt-2">Create your first course to get started.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <Link href={`/dashboard/courses/${course.id}`} className="flex-1 group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-white font-semibold group-hover:text-indigo-400 transition-colors">
                                                {course.name}
                                            </h3>
                                            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                                                {course.code}
                                            </span>
                                            {!course.is_active && (
                                                <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                                            <span>Semester {course.semester_number}</span>
                                            {course.department && (
                                                <>
                                                    <span className="text-zinc-700">|</span>
                                                    <span>{course.department}</span>
                                                </>
                                            )}
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2 ml-4">
                                        {role === "student" && course.is_active && (
                                            isEnrolled(course.id) ? (
                                                <button
                                                    onClick={() => handleDrop(course.id)}
                                                    className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-800 rounded-lg hover:bg-red-900/30 transition-colors"
                                                >
                                                    Drop
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleEnroll(course.id)}
                                                    className="px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-800 rounded-lg hover:bg-emerald-900/30 transition-colors"
                                                >
                                                    Enroll
                                                </button>
                                            )
                                        )}
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleToggleActive(course.id)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${course.is_active
                                                        ? "text-amber-400 border border-amber-800 hover:bg-amber-900/30"
                                                        : "text-emerald-400 border border-emerald-800 hover:bg-emerald-900/30"
                                                    }`}
                                            >
                                                {course.is_active ? "Deactivate" : "Activate"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {isEnrolled(course.id) && (
                                    <div className="mt-3 pt-3 border-t border-zinc-800">
                                        <span className="text-xs text-emerald-400 font-medium">Enrolled</span>
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
