"use client";

import { useState, useCallback } from "react";

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessTypeFromUrl(url: string): string {
    const lower = url.toLowerCase();
    if (lower.match(/\.(pdf)($|\?)/)) return "PDF";
    if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)($|\?)/)) return "IMG";
    if (lower.match(/\.(doc|docx)($|\?)/)) return "DOC";
    if (lower.match(/\.(xls|xlsx|csv)($|\?)/)) return "XLS";
    if (lower.match(/\.(ppt|pptx)($|\?)/)) return "PPT";
    if (lower.match(/\.(mp4|mov|avi|webm)($|\?)/)) return "VID";
    if (lower.match(/\.(zip|rar|7z|tar)($|\?)/)) return "ZIP";
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YT";
    if (lower.includes("drive.google.com")) return "GDR";
    if (lower.includes("docs.google.com")) return "DOC";
    return "LNK";
}

function typeColor(type: string): string {
    switch (type) {
        case "PDF": return "bg-danger/15 text-danger";
        case "IMG": return "bg-success/15 text-success";
        case "DOC": return "bg-primary/15 text-primary";
        case "XLS": return "bg-success/15 text-success";
        case "PPT": return "bg-warning/15 text-warning";
        case "VID": return "bg-purple-500/15 text-purple-500";
        case "YT": return "bg-danger/15 text-danger";
        case "GDR": return "bg-primary/15 text-primary";
        default: return "bg-muted text-muted-foreground";
    }
}

function extractFilenameFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split("/").filter(Boolean);
        return segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : "";
    } catch {
        return "";
    }
}

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */

function IconLink({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}

function IconExternalLink({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
        </svg>
    );
}

function IconTrash({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

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
    const [isDragOver, setIsDragOver] = useState(false);
    const [showDescField, setShowDescField] = useState(false);

    const canManage = role === "teacher" || role === "admin";

    const filteredResources = resources.filter((r) => {
        if (filter === "unit") return r.unit_id !== null;
        if (filter === "exam") return r.exam_section_id !== null;
        return true;
    });

    const grouped = filteredResources.reduce((acc, r) => {
        let key: string;
        if (r.unit_id) {
            const unit = units.find((u) => u.id === r.unit_id);
            key = unit ? `Unit ${unit.unit_number}: ${unit.title}` : "Unknown Unit";
        } else if (r.exam_section_id) {
            const section = examSections.find((s) => s.id === r.exam_section_id);
            key = section ? `Exam: ${section.type}${section.date ? ` (${new Date(section.date).toLocaleDateString()})` : ""}` : "Unknown Section";
        } else {
            key = "General";
        }
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
    }, {} as Record<string, Resource[]>);

    // Handle drop of URLs (from browser drag)
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        // Try to get a URL from the dragged data
        const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain") || "";

        if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
            setFileUrl(url);
            const guessedName = extractFilenameFromUrl(url);
            if (guessedName) setFileName(guessedName);
            if (!title) setTitle(guessedName || "");
            setShowUpload(true);
        }
    }, [title]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    // Auto-populate on URL paste
    function handleUrlChange(value: string) {
        setFileUrl(value);
        if (value.startsWith("http")) {
            const guessedName = extractFilenameFromUrl(value);
            if (guessedName && !fileName) setFileName(guessedName);
        }
    }

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
            setShowDescField(false);
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
                <div className="flex items-center justify-between bg-danger/10 border border-danger/30 text-danger px-4 py-2.5 rounded-lg text-sm">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-danger hover:text-danger">&times;</button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                    {(["all", "unit", "exam"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filter === f
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {f === "all" ? "All" : f === "unit" ? "Units" : "Exams"}
                        </button>
                    ))}
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        + Add Resource
                    </button>
                )}
            </div>

            {/* Upload form with drop zone */}
            {showUpload && canManage && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {/* Drop zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`border-b border-dashed px-5 py-6 text-center transition-colors ${isDragOver
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            }`}
                    >
                        <IconLink className={`w-6 h-6 mx-auto mb-2 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="text-sm text-muted-foreground">
                            {isDragOver ? (
                                <span className="text-primary font-medium">Drop link here</span>
                            ) : (
                                <>Drag a link from your browser here, or fill in below</>
                            )}
                        </p>
                    </div>

                    {/* Form fields */}
                    <form onSubmit={handleUpload} className="p-5 space-y-3">
                        {/* URL + Title row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                                    placeholder="e.g. Lecture notes"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">URL *</label>
                                <input
                                    type="text"
                                    value={fileUrl}
                                    onChange={(e) => handleUrlChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* File name (auto-detected, editable) */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">File name</label>
                            <input
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                                placeholder="Auto-detected from URL"
                            />
                        </div>

                        {/* Description toggle */}
                        {!showDescField ? (
                            <button
                                type="button"
                                onClick={() => setShowDescField(true)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                + Add description
                            </button>
                        ) : (
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring resize-none h-16"
                                placeholder="Brief description (optional)"
                            />
                        )}

                        {/* Target selector */}
                        <div className="flex gap-3">
                            <select
                                value={targetType}
                                onChange={(e) => { setTargetType(e.target.value as "unit" | "exam_section"); setTargetId(""); }}
                                className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                            >
                                <option value="unit">Unit</option>
                                <option value="exam_section">Exam Section</option>
                            </select>
                            <select
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-ring"
                            >
                                <option value="">Select {targetType === "unit" ? "unit" : "section"}</option>
                                {targetType === "unit"
                                    ? units.map((u) => <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>)
                                    : examSections.map((s) => <option key={s.id} value={s.id}>Exam: {s.type}{s.date ? ` (${new Date(s.date).toLocaleDateString()})` : ""}</option>)
                                }
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={!title.trim() || !fileUrl.trim() || !targetId}
                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Add Resource
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowUpload(false); setShowDescField(false); }}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            {fileUrl && (
                                <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${typeColor(guessTypeFromUrl(fileUrl))}`}>
                                    {guessTypeFromUrl(fileUrl)}
                                </span>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* Resource List */}
            {Object.keys(grouped).length === 0 ? (
                canManage ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`text-center py-14 border-2 border-dashed rounded-xl transition-colors ${isDragOver
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card"
                            }`}
                    >
                        <IconLink className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? "text-primary" : "text-muted-foreground/40"}`} />
                        <p className="text-sm text-muted-foreground">
                            {isDragOver ? "Drop to add resource" : "No resources yet. Drag a link here or click + Add Resource."}
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-14 text-muted-foreground bg-card border border-border rounded-xl">
                        <p className="text-sm">No resources uploaded yet.</p>
                    </div>
                )
            ) : (
                Object.entries(grouped).map(([group, items]) => (
                    <div key={group}>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{group}</h4>
                        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                            {items.map((resource) => {
                                const type = guessTypeFromUrl(resource.file_url);
                                return (
                                    <div
                                        key={resource.id}
                                        className="px-4 py-3 flex items-center gap-3 group hover:bg-muted/30 transition-colors"
                                    >
                                        {/* Type badge */}
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-wide shrink-0 ${typeColor(type)}`}>
                                            {type}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <a
                                                href={resource.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                                            >
                                                {resource.title}
                                                <IconExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span className="truncate max-w-[180px]">{resource.file_name}</span>
                                                {resource.file_size != null && <span>{formatFileSize(resource.file_size)}</span>}
                                                <span>{new Date(resource.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                            </div>
                                            {resource.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{resource.description}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {canManage && (
                                            <button
                                                onClick={() => handleDelete(resource.id)}
                                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all p-1"
                                                title="Delete resource"
                                            >
                                                <IconTrash className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
