"use client";

import { useState } from "react";

interface Quiz {
    id: string;
    course_id: string;
    unit_id: string | null;
    title: string;
    description: string | null;
    duration_mins: number | null;
    is_published: boolean;
    created_at: string;
}

interface QuizOption {
    id: string;
    question_id: string;
    option_text: string;
    is_correct?: boolean;
    order_index: number;
}

interface QuizQuestion {
    id: string;
    quiz_id: string;
    question_text: string;
    question_type: string;
    points: number;
    order_index: number;
    options: QuizOption[];
}

interface QuizWithQuestions extends Quiz {
    questions: QuizQuestion[];
}

interface StudentAttempt {
    attempt_id: string;
    student_id: string;
    student_name: string | null;
    score: number | null;
    max_score: number | null;
    submitted_at: string | null;
}

interface Unit {
    id: string;
    title: string;
    unit_number: number;
}

interface QuizzesPanelProps {
    courseId: string;
    role: string;
    quizzes: Quiz[];
    units: Unit[];
    apiUrl: string;
    getToken: () => Promise<string | null>;
    onRefresh: () => Promise<void>;
}

function makeMcqOptions() {
    return [
        { option_text: "", is_correct: true },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
    ];
}

function makeTrueFalseOptions() {
    return [
        { option_text: "True", is_correct: true },
        { option_text: "False", is_correct: false },
    ];
}

