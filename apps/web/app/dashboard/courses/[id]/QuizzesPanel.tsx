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

    // Question add state
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [qText, setQText] = useState("");
    const [qType, setQType] = useState("mcq");
    const [qPoints, setQPoints] = useState("1");
    const [options, setOptions] = useState([
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
    ]);

    const canManage = role === "teacher" || role === "admin";
    const isStudent = role === "student";

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
            setOptions([
                { option_text: "", is_correct: false },
                { option_text: "", is_correct: false },
                { option_text: "", is_correct: false },
                { option_text: "", is_correct: false },
            ]);
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
            setAttemptId(null);
        } catch {
            setError("Failed to submit attempt");
        }
    }

    // Quiz detail view
    if (selectedQuiz) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedQuiz(null)}
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        &larr; Back
                    </button>
                    <h3 className="text-white font-medium">{selectedQuiz.title}</h3>
                    {!selectedQuiz.is_published && canManage && (
                        <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">Draft</span>
                    )}
                    {canManage && (
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
                    )}
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

                {/* Student attempt result */}
                {attemptResult && (
                    <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-xl p-5 text-center">
                        <p className="text-sm text-zinc-400 mb-1">Your Score</p>
                        <p className="text-3xl font-bold text-white">{attemptResult.score} / {attemptResult.max_score}</p>
                        <p className="text-sm text-zinc-400 mt-1">
                            {Math.round((attemptResult.score / Math.max(attemptResult.max_score, 1)) * 100)}%
                        </p>
                    </div>
                )}

                {/* Student start attempt */}
                {isStudent && !attemptId && !attemptResult && (
                    <div className="text-center py-6">
                        <button
                            onClick={handleStartAttempt}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                        >
                            Start Quiz
                        </button>
                        {selectedQuiz.duration_mins && (
                            <p className="text-xs text-zinc-500 mt-2">Duration: {selectedQuiz.duration_mins} minutes</p>
                        )}
                    </div>
                )}

                {/* Add Question Form (teacher) */}
                {showAddQuestion && canManage && (
                    <form onSubmit={handleAddQuestion} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
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
                                onChange={(e) => setQType(e.target.value)}
                                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="mcq">Multiple Choice</option>
                                <option value="true_false">True / False</option>
                                <option value="short_answer">Short Answer</option>
                            </select>
                            <input
                                type="number"
                                value={qPoints}
                                onChange={(e) => setQPoints(e.target.value)}
                                className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="Points"
                                min="1"
                            />
                        </div>
                        {(qType === "mcq" || qType === "true_false") && (
                            <div className="space-y-2">
                                <p className="text-xs text-zinc-500">Options (check the correct one)</p>
                                {options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="correct"
                                            checked={opt.is_correct}
                                            onChange={() => setOptions(options.map((o, j) => ({ ...o, is_correct: j === i })))}
                                            className="accent-emerald-500"
                                        />
                                        <input
                                            type="text"
                                            value={opt.option_text}
                                            onChange={(e) => setOptions(options.map((o, j) => j === i ? { ...o, option_text: e.target.value } : o))}
                                            className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                            placeholder={`Option ${i + 1}`}
                                        />
                                    </div>
                                ))}
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

                {/* Questions List */}
                <div className="space-y-3">
                    {selectedQuiz.questions.map((q, qi) => (
                        <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <span className="text-xs text-zinc-500 mt-0.5">{qi + 1}.</span>
                                    <div>
                                        <p className="text-sm text-white">{q.question_text}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{q.points} pt{q.points !== 1 ? "s" : ""} &middot; {q.question_type.replace("_", "/")}</p>
                                    </div>
                                </div>
                            </div>
                            {q.options.length > 0 && (
                                <div className="mt-3 ml-6 space-y-1.5">
                                    {q.options.map((opt) => (
                                        <label
                                            key={opt.id}
                                            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg cursor-pointer transition-colors ${attemptId && answers[q.id] === opt.id
                                                ? "bg-indigo-900/30 border border-indigo-700 text-white"
                                                : "text-zinc-400 hover:bg-zinc-800"
                                                } ${canManage && opt.is_correct ? "border-l-2 border-l-emerald-500" : ""}`}
                                        >
                                            {attemptId && (
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    value={opt.id}
                                                    checked={answers[q.id] === opt.id}
                                                    onChange={() => setAnswers({ ...answers, [q.id]: opt.id })}
                                                    className="accent-indigo-500"
                                                />
                                            )}
                                            <span>{opt.option_text}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Submit Attempt Button */}
                {attemptId && (
                    <div className="text-center">
                        <button
                            onClick={handleSubmitAttempt}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                        >
                            Submit Quiz
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Quiz list view
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

            {quizzes.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <p>No quizzes yet.</p>
                </div>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {quizzes.map((quiz, i) => (
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
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
