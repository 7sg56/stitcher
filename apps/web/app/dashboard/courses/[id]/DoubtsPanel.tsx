"use client";

import { useState } from "react";

interface DoubtThread {
    id: string;
    course_id: string;
    created_by: string;
    title: string;
    is_resolved: boolean;
    created_at: string;
}

interface DoubtMessage {
    id: string;
    thread_id: string;
    sender_id: string;
    content: string;
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

export default function DoubtsPanel({
    courseId,
    role,
    threads,
    apiUrl,
    getToken,
    onRefresh,
}: DoubtsPanelProps) {
    const [newTitle, setNewTitle] = useState("");
    const [selectedThread, setSelectedThread] = useState<DoubtThreadWithMessages | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loadingThread, setLoadingThread] = useState(false);

    const canResolve = role === "teacher" || role === "admin";

    async function handleCreateThread(e: React.FormEvent) {
        e.preventDefault();
        if (!newTitle.trim()) return;
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/doubts/threads`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ course_id: courseId, title: newTitle.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            setNewTitle("");
            await onRefresh();
        } catch {
            setError("Failed to create thread");
        }
    }

    async function openThread(threadId: string) {
        setLoadingThread(true);
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/doubts/threads/${threadId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedThread(data.thread);
            }
        } catch {
            setError("Failed to load thread");
        } finally {
            setLoadingThread(false);
        }
    }

    async function handleSendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!newMessage.trim() || !selectedThread) return;
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${apiUrl}/doubts/threads/${selectedThread.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ content: newMessage.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            setNewMessage("");
            await openThread(selectedThread.id);
        } catch {
            setError("Failed to send message");
        }
    }

    async function handleResolve(threadId: string) {
        const token = await getToken();
        if (!token) return;
        try {
            await fetch(`${apiUrl}/doubts/threads/${threadId}/resolve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedThread(null);
            await onRefresh();
        } catch {
            setError("Failed to resolve thread");
        }
    }

    // Thread detail view
    if (selectedThread) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedThread(null)}
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        &larr; Back
                    </button>
                    <h3 className="text-white font-medium">{selectedThread.title}</h3>
                    {selectedThread.is_resolved && (
                        <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">Resolved</span>
                    )}
                    {canResolve && !selectedThread.is_resolved && (
                        <button
                            onClick={() => handleResolve(selectedThread.id)}
                            className="ml-auto text-xs text-emerald-400 hover:text-emerald-300"
                        >
                            Mark Resolved
                        </button>
                    )}
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                    </div>
                )}

                {/* Messages */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
                    {selectedThread.messages.length === 0 ? (
                        <p className="text-zinc-500 text-sm text-center py-4">No messages yet. Start the conversation.</p>
                    ) : (
                        selectedThread.messages.map((msg) => (
                            <div key={msg.id} className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${msg.sender_role === "teacher" || msg.sender_role === "admin"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-zinc-700 text-zinc-300"
                                    }`}>
                                    {msg.sender_alias.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white">{msg.sender_alias}</span>
                                        {(msg.sender_role === "teacher" || msg.sender_role === "admin") && (
                                            <span className="text-xs text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded capitalize">{msg.sender_role}</span>
                                        )}
                                        <span className="text-xs text-zinc-600">{new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 mt-0.5">{msg.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Message Input */}
                {!selectedThread.is_resolved && (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            placeholder="Type your message..."
                        />
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                        >
                            Send
                        </button>
                    </form>
                )}
            </div>
        );
    }

    // Thread list view
    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
                </div>
            )}

            {/* New Thread Form */}
            <form onSubmit={handleCreateThread} className="flex gap-2">
                <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ask a question or start a discussion..."
                />
                <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                >
                    Post
                </button>
            </form>

            {/* Thread List */}
            {threads.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <p>No doubts posted yet.</p>
                </div>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {threads.map((thread, i) => (
                        <div
                            key={thread.id}
                            onClick={() => openThread(thread.id)}
                            className={`px-5 py-4 flex items-center justify-between cursor-pointer ${i > 0 ? "border-t border-zinc-800" : ""} hover:bg-zinc-800/30 transition-colors`}
                        >
                            <div>
                                <p className="text-white text-sm font-medium">{thread.title}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    {new Date(thread.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {thread.is_resolved ? (
                                    <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">Resolved</span>
                                ) : (
                                    <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">Open</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {loadingThread && (
                <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
