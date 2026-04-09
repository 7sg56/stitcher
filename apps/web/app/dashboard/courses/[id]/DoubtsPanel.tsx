"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons (no external deps)                               */
/* ------------------------------------------------------------------ */

function IconArrowUp({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
    );
}

function IconSend({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
        </svg>
    );
}

function IconCheck({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

function IconChevron({ className, open }: { className?: string; open: boolean }) {
    return (
        <svg className={`${className} transition-transform duration-200 ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

function IconMessage({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface DoubtThread {
    id: string;
    course_id: string;
    created_by: string;
    title: string;
    is_resolved: boolean;
    upvote_count: number;
    user_has_upvoted?: boolean;
    created_at: string;
}

interface DoubtMessage {
    id: string;
    thread_id: string;
    sender_id: string;
    content: string;
    upvote_count: number;
    user_has_upvoted?: boolean;
    sent_at: string;
    sender_alias: string;
    sender_name: string | null;
    sender_role: string;
}

interface DoubtThreadWithMessages extends DoubtThread {
    messages: DoubtMessage[];
}

interface DoubtsPanelProps {
    courseId: string;
    role: string;
    threads: DoubtThread[];
    apiUrl: string;
    getToken: () => Promise<string | null>;
    onRefresh: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Animated expand wrapper                                           */
/* ------------------------------------------------------------------ */

function AnimatedExpand({ open, children }: { open: boolean; children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        if (ref.current) {
            setHeight(ref.current.scrollHeight);
        }
    }, [open, children]);

    return (
        <div
            className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
            style={{
                maxHeight: open ? `${height}px` : "0px",
                opacity: open ? 1 : 0,
            }}
        >
            <div ref={ref}>{children}</div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function DoubtsPanel({
    courseId,
    role,
    threads: externalThreads,
    apiUrl,
    getToken,
    onRefresh,
}: DoubtsPanelProps) {
    // Local copy for optimistic updates
    const [threads, setThreads] = useState<DoubtThread[]>(externalThreads);
    useEffect(() => { setThreads(externalThreads); }, [externalThreads]);

    const [newTitle, setNewTitle] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null);
    const [loadedThreads, setLoadedThreads] = useState<Record<string, DoubtThreadWithMessages>>({});
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");

    const canResolve = role === "teacher" || role === "admin";

    // ---- helpers ----

    const authFetch = useCallback(async (url: string, options?: RequestInit) => {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");
        return fetch(url, {
            ...options,
            headers: {
                ...options?.headers,
                Authorization: `Bearer ${token}`,
            },
        });
    }, [getToken]);

    // ---- actions ----

    async function handleCreateThread(e: React.FormEvent) {
        e.preventDefault();
        if (!newTitle.trim()) return;
        try {
            const res = await authFetch(`${apiUrl}/doubts/threads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ course_id: courseId, title: newTitle.trim() }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setNewTitle("");
            await onRefresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create thread");
        }
    }

    async function toggleExpand(threadId: string) {
        const next = new Set(expandedIds);
        if (next.has(threadId)) {
            next.delete(threadId);
            setExpandedIds(next);
            if (replyingTo === threadId) { setReplyingTo(null); setReplyContent(""); }
            return;
        }

        next.add(threadId);
        setExpandedIds(next);

        if (!loadedThreads[threadId]) {
            setLoadingThreadId(threadId);
            try {
                const res = await authFetch(`${apiUrl}/doubts/threads/${threadId}`);
                if (!res.ok) throw new Error("Failed to load thread");
                const data = await res.json();
                setLoadedThreads(prev => ({ ...prev, [threadId]: data.thread }));
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load thread");
                next.delete(threadId);
                setExpandedIds(new Set(next));
            } finally {
                setLoadingThreadId(null);
            }
        }
    }

    async function refreshThread(threadId: string) {
        try {
            const res = await authFetch(`${apiUrl}/doubts/threads/${threadId}`);
            if (res.ok) {
                const data = await res.json();
                setLoadedThreads(prev => ({ ...prev, [threadId]: data.thread }));
            }
        } catch { /* silent */ }
    }

    // Optimistic upvote
    function toggleUpvoteThread(threadId: string, e: React.MouseEvent) {
        e.stopPropagation();
        setThreads(prev => prev.map(t => {
            if (t.id !== threadId) return t;
            const wasUpvoted = t.user_has_upvoted;
            return {
                ...t,
                user_has_upvoted: !wasUpvoted,
                upvote_count: (t.upvote_count || 0) + (wasUpvoted ? -1 : 1),
            };
        }));

        // Fire-and-forget -- refresh in background
        authFetch(`${apiUrl}/doubts/threads/${threadId}/upvote`, { method: "POST" })
            .then(() => onRefresh())
            .catch(() => onRefresh()); // revert on error
    }

    function toggleUpvoteMessage(threadId: string, messageId: string) {
        // Optimistic update
        setLoadedThreads(prev => {
            const thread = prev[threadId];
            if (!thread) return prev;
            return {
                ...prev,
                [threadId]: {
                    ...thread,
                    messages: thread.messages.map(m => {
                        if (m.id !== messageId) return m;
                        const wasUpvoted = m.user_has_upvoted;
                        return {
                            ...m,
                            user_has_upvoted: !wasUpvoted,
                            upvote_count: (m.upvote_count || 0) + (wasUpvoted ? -1 : 1),
                        };
                    }),
                },
            };
        });

        authFetch(`${apiUrl}/doubts/messages/${messageId}/upvote`, { method: "POST" })
            .then(() => refreshThread(threadId))
            .catch(() => refreshThread(threadId));
    }

    async function handleSendMessage(e: React.FormEvent, threadId: string) {
        e.preventDefault();
        if (!replyContent.trim()) return;
        try {
            const res = await authFetch(`${apiUrl}/doubts/threads/${threadId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: replyContent.trim() }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setReplyContent("");
            setReplyingTo(null);
            await refreshThread(threadId);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to send reply");
        }
    }

    async function handleResolve(threadId: string) {
        // Optimistic
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, is_resolved: true } : t));
        setLoadedThreads(prev => {
            const thread = prev[threadId];
            if (!thread) return prev;
            return { ...prev, [threadId]: { ...thread, is_resolved: true } };
        });

        try {
            const res = await authFetch(`${apiUrl}/doubts/threads/${threadId}/resolve`, { method: "PATCH" });
            if (!res.ok) throw new Error((await res.json()).error);
            await onRefresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to resolve thread");
            await onRefresh(); // revert
        }
    }

    // ---- identity helper ----

    function renderSender(msgRole: string, msgName: string | null, msgAlias: string) {
        const isInstructor = msgRole === "teacher" || msgRole === "admin";
        const name = isInstructor ? (msgName || "Instructor") : msgAlias;
        return (
            <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-zinc-200">{name}</span>
                {isInstructor && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {msgRole}
                    </span>
                )}
            </div>
        );
    }

    // ---- render ----

    return (
        <div className="space-y-5">
            {/* Error */}
            {error && (
                <div className="flex items-center justify-between gap-3 bg-red-950/40 border border-red-900/50 text-red-300 px-4 py-2.5 rounded-lg text-sm">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 shrink-0 p-0.5">&times;</button>
                </div>
            )}

            {/* Compose */}
            <form onSubmit={handleCreateThread} className="relative">
                <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full pl-4 pr-28 py-3.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/60 transition-colors placeholder:text-zinc-600"
                    placeholder="Ask a question or start a discussion..."
                />
                <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Post
                </button>
            </form>

            {/* Threads */}
            {threads.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 bg-zinc-900/40 border border-zinc-800/50 rounded-lg">
                    <IconMessage className="w-7 h-7 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No doubts posted yet. Be the first to start a discussion.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {threads.map((thread) => {
                        const isExpanded = expandedIds.has(thread.id);
                        const detail = loadedThreads[thread.id];
                        const messages = detail?.messages || [];
                        const isLoading = loadingThreadId === thread.id;

                        return (
                            <div
                                key={thread.id}
                                className={`bg-zinc-900/70 border rounded-lg transition-colors ${isExpanded ? "border-zinc-700" : "border-zinc-800/60 hover:border-zinc-700/60"}`}
                            >
                                {/* Thread row */}
                                <div
                                    className="flex items-start gap-0 cursor-pointer select-none"
                                    onClick={() => toggleExpand(thread.id)}
                                >
                                    {/* Vote column */}
                                    <div className="flex flex-col items-center w-12 shrink-0 py-4">
                                        <button
                                            onClick={(e) => toggleUpvoteThread(thread.id, e)}
                                            className={`p-1 rounded transition-colors ${thread.user_has_upvoted
                                                ? "text-indigo-400"
                                                : "text-zinc-600 hover:text-zinc-300"}`}
                                        >
                                            <IconArrowUp className="w-4 h-4" />
                                        </button>
                                        <span className={`text-xs font-semibold tabular-nums mt-0.5 ${thread.user_has_upvoted ? "text-indigo-400" : "text-zinc-500"}`}>
                                            {thread.upvote_count || 0}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 py-3.5 pr-4">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`text-sm font-medium truncate ${thread.is_resolved ? "text-zinc-400" : "text-zinc-100"}`}>
                                                {thread.title}
                                            </h3>
                                            {thread.is_resolved && (
                                                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-900/25 px-2 py-0.5 rounded-full">
                                                    <IconCheck className="w-3 h-3" />
                                                    Resolved
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500">
                                            <span>{new Date(thread.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                            <span className="text-zinc-700">|</span>
                                            <span className="inline-flex items-center gap-1">
                                                <IconMessage className="w-3 h-3" />
                                                {isExpanded && detail ? `${messages.length} replies` : "Replies"}
                                            </span>
                                            <span className="ml-auto">
                                                <IconChevron className="w-3.5 h-3.5 text-zinc-600" open={isExpanded} />
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded replies */}
                                <AnimatedExpand open={isExpanded}>
                                    <div className="border-t border-zinc-800 px-4 pb-4 pt-3 ml-12">
                                        {isLoading ? (
                                            <div className="flex justify-center py-6">
                                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Messages */}
                                                {messages.length === 0 ? (
                                                    <p className="text-xs text-zinc-600 py-2">No replies yet. Be the first to respond.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {messages.map((msg) => {
                                                            const isInstructor = msg.sender_role === "teacher" || msg.sender_role === "admin";
                                                            return (
                                                                <div key={msg.id} className="flex gap-3 group">
                                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${isInstructor
                                                                        ? "bg-indigo-600/80 text-white"
                                                                        : "bg-zinc-800 text-zinc-400"}`}>
                                                                        {(msg.sender_name || msg.sender_alias).charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            {renderSender(msg.sender_role, msg.sender_name, msg.sender_alias)}
                                                                            <span className="text-[11px] text-zinc-600">
                                                                                {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[13px] text-zinc-300 mt-1 leading-relaxed">{msg.content}</p>
                                                                        <div className="flex items-center gap-3 mt-1.5">
                                                                            <button
                                                                                onClick={() => toggleUpvoteMessage(thread.id, msg.id)}
                                                                                className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${msg.user_has_upvoted ? "text-indigo-400" : "text-zinc-600 hover:text-zinc-400"}`}
                                                                            >
                                                                                <IconArrowUp className="w-3 h-3" />
                                                                                {msg.upvote_count || 0}
                                                                            </button>
                                                                            {!thread.is_resolved && (
                                                                                <button
                                                                                    onClick={() => setReplyingTo(thread.id)}
                                                                                    className="text-[11px] font-medium text-zinc-600 hover:text-zinc-400 transition-colors"
                                                                                >
                                                                                    Reply
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Reply input -- always visible when thread is open */}
                                                {!thread.is_resolved && (
                                                    <form
                                                        onSubmit={(e) => handleSendMessage(e, thread.id)}
                                                        className="flex gap-2 pt-2"
                                                    >
                                                        <input
                                                            type="text"
                                                            value={replyingTo === thread.id ? replyContent : ""}
                                                            onFocus={() => setReplyingTo(thread.id)}
                                                            onChange={(e) => { setReplyingTo(thread.id); setReplyContent(e.target.value); }}
                                                            placeholder="Write a reply..."
                                                            className="flex-1 px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-md text-[13px] text-white focus:outline-none focus:border-indigo-500/50 placeholder:text-zinc-600 transition-colors"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={replyingTo !== thread.id || !replyContent.trim()}
                                                            className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <IconSend className="w-3.5 h-3.5" />
                                                        </button>
                                                    </form>
                                                )}

                                                {/* Resolve button */}
                                                {canResolve && !thread.is_resolved && (
                                                    <div className="flex justify-end pt-2 border-t border-zinc-800/50">
                                                        <button
                                                            onClick={() => handleResolve(thread.id)}
                                                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15 px-3 py-1.5 rounded-md transition-colors"
                                                        >
                                                            <IconCheck className="w-3 h-3" />
                                                            Mark as Resolved
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </AnimatedExpand>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
