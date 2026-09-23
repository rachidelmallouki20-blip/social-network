"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { groupsApi, type GroupChatMessage } from "@/lib/groupsApi";
import Avatar from "@/components/Avatar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function addMessage(messages: GroupChatMessage[], incoming: GroupChatMessage) {
    if (messages.some((message) => message.id === incoming.id)) return messages;
    return [...messages, incoming].sort(
        (left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime()
    );
}

export default function GroupChat({ groupId }: { groupId: string }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<GroupChatMessage[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const clientRef = useRef<Client | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);

        groupsApi
            .getGroupMessages(groupId)
            .then((history) => {
                if (active) setMessages(history);
            })
            .catch((reason: Error) => {
                if (active) setError(reason.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        const client = new Client({
            webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
            reconnectDelay: 5000,
            debug: () => {},
            onConnect: () => {
                client.subscribe(`/topic/groups/${groupId}/messages`, (frame: IMessage) => {
                    const message = JSON.parse(frame.body) as GroupChatMessage;
                    if (active) setMessages((previous) => addMessage(previous, message));
                });
            },
            onStompError: (frame) => {
                if (active) setError(frame.headers.message ?? "La discussion est indisponible.");
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            active = false;
            clientRef.current = null;
            void client.deactivate();
        };
    }, [groupId]);

    async function sendMessage(event: FormEvent) {
        event.preventDefault();
        const content = text.trim();
        if (!content || sending) return;

        setSending(true);
        setError(null);
        try {
            const message = await groupsApi.sendGroupMessage(groupId, content);
            setMessages((previous) => addMessage(previous, message));
            setText("");
        } catch (reason) {
            setError((reason as Error).message || "Impossible d'envoyer le message.");
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Discussion du groupe</h2>
                
            </div>

            <div className="max-h-[28rem] min-h-64 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {loading ? (
                    <div className="flex h-52 items-center justify-center text-sm text-slate-500">
                        <Loader2 size={18} className="mr-2 animate-spin" /> Chargement des messages...
                    </div>
                ) : messages.length === 0 ? (
                    <p className="py-16 text-center text-sm text-slate-500">Soyez le premier à écrire dans ce groupe.</p>
                ) : (
                    messages.map((message) => {
                        const ownMessage = message.senderId === user?.id;
                        return (
                            <div key={message.id} className={`flex gap-2 ${ownMessage ? "flex-row-reverse" : ""}`}>
                                <Avatar
                                    firstName={message.senderFirstName}
                                    lastName={message.senderLastName}
                                    src={message.senderAvatarUrl}
                                    size={32}
                                />
                                <div className={`max-w-[80%] ${ownMessage ? "text-right" : ""}`}>
                                    <p className="mb-1 text-[11px] font-medium text-slate-500">
                                        {ownMessage ? "Vous" : `${message.senderFirstName} ${message.senderLastName}`}
                                    </p>
                                    <div className={`inline-block rounded-2xl px-3 py-2 text-sm ${ownMessage ? "bg-indigo-600 text-white" : "bg-white text-slate-800 shadow-sm"}`}>
                                        {message.content}
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-400">
                                        {new Date(message.sentAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="border-t border-slate-100 p-3">
                {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
                <div className="flex gap-2">
                    <input
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Écrire un message..."
                        maxLength={2000}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
                    />
                    <button
                        type="submit"
                        disabled={!text.trim() || sending}
                        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Envoyer le message"
                    >
                        {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    </button>
                </div>
            </form>
        </section>
    );
}
