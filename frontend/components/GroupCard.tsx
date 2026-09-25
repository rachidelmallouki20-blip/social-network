"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Group } from "@/lib/groupsApi";
import { Users, Clock, Check, X, Lock, LogIn, LogOut, Trash2 } from "lucide-react";

type GroupCardProps = {
    group: Group;
    busy?: boolean;
    onRequestJoin: (groupId: string) => void;
    onAccept: (groupId: string) => void;
    onRefuse: (groupId: string) => void;
    onLeave: (groupId: string) => void;
    onDelete: (groupId: string) => void;
};

export default function GroupCard({ group, busy, onRequestJoin, onAccept, onRefuse, onLeave, onDelete }: GroupCardProps) {
    const { user } = useAuth();
    const isCreator = user?.id === group.creatorId;
    return (
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Link href={`/groups/${group.id}`} className="group flex items-start gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                    <Users size={20} />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                        {group.title}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                        {group.memberCount} membre{group.memberCount > 1 ? "s" : ""} · par {group.creatorName}
                    </p>
                </div>
            </Link>

            {group.description && (
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">{group.description}</p>
            )}

            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                {group.myStatus === "ACCEPTED" && (
                    <>
                        <Link
                            href={`/groups/${group.id}`}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                        >
                            <LogIn size={14} /> Ouvrir
                        </Link>
                        {isCreator ? (
                            <button
                                onClick={() => onDelete(group.id)}
                                disabled={busy}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                                <Trash2 size={14} /> Supprimer
                            </button>
                        ) : (
                            <button
                                onClick={() => onLeave(group.id)}
                                disabled={busy}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                                <LogOut size={14} /> Quitter
                            </button>
                        )}
                    </>
                )}

                {group.myStatus === "INVITED" && (
                    <>
                        <button
                            onClick={() => onAccept(group.id)}
                            disabled={busy}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <Check size={14} /> Accepter
                        </button>
                        <button
                            onClick={() => onRefuse(group.id)}
                            disabled={busy}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <X size={14} /> Refuser
                        </button>
                    </>
                )}

                {group.myStatus === "REQUESTED" && (
                    <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        <Clock size={14} /> Demande en attente
                    </span>
                )}

                {group.myStatus === null && (
                    <button
                        onClick={() => onRequestJoin(group.id)}
                        disabled={busy}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                    >
                        <Lock size={14} /> Demander à rejoindre
                    </button>
                )}
            </div>
        </article>
    );
}
