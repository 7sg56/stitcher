"use client";

import { useState } from "react";

interface Resource {
    id: string;
    course_id: string;
    unit_id: string | null;
    exam_section_id: string | null;
    title: string;
    description: string | null;
    file_url: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    created_at: string;
}

interface Unit {
    id: string;
    title: string;
    unit_number: number;
}

interface ExamSection {
    id: string;
    type: string;
    date: string | null;
    description: string | null;
    exam_board: string | null;
}

interface ResourcesPanelProps {
    courseId: string;
    role: string;
    resources: Resource[];
    units: Unit[];
    examSections: ExamSection[];
    apiUrl: string;
    getToken: () => Promise<string | null>;
    onRefresh: () => Promise<void>;
}

function formatFileSize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourcesPanel({
    courseId,
    role,
    resources,
    units,
    examSections,
    apiUrl,
    getToken,
    onRefresh,
}: ResourcesPanelProps) {
    const [showUpload, setShowUpload] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [fileUrl, setFileUrl] = useState("");
    const [fileName, setFileName] = useState("");
    const [targetType, setTargetType] = useState<"unit" | "exam_section">("unit");
    const [targetId, setTargetId] = useState("");
    const [filter, setFilter] = useState<"all" | "unit" | "exam">("all");
    const [error, setError] = useState<string | null>(null);

    const canManage = role === "teacher" || role === "admin";

    const filteredResources = resources.filter((r) => {
        if (filter === "unit") return r.unit_id !== null;
        if (filter === "exam") return r.exam_section_id !== null;
        return true;
    });

    // Group resources by their unit or exam section
    const grouped = filteredResources.reduce((acc, r) => {
        let key: string;
        if (r.unit_id) {
            const unit = units.find((u) => u.id === r.unit_id);
            key = unit ? `Unit ${unit.unit_number}: ${unit.title}` : "Unknown Unit";
        } else if (r.exam_section_id) {
            const section = examSections.find((s) => s.id === r.exam_section_id);
            key = section ? `Exam: ${section.type} ${section.date ? `(${new Date(section.date).toLocaleDateString()})` : ""}` : "Unknown Section";
        } else {
            key = "General";
        }
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
    }, {} as Record<string, Resource[]>);

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !fileUrl.trim() || !targetId) return;

        const token = await getToken();
        if (!token) return;

        const body: Record<string, unknown> = {
            course_id: courseId,
            title: title.trim(),
            description: description.trim() || undefined,
            file_url: fileUrl.trim(),
            file_name: fileName.trim() || title.trim(),
        };

        if (targetType === "unit") {
            body.unit_id = targetId;
        } else {
            body.exam_section_id = targetId;
        }

        try {
            const res = await fetch(`${apiUrl}/resources`, {
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
            setFileUrl("");
            setFileName("");
            setTargetId("");
            setShowUpload(false);
            await onRefresh();
        } catch {
            setError("Failed to upload resource");
        }
    }

    async function handleDelete(resourceId: string) {
        if (!confirm("Delete this resource?")) return;
        const token = await getToken();
        if (!token) return;
        try {
            await fetch(`${apiUrl}/resources/${resourceId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            await onRefresh();
        } catch {
            setError("Failed to delete resource");
        }
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-danger/20 border border-danger/50 text-danger px-4 py-3 rounded-lg text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-3 text-danger hover:text-danger">&times;</button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {(["all", "unit", "exam"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${filter === f
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {f === "all" ? "All" : f === "unit" ? "Units" : "Exam Sections"}
                        </button>
                    ))}
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary text-primary-foreground transition-colors"
                    >
                        + Add Resource
                    </button>
                )}
            </div>

            {showUpload && canManage && (
                <form onSubmit={handleUpload} className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                        placeholder="Resource title"
                    />
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                        placeholder="Description (optional)"
                    />
                    <input
                        type="text"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                        placeholder="File URL (paste link)"
                    />
                    <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                        placeholder="File name (e.g. notes.pdf)"
                    />
                    <div className="flex gap-3">
                        <select
                            value={targetType}
                            onChange={(e) => { setTargetType(e.target.value as "unit" | "exam_section"); setTargetId(""); }}
                            className="px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                        >
                            <option value="unit">Unit</option>
                            <option value="exam_section">Exam Section</option>
                        </select>
                        <select
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                        >
                            <option value="">Select {targetType === "unit" ? "unit" : "exam section"}</option>
                            {targetType === "unit"
                                ? units.map((u) => <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>)
                                : examSections.map((s) => <option key={s.id} value={s.id}>Exam: {s.type} {s.date ? `(${new Date(s.date).toLocaleDateString()})` : ""}</option>)
                            }
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary text-primary-foreground transition-colors">
                            Add Resource
                        </button>
                        <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                    <p>No resources uploaded yet.</p>
                </div>
            ) : (
                Object.entries(grouped).map(([group, items]) => (
                    <div key={group}>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{group}</h4>
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            {items.map((resource, i) => (
                                <div
                                    key={resource.id}
                                    className={`px-5 py-3.5 flex items-center justify-between ${i > 0 ? "border-t border-border" : ""} hover:bg-muted`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                                            {resource.mime_type?.includes("pdf") ? "PDF" : resource.mime_type?.includes("image") ? "IMG" : "DOC"}
                                        </div>
                                        <div>
                                            <a
                                                href={resource.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-foreground hover:text-primary transition-colors"
                                            >
                                                {resource.title}
                                            </a>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span>{resource.file_name}</span>
                                                {resource.file_size && <span>{formatFileSize(resource.file_size)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <button
                                            onClick={() => handleDelete(resource.id)}
                                            className="text-xs text-danger hover:text-danger transition-colors"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