export default function QuizzesPanel({
    courseId,
    role,
    quizzes,
    units,
    apiUrl,
    getToken,
    onRefresh,
}: QuizzesPanelProps) {
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [unitId, setUnitId] = useState("");
    const [durationMins, setDurationMins] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Quiz detail / attempt state
    const [selectedQuiz, setSelectedQuiz] = useState<QuizWithQuestions | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [attemptResult, setAttemptResult] = useState<{ score: number; max_score: number } | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [attemptResponses, setAttemptResponses] = useState<any[]>([]);

    // Student quiz-taking view
    const [studentQuizMode, setStudentQuizMode] = useState(false);

    // Teacher sub-tabs inside quiz detail
    const [teacherTab, setTeacherTab] = useState<"questions" | "results">("questions");
    const [studentAttempts, setStudentAttempts] = useState<StudentAttempt[]>([]);

    // Question add state
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [qText, setQText] = useState("");
    const [qType, setQType] = useState("mcq");
    const [qPoints, setQPoints] = useState("1");
    const [options, setOptions] = useState(makeMcqOptions());

    const canManage = role === "teacher" || role === "admin";
    const isStudent = role === "student";

    function handleQTypeChange(newType: string) {
        setQType(newType);
        if (newType === "true_false") {
            setOptions(makeTrueFalseOptions());
        } else if (newType === "mcq") {
            setOptions(makeMcqOptions());
        } else {
            setOptions([]);
        }
    }

    function handleCorrectChange(index: number) {
        setOptions(options.map((o, j) => ({ ...o, is_correct: j === index })));
    }

    async function handleCreateQuiz(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        const token = await getToken();
        if (!token) return;
        try {
            const body: Record<string, unknown> = { course_id: courseId, title: title.trim() };
            if (description.trim()) body.description = description.trim();
            if (unitId) body.unit_id = unitId;
            if (durationMins) body.duration_mins = parseInt(durationMins);

            const res = await fetch(`${apiUrl}/quizzes`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            setTitle("");
            setDescription("");
            setUnitId("");
            setDurationMins("");
            setShowCreate(false);
            await onRefresh();
        } catch {
            setError("Failed to create quiz");
        }
    }

    async function openQuiz(quizId: string) {
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/quizzes/${quizId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedQuiz(data.quiz);
                setAnswers({});
                setAttemptResult(null);
                setAttemptId(null);
                setAttemptResponses([]);
                setStudentQuizMode(false);
                setTeacherTab("questions");
                setStudentAttempts([]);
            }

            // Load student attempts for teacher/admin
            if (role === "teacher" || role === "admin") {
                const attRes = await fetch(`${apiUrl}/quizzes/${quizId}/attempts`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (attRes.ok) {
                    const attData = await attRes.json();
                    setStudentAttempts(attData.attempts || []);
                }
            }

            // Check if student has existing attempt
            if (isStudent) {
                const attemptRes = await fetch(`${apiUrl}/quizzes/${quizId}/my-attempt`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (attemptRes.ok) {
                    const attemptData = await attemptRes.json();
                    if (attemptData.attempt) {
                        setAttemptResult({
                            score: attemptData.attempt.score ?? 0,
                            max_score: attemptData.attempt.max_score ?? 0,
                        });
                        setAttemptResponses(attemptData.responses || []);
                    }
                }
            }
        } catch {
            setError("Failed to load quiz");
        }
    }

    async function handlePublish(quizId: string) {
        const token = await getToken();
        if (!token) return;
        try {
            await fetch(`${apiUrl}/quizzes/${quizId}/publish`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            await onRefresh();
        } catch {
            setError("Failed to publish quiz");
        }
    }

    async function handleDeleteQuiz(quizId: string) {
        if (!confirm("Delete this quiz?")) return;
        const token = await getToken();
        if (!token) return;
        try {
            await fetch(`${apiUrl}/quizzes/${quizId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedQuiz(null);
            await onRefresh();
        } catch {
            setError("Failed to delete quiz");
        }
    }

    async function handleAddQuestion(e: React.FormEvent) {
        e.preventDefault();
        if (!qText.trim() || !selectedQuiz) return;
        const token = await getToken();
        if (!token) return;

        const body: Record<string, unknown> = {
            question_text: qText.trim(),
            question_type: qType,
            points: parseInt(qPoints) || 1,
        };

        if (qType === "mcq" || qType === "true_false") {
            body.options = options
                .filter((o) => o.option_text.trim())
                .map((o, i) => ({ ...o, order_index: i }));
        }

        try {
            const res = await fetch(`${apiUrl}/quizzes/${selectedQuiz.id}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            setQText("");
            setQType("mcq");
            setQPoints("1");
            setOptions(makeMcqOptions());
            setShowAddQuestion(false);
            await openQuiz(selectedQuiz.id);
        } catch {
            setError("Failed to add question");
        }
    }

    async function handleStartAttempt() {
        if (!selectedQuiz) return;
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/quizzes/${selectedQuiz.id}/attempt`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            const data = await res.json();
            setAttemptId(data.attempt.id);
            setStudentQuizMode(true);
        } catch {
            setError("Failed to start attempt");
        }
    }

    async function handleSubmitAttempt() {
        if (!attemptId || !selectedQuiz) return;
        const token = await getToken();
        if (!token) return;

        const responses = Object.entries(answers).map(([questionId, optionId]) => ({
            question_id: questionId,
            selected_option_id: optionId,
        }));

        try {
            const res = await fetch(`${apiUrl}/quizzes/attempt/${attemptId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ responses }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            const data = await res.json();
            setAttemptResult({
                score: data.attempt.score ?? 0,
                max_score: data.attempt.max_score ?? 0,
            });
            // Fetch the responses for the result screen to handle 0-point quizzes
            const attRes = await fetch(`${apiUrl}/quizzes/${selectedQuiz.id}/my-attempt`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (attRes.ok) {
                const attData = await attRes.json();
                setAttemptResponses(attData.responses || []);
            }
            setAttemptId(null);
            setStudentQuizMode(false);
        } catch {
            setError("Failed to submit attempt");
        }
    }

    // ── STUDENT: Full-screen quiz-taking mode ──────────────────────────────────
    if (isStudent && selectedQuiz && studentQuizMode && attemptId) {
        const totalQuestions = selectedQuiz.questions.length;
        const answeredCount = Object.keys(answers).length;
        const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

        return (
            <div className="min-h-[60vh] flex flex-col gap-0">
                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 mb-4">
                    <div>
                        <h3 className="text-white font-semibold">{selectedQuiz.title}</h3>
                        {selectedQuiz.description && (
                            <p className="text-xs text-zinc-400 mt-0.5">{selectedQuiz.description}</p>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-zinc-400">
                            {answeredCount} / {totalQuestions} answered
                        </span>
                        <div className="w-40 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm mb-3">
                        {error}
                        <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                    </div>
                )}

                <div className="space-y-5 flex-1">
                    {selectedQuiz.questions.map((q, qi) => (
                        <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            <div className="flex gap-3 mb-4">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center text-xs font-semibold text-indigo-300">
                                    {qi + 1}
                                </span>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium leading-relaxed">{q.question_text}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{q.points} pt{q.points !== 1 ? "s" : ""}</p>
                                </div>
                            </div>
                            {q.options.length > 0 && (
                                <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt, oi) => {
                                        const isSelected = answers[q.id] === opt.id;
                                        const optionLabels = ["A", "B", "C", "D"];
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all duration-150 ${
                                                    isSelected
                                                        ? "bg-indigo-600/20 border-indigo-500 text-white"
                                                        : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
                                                }`}
                                            >
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-semibold transition-colors ${
                                                    isSelected
                                                        ? "border-indigo-400 bg-indigo-500 text-white"
                                                        : "border-zinc-600 text-zinc-400"
                                                }`}>
                                                    {optionLabels[oi] ?? oi + 1}
                                                </span>
                                                <span>{opt.option_text}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="sticky bottom-0 pt-4 mt-4 border-t border-zinc-800 bg-transparent flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            setStudentQuizMode(false);
                            setAttemptId(null);
                            setAnswers({});
                        }}
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        ← Back to quizzes
                    </button>
                    <button
                        onClick={handleSubmitAttempt}
                        disabled={answeredCount === 0}
                        className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Submit Quiz ({answeredCount}/{totalQuestions})
                    </button>
                </div>
            </div>
        );
    }

    // ── STUDENT: Quiz result screen ────────────────────────────────────────────
    if (isStudent && selectedQuiz && attemptResult) {
        let displayScore = attemptResult.score;
        let displayMax = attemptResult.max_score;
        let pct = displayMax > 0 ? Math.round((displayScore / displayMax) * 100) : 0;

        // If it's a feedback quiz or max score is 0, use correct response count
        if (displayMax === 0 && attemptResponses.length > 0) {
            const correctCount = attemptResponses.filter(r => r.is_correct).length;
            displayScore = correctCount;
            displayMax = attemptResponses.length;
            pct = Math.round((displayScore / displayMax) * 100);
        } else if (displayMax === 0 && selectedQuiz.questions.length > 0) {
            // Fallback for cases with no responses loaded yet
            displayMax = selectedQuiz.questions.length;
        }

        const grade = pct >= 90 ? "Excellent!" : pct >= 70 ? "Good job!" : pct >= 50 ? "Keep it up!" : "Better luck next time!";
        const gradeColor = pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400";

        return (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
                <div className="w-20 h-20 rounded-full bg-indigo-900/40 border-2 border-indigo-500/50 flex items-center justify-center text-3xl">
                    {pct >= 70 ? "🎉" : pct >= 50 ? "📖" : "💪"}
                </div>
                <div className="text-center">
                    <p className="text-zinc-400 text-sm mb-1">Quiz completed</p>
                    <h3 className="text-white text-lg font-semibold mb-1">{selectedQuiz.title}</h3>
                    <p className={`text-sm font-medium ${gradeColor}`}>{grade}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-12 py-6 text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Your Score</p>
                    <p className="text-5xl font-bold text-white">
                        {displayScore}
                        <span className="text-2xl text-zinc-500">/{displayMax}</span>
                    </p>
                    <p className={`text-xl font-semibold mt-2 ${gradeColor}`}>{pct}%</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedQuiz(null);
                        setAttemptResult(null);
                        setAttemptResponses([]);
                    }}
                    className="px-5 py-2 bg-zinc-800 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors"
                >
                    ← Back to quizzes
                </button>
            </div>
        );
    }

    // ── STUDENT: Quiz info / start screen ─────────────────────────────────────
    if (isStudent && selectedQuiz) {
        return (
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedQuiz(null)}
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                    </div>
                )}

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center text-2xl">
                        📝
                    </div>
                    <div>
                        <h3 className="text-white text-xl font-semibold">{selectedQuiz.title}</h3>
                        {selectedQuiz.description && (
                            <p className="text-zinc-400 text-sm mt-1">{selectedQuiz.description}</p>
                        )}
                    </div>
                    <div className="flex gap-6 text-sm text-zinc-400">
                        <span>📋 {selectedQuiz.questions.length} question{selectedQuiz.questions.length !== 1 ? "s" : ""}</span>
                        {selectedQuiz.duration_mins && <span>⏱ {selectedQuiz.duration_mins} min</span>}
                    </div>
                    <button
                        onClick={handleStartAttempt}
                        className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 transition-colors mt-2"
                    >
                        Start Quiz
                    </button>
                </div>
            </div>
        );
    }

    // ── TEACHER: Quiz detail view ─────────────────────────────────────────────
    if (canManage && selectedQuiz) {
        const submitted = studentAttempts.length;
        const avgScore = submitted > 0
            ? studentAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / submitted
            : null;
        const maxPossible = studentAttempts[0]?.max_score ?? null;

        return (
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedQuiz(null)}
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                    <h3 className="text-white font-medium">{selectedQuiz.title}</h3>
                    {!selectedQuiz.is_published && (
                        <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">Draft</span>
                    )}
                    <div className="ml-auto flex gap-2">
                        {!selectedQuiz.is_published && (
                            <button
                                onClick={() => handlePublish(selectedQuiz.id)}
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                            >
                                Publish
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddQuestion(!showAddQuestion)}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                            + Add Question
                        </button>
                        <button
                            onClick={() => handleDeleteQuiz(selectedQuiz.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                    </div>
                )}

                {selectedQuiz.description && (
                    <p className="text-sm text-zinc-400">{selectedQuiz.description}</p>
                )}

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-white">{selectedQuiz.questions.length}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Questions</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-white">{submitted}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Submitted</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-white">
                            {avgScore !== null && maxPossible
                                ? `${Math.round((avgScore / maxPossible) * 100)}%`
                                : "--"}
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Avg Score</p>
                    </div>
                </div>

                {/* Sub-tabs: Questions / Results */}
                <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
                    <button
                        onClick={() => setTeacherTab("questions")}
                        className={`px-4 py-1.5 text-sm rounded-md transition-colors ${teacherTab === "questions" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                        Questions ({selectedQuiz.questions.length})
                    </button>
                    <button
                        onClick={() => setTeacherTab("results")}
                        className={`px-4 py-1.5 text-sm rounded-md transition-colors ${teacherTab === "results" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                        Results ({studentAttempts.length})
                    </button>
                </div>

                {/* Add Question Form — only in questions tab */}
                {teacherTab === "questions" && showAddQuestion && (
                    <form onSubmit={handleAddQuestion} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                        <h4 className="text-sm font-medium text-white">New Question</h4>
                        <input
                            type="text"
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            placeholder="Question text"
                        />
                        <div className="flex gap-3">
                            <select
                                value={qType}
                                onChange={(e) => handleQTypeChange(e.target.value)}
                                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="mcq">Multiple Choice (4 options)</option>
                                <option value="true_false">True / False</option>
                                <option value="short_answer">Short Answer</option>
                            </select>
                            <input
                                type="number"
                                value={qPoints}
                                onChange={(e) => setQPoints(e.target.value)}
                                className="w-24 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="Points"
                                min="1"
                            />
                        </div>

                        {(qType === "mcq" || qType === "true_false") && (
                            <div className="space-y-2">
                                <p className="text-xs text-zinc-400 font-medium">
                                    Options — <span className="text-emerald-400">select the correct answer</span>
                                </p>
                                {options.map((opt, i) => {
                                    const optionLabels = ["A", "B", "C", "D"];
                                    return (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                                opt.is_correct
                                                    ? "border-emerald-600/60 bg-emerald-900/15"
                                                    : "border-zinc-700 bg-zinc-800/50"
                                            }`}
                                            onClick={() => handleCorrectChange(i)}
                                        >
                                            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                opt.is_correct
                                                    ? "border-emerald-500 bg-emerald-500"
                                                    : "border-zinc-600 bg-transparent"
                                            }`}>
                                                {opt.is_correct && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <span className="flex-shrink-0 w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                                                {optionLabels[i] ?? i + 1}
                                            </span>
                                            {qType === "mcq" ? (
                                                <input
                                                    type="text"
                                                    value={opt.option_text}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        setOptions(options.map((o, j) => j === i ? { ...o, option_text: e.target.value } : o));
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-600"
                                                    placeholder={`Option ${optionLabels[i] ?? i + 1}`}
                                                />
                                            ) : (
                                                <span className="flex-1 text-sm text-zinc-300">{opt.option_text}</span>
                                            )}
                                            {opt.is_correct && (
                                                <span className="text-xs text-emerald-400 font-medium flex-shrink-0">✓ Correct</span>
                                            )}
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-zinc-600">Click a row to mark it as the correct answer.</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors">
                                Add Question
                            </button>
                            <button type="button" onClick={() => setShowAddQuestion(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Questions sub-tab */}
                {teacherTab === "questions" && (
                    <div className="space-y-3">
                        {selectedQuiz.questions.length === 0 && (
                            <div className="text-center py-8 text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm">
                                No questions yet. Click &quot;+ Add Question&quot; to get started.
                            </div>
                        )}
                        {selectedQuiz.questions.map((q, qi) => (
                            <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 mt-0.5">
                                        {qi + 1}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm text-white">{q.question_text}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{q.points} pt{q.points !== 1 ? "s" : ""} · {q.question_type.replace("_", "/")}</p>
                                    </div>
                                </div>
                                {q.options.length > 0 && (
                                    <div className="mt-3 ml-9 space-y-1.5">
                                        {q.options.map((opt, oi) => {
                                            const optLabels = ["A", "B", "C", "D"];
                                            return (
                                                <div
                                                    key={opt.id}
                                                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
                                                        opt.is_correct
                                                            ? "bg-emerald-900/20 border border-emerald-800/50 text-emerald-300"
                                                            : "text-zinc-400"
                                                    }`}
                                                >
                                                    <span className="text-xs text-zinc-600 w-4">{optLabels[oi] ?? oi + 1}.</span>
                                                    <span>{opt.option_text}</span>
                                                    {opt.is_correct && <span className="ml-auto text-xs text-emerald-400">✓ correct</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Results sub-tab */}
                {teacherTab === "results" && (
                    <div>
                        {studentAttempts.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm">
                                No submissions yet. Students haven&apos;t completed this quiz.
                            </div>
                        ) : (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">#</th>
                                            <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Student</th>
                                            <th className="text-center px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Score</th>
                                            <th className="text-center px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Percentage</th>
                                            <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...studentAttempts]
                                            .sort((a, b) => {
                                                const pctA = a.max_score ? (a.score ?? 0) / a.max_score : 0;
                                                const pctB = b.max_score ? (b.score ?? 0) / b.max_score : 0;
                                                return pctB - pctA;
                                            })
                                            .map((att, idx) => {
                                                const pct = att.max_score && att.max_score > 0
                                                    ? Math.round(((att.score ?? 0) / att.max_score) * 100)
                                                    : null;
                                                const gradeColor = pct === null ? "text-zinc-400"
                                                    : pct >= 70 ? "text-emerald-400"
                                                    : pct >= 50 ? "text-amber-400"
                                                    : "text-red-400";
                                                const rankBadge = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                                                return (
                                                    <tr key={att.attempt_id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                                                        <td className="px-5 py-3 text-zinc-500 text-xs">
                                                            {rankBadge ?? <span className="text-zinc-600">{idx + 1}</span>}
                                                        </td>
                                                        <td className="px-5 py-3 text-zinc-200 font-medium">
                                                            {att.student_name || "Unknown Student"}
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <span className="font-semibold text-white">{att.score ?? "--"}</span>
                                                            <span className="text-zinc-500 text-xs ml-1">/ {att.max_score ?? "--"}</span>
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <span className={`text-sm font-semibold ${gradeColor}`}>
                                                                {pct !== null ? `${pct}%` : "--"}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-right text-zinc-500 text-xs">
                                                            {att.submitted_at
                                                                ? new Date(att.submitted_at).toLocaleString([], {
                                                                    month: "short", day: "numeric",
                                                                    hour: "2-digit", minute: "2-digit",
                                                                })
                                                                : "--"}
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
        );
    }

    // ── Quiz list view (both roles) ────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                </div>
            )}

            {canManage && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                    >
                        + New Quiz
                    </button>
                </div>
            )}

            {showCreate && canManage && (
                <form onSubmit={handleCreateQuiz} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="Quiz title"
                    />
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="Description (optional)"
                    />
                    <div className="flex gap-3">
                        <select
                            value={unitId}
                            onChange={(e) => setUnitId(e.target.value)}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">All units (course-wide)</option>
                            {units.map((u) => (
                                <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={durationMins}
                            onChange={(e) => setDurationMins(e.target.value)}
                            className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            placeholder="Minutes"
                            min="1"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors">
                            Create Quiz
                        </button>
                        <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Student header */}
            {isStudent && (
                <div className="bg-indigo-900/10 border border-indigo-800/40 rounded-xl px-5 py-4">
                    <h3 className="text-white font-semibold text-sm mb-0.5">Available Quizzes</h3>
                    <p className="text-xs text-zinc-400">Select a quiz below to view details and start your attempt.</p>
                </div>
            )}

            {quizzes.filter(q => isStudent ? q.is_published : true).length === 0 ? (
                <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <p>{isStudent ? "No quizzes available yet." : "No quizzes yet."}</p>
                </div>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {quizzes
                        .filter(q => isStudent ? q.is_published : true)
                        .map((quiz, i) => (
                            <div
                                key={quiz.id}
                                onClick={() => openQuiz(quiz.id)}
                                className={`px-5 py-4 flex items-center justify-between cursor-pointer ${i > 0 ? "border-t border-zinc-800" : ""} hover:bg-zinc-800/30 transition-colors`}
                            >
                                <div>
                                    <p className="text-white text-sm font-medium">{quiz.title}</p>
                                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                                        {quiz.duration_mins && <span>{quiz.duration_mins} min</span>}
                                        <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!quiz.is_published && canManage && (
                                        <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">Draft</span>
                                    )}
                                    <span className="text-zinc-600 text-xs">→</span>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
