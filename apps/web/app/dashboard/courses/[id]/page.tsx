"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Unit {
    id: string;
    unit_number: number;
    title: string;
    description: string | null;
}

interface ExamSection {
    id: string;
    type: string;
    year: number;
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
    const [tab, setTab] = useState<"units" | "exams" | "students">("units");

    // Forms
    const [showUnitForm, setShowUnitForm] = useState(false);
    const [unitForm, setUnitForm] = useState({ unit_number: 1, title: "", description: "" });
    const [showExamForm, setShowExamForm] = useState(false);
    const [examForm, setExamForm] = useState({ type: "mid-sem", year: new Date().getFullYear(), exam_board: "" });

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
            }
        } catch {
            setError("Failed to fetch course");
        } finally {
            setLoading(false);
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
            setExamForm({ type: "mid-sem", year: new Date().getFullYear(), exam_board: "" });
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
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-zinc-400 text-lg">{error || "Course not found"}</p>
                    <Link href="/dashboard/courses" className="text-indigo-400 text-sm mt-2 block hover:underline">&larr; Back to Courses</Link>
                </div>
            </div>
        );
    }

    const canManage = role === "admin" || role === "teacher";

    return (
        <div className="min-h-screen bg-zinc-950">
            <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/courses" className="text-zinc-400 hover:text-white transition-colors text-sm">&larr; Courses</Link>
                        <h1 className="text-lg font-semibold text-white tracking-tight">{course.name}</h1>
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{course.code}</span>
                    </div>
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

                {/* Course Info */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Semester</dt>
                            <dd className="mt-1 text-sm text-zinc-300">{course.semester_number}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Department</dt>
                            <dd className="mt-1 text-sm text-zinc-300">{course.department || "N/A"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</dt>
                            <dd className={`mt-1 text-sm font-medium ${course.is_active ? "text-emerald-400" : "text-amber-400"}`}>
                                {course.is_active ? "Active" : "Inactive"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Teacher</dt>
                            <dd className="mt-1 text-sm text-zinc-300">
                                {course.teacher_name || "Not assigned"}
                                {course.teacher_title && <span className="text-zinc-500 text-xs ml-1">({course.teacher_title})</span>}
                            </dd>
                        </div>
                    </div>

                    {canManage && course.passkey && (
                        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-3">
                            <span className="text-xs text-zinc-500">Passkey:</span>
                            <span className="font-mono text-lg text-indigo-400 bg-zinc-800 px-3 py-1 rounded select-all tracking-widest">{course.passkey}</span>
                            <button onClick={handleRegeneratePasskey} className="text-xs text-zinc-500 hover:text-white transition-colors">Regenerate</button>
                            <button onClick={handleShareCourse} className="ml-auto px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">Share via Message</button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
                    <button onClick={() => setTab("units")}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === "units" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}>
                        Units ({course.units?.length || 0})
                    </button>
                    <button onClick={() => setTab("exams")}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === "exams" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}>
                        Exams ({course.exam_sections?.length || 0})
                    </button>
                    <button onClick={() => setTab("students")}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === "students" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}>
                        Students ({enrolledStudents.length})
                    </button>
                </div>

                {/* Units Tab */}
                {tab === "units" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Units</h2>
                            {canManage && (
                                <button onClick={() => setShowUnitForm(!showUnitForm)}
                                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                                    {showUnitForm ? "Cancel" : "+ Add Unit"}
                                </button>
                            )}
                        </div>

                        {showUnitForm && canManage && (
                            <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                                <form onSubmit={handleAddUnit} className="flex gap-3 items-end">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Unit #</label>
                                        <input type="number" value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: parseInt(e.target.value) || 1 })}
                                            className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" min={1} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Title</label>
                                        <input type="text" value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Introduction to Networking" required />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Description (optional)</label>
                                        <input type="text" value={unitForm.description} onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="Brief description" />
                                    </div>
                                    <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500">Add</button>
                                </form>
                            </div>
                        )}

                        {(!course.units || course.units.length === 0) ? (
                            <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                                <p>No units added yet.</p>
                            </div>
                        ) : (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                {course.units.map((unit, i) => (
                                    <div key={unit.id} className={`px-5 py-4 flex items-center justify-between ${i > 0 ? "border-t border-zinc-800" : ""} hover:bg-zinc-800/30`}>
                                        <div className="flex items-center gap-4">
                                            <span className="text-indigo-400 font-mono text-sm font-semibold w-10">U{unit.unit_number}</span>
                                            <div>
                                                <p className="text-white font-medium">{unit.title}</p>
                                                {unit.description && <p className="text-zinc-500 text-sm mt-0.5">{unit.description}</p>}
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button onClick={() => handleDeleteUnit(unit.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
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
                            <h2 className="text-lg font-semibold text-white">Exam Sections</h2>
                            {canManage && (
                                <button onClick={() => setShowExamForm(!showExamForm)}
                                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                                    {showExamForm ? "Cancel" : "+ Add Exam Section"}
                                </button>
                            )}
                        </div>

                        {showExamForm && canManage && (
                            <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                                <form onSubmit={handleAddExamSection} className="flex gap-3 items-end">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Type</label>
                                        <select value={examForm.type} onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
                                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
                                            <option value="mid-sem">Mid-Sem</option>
                                            <option value="end-sem">End-Sem</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Year</label>
                                        <input type="number" value={examForm.year} onChange={(e) => setExamForm({ ...examForm, year: parseInt(e.target.value) || 2024 })}
                                            className="w-24 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Board (optional)</label>
                                        <input type="text" value={examForm.exam_board} onChange={(e) => setExamForm({ ...examForm, exam_board: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. University Board" />
                                    </div>
                                    <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500">Add</button>
                                </form>
                            </div>
                        )}

                        {(!course.exam_sections || course.exam_sections.length === 0) ? (
                            <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                                <p>No exam sections added yet.</p>
                            </div>
                        ) : (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                {course.exam_sections.map((section, i) => (
                                    <div key={section.id} className={`px-5 py-4 flex items-center justify-between ${i > 0 ? "border-t border-zinc-800" : ""} hover:bg-zinc-800/30`}>
                                        <div className="flex items-center gap-4">
                                            <span className="text-emerald-400 font-medium capitalize">{section.type}</span>
                                            <span className="text-zinc-400 text-sm">{section.year}</span>
                                            {section.exam_board && <span className="text-zinc-500 text-sm">({section.exam_board})</span>}
                                        </div>
                                        {canManage && (
                                            <button onClick={() => handleDeleteExamSection(section.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
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
                        <h2 className="text-lg font-semibold text-white mb-4">Enrolled Students</h2>
                        {enrolledStudents.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                                <p>No students enrolled yet.</p>
                                {canManage && <p className="text-sm mt-1">Share the passkey with your students.</p>}
                            </div>
                        ) : (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            {role === "admin" && <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Alias</th>}
                                            <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                                            <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Enrolled</th>
                                            {canManage && <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {enrolledStudents.map((student) => (
                                            <tr key={student.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
                                                {role === "admin" && <td className="px-5 py-3 text-sm text-indigo-400 font-medium">{student.student_alias || "--"}</td>}
                                                <td className="px-5 py-3 text-sm text-zinc-300">{student.student_name || "--"}</td>
                                                <td className="px-5 py-3 text-sm text-zinc-500">{new Date(student.enrolled_at).toLocaleDateString()}</td>
                                                {canManage && (
                                                    <td className="px-5 py-3 text-right">
                                                        <button onClick={() => handleRemoveStudent(student.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
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
            </main>
        </div>
    );
}
