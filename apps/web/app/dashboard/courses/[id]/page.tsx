"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Subject {
    id: string;
    course_id: string;
    name: string;
    code: string;
    unit_count: number;
}

interface Unit {
    id: string;
    subject_id: string;
    unit_number: number;
    title: string;
    description: string | null;
}

interface ExamSection {
    id: string;
    subject_id: string;
    type: string;
    year: number;
    exam_board: string | null;
}

interface Course {
    id: string;
    name: string;
    code: string;
    semester_number: number;
    department: string | null;
    is_active: boolean;
    subjects: Subject[];
}

export default function CourseDetailPage() {
    const { id } = useParams();
    const { getToken } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [role, setRole] = useState<string>("student");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Expanded subjects with their units/exam_sections
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [subjectDetails, setSubjectDetails] = useState<Record<string, { units: Unit[]; exam_sections: ExamSection[] }>>({});

    // Forms
    const [showSubjectForm, setShowSubjectForm] = useState(false);
    const [subjectForm, setSubjectForm] = useState({ name: "", code: "", unit_count: 0 });
    const [showUnitForm, setShowUnitForm] = useState<string | null>(null);
    const [unitForm, setUnitForm] = useState({ unit_number: 1, title: "", description: "" });
    const [showExamForm, setShowExamForm] = useState<string | null>(null);
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
                setRole(meData.user?.role?.name || "student");
            }
        } catch {
            setError("Failed to fetch course");
        } finally {
            setLoading(false);
        }
    }, [getToken, id, apiUrl]);

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);

    async function fetchSubjectDetails(subjectId: string) {
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/subjects/${subjectId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSubjectDetails((prev) => ({
                    ...prev,
                    [subjectId]: {
                        units: data.subject.units || [],
                        exam_sections: data.subject.exam_sections || [],
                    },
                }));
            }
        } catch {
            console.error("Failed to fetch subject details");
        }
    }

    function toggleSubject(subjectId: string) {
        if (expandedSubject === subjectId) {
            setExpandedSubject(null);
        } else {
            setExpandedSubject(subjectId);
            if (!subjectDetails[subjectId]) {
                fetchSubjectDetails(subjectId);
            }
        }
    }

    async function handleCreateSubject(e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token || !id) return;

        try {
            const res = await fetch(`${apiUrl}/subjects`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...subjectForm, course_id: id }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to create subject");
                return;
            }

            setError(null);
            setShowSubjectForm(false);
            setSubjectForm({ name: "", code: "", unit_count: 0 });
            await fetchCourse();
        } catch {
            setError("Failed to create subject");
        }
    }

    async function handleCreateUnit(subjectId: string, e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/subjects/${subjectId}/units`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...unitForm,
                    description: unitForm.description || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to create unit");
                return;
            }

            setError(null);
            setShowUnitForm(null);
            setUnitForm({ unit_number: 1, title: "", description: "" });
            await fetchSubjectDetails(subjectId);
        } catch {
            setError("Failed to create unit");
        }
    }

    async function handleCreateExamSection(subjectId: string, e: React.FormEvent) {
        e.preventDefault();
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/subjects/${subjectId}/exam-sections`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...examForm,
                    exam_board: examForm.exam_board || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to create exam section");
                return;
            }

            setError(null);
            setShowExamForm(null);
            setExamForm({ type: "mid-sem", year: new Date().getFullYear(), exam_board: "" });
            await fetchSubjectDetails(subjectId);
        } catch {
            setError("Failed to create exam section");
        }
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
                    <Link href="/dashboard/courses" className="text-indigo-400 text-sm mt-2 block hover:underline">
                        &larr; Back to Courses
                    </Link>
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
                        <Link href="/dashboard/courses" className="text-zinc-400 hover:text-white transition-colors text-sm">
                            &larr; Courses
                        </Link>
                        <h1 className="text-lg font-semibold text-white tracking-tight">
                            {course.name}
                        </h1>
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                            {course.code}
                        </span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-800 px-2.5 py-1 rounded-full">
                        {role}
                    </span>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {error && (
                    <div className="mb-6 bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                        {error}
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
                            <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Subjects</dt>
                            <dd className="mt-1 text-sm text-zinc-300">{course.subjects?.length || 0}</dd>
                        </div>
                    </div>
                </div>

                {/* Subjects Section */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Subjects</h2>
                    {canManage && (
                        <button
                            onClick={() => setShowSubjectForm(!showSubjectForm)}
                            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                        >
                            {showSubjectForm ? "Cancel" : "+ Add Subject"}
                        </button>
                    )}
                </div>

                {showSubjectForm && canManage && (
                    <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                        <form onSubmit={handleCreateSubject} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
                                <input
                                    type="text"
                                    value={subjectForm.name}
                                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Data Structures"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Code</label>
                                <input
                                    type="text"
                                    value={subjectForm.code}
                                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. CS401-DS"
                                    required
                                />
                            </div>
                            <div className="flex items-end gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Units</label>
                                    <input
                                        type="number"
                                        value={subjectForm.unit_count}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, unit_count: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                        min={0}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {(!course.subjects || course.subjects.length === 0) ? (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <p>No subjects added yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {course.subjects.map((subject) => (
                            <div key={subject.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleSubject(subject.id)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-zinc-500 transition-transform ${expandedSubject === subject.id ? "rotate-90" : ""}`}>
                                            &#9654;
                                        </span>
                                        <h3 className="text-white font-medium">{subject.name}</h3>
                                        <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                                            {subject.code}
                                        </span>
                                    </div>
                                    <span className="text-xs text-zinc-500">{subject.unit_count} units</span>
                                </button>

                                {expandedSubject === subject.id && (
                                    <div className="border-t border-zinc-800 px-5 py-4 space-y-4">
                                        {/* Units */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-medium text-zinc-400">Units</h4>
                                                {canManage && (
                                                    <button
                                                        onClick={() => setShowUnitForm(showUnitForm === subject.id ? null : subject.id)}
                                                        className="text-xs text-indigo-400 hover:text-indigo-300"
                                                    >
                                                        + Add Unit
                                                    </button>
                                                )}
                                            </div>

                                            {showUnitForm === subject.id && canManage && (
                                                <form onSubmit={(e) => handleCreateUnit(subject.id, e)} className="mb-3 flex gap-2 items-end">
                                                    <input
                                                        type="number"
                                                        value={unitForm.unit_number}
                                                        onChange={(e) => setUnitForm({ ...unitForm, unit_number: parseInt(e.target.value) || 1 })}
                                                        className="w-16 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                                                        placeholder="#"
                                                        min={1}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={unitForm.title}
                                                        onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
                                                        className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                                                        placeholder="Unit title"
                                                        required
                                                    />
                                                    <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500">
                                                        Add
                                                    </button>
                                                </form>
                                            )}

                                            {subjectDetails[subject.id]?.units.length === 0 ? (
                                                <p className="text-xs text-zinc-600">No units yet.</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {subjectDetails[subject.id]?.units.map((unit) => (
                                                        <div key={unit.id} className="flex items-center gap-2 text-sm">
                                                            <span className="text-zinc-600 font-mono text-xs w-8">U{unit.unit_number}</span>
                                                            <span className="text-zinc-300">{unit.title}</span>
                                                            {unit.description && (
                                                                <span className="text-zinc-600 text-xs">-- {unit.description}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Exam Sections */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-medium text-zinc-400">Exam Sections</h4>
                                                {canManage && (
                                                    <button
                                                        onClick={() => setShowExamForm(showExamForm === subject.id ? null : subject.id)}
                                                        className="text-xs text-indigo-400 hover:text-indigo-300"
                                                    >
                                                        + Add Exam Section
                                                    </button>
                                                )}
                                            </div>

                                            {showExamForm === subject.id && canManage && (
                                                <form onSubmit={(e) => handleCreateExamSection(subject.id, e)} className="mb-3 flex gap-2 items-end">
                                                    <select
                                                        value={examForm.type}
                                                        onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
                                                        className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="mid-sem">Mid-Sem</option>
                                                        <option value="end-sem">End-Sem</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        value={examForm.year}
                                                        onChange={(e) => setExamForm({ ...examForm, year: parseInt(e.target.value) || 2024 })}
                                                        className="w-20 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                                                        placeholder="Year"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={examForm.exam_board}
                                                        onChange={(e) => setExamForm({ ...examForm, exam_board: e.target.value })}
                                                        className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                                                        placeholder="Board (optional)"
                                                    />
                                                    <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500">
                                                        Add
                                                    </button>
                                                </form>
                                            )}

                                            {subjectDetails[subject.id]?.exam_sections.length === 0 ? (
                                                <p className="text-xs text-zinc-600">No exam sections yet.</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {subjectDetails[subject.id]?.exam_sections.map((section) => (
                                                        <div key={section.id} className="flex items-center gap-2 text-sm">
                                                            <span className="text-zinc-300 capitalize">{section.type}</span>
                                                            <span className="text-zinc-500">{section.year}</span>
                                                            {section.exam_board && (
                                                                <span className="text-zinc-600 text-xs">({section.exam_board})</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
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
