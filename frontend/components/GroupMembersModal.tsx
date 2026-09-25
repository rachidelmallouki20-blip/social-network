"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { GroupMember } from "@/lib/groupsApi";
import Avatar from "./Avatar";

type GroupMembersModalProps = {
    isOpen: boolean;
    members: GroupMember[];
    creatorId: string;
    onClose: () => void;
};

export default function GroupMembersModal({ isOpen, members, creatorId, onClose }: GroupMembersModalProps) {
    const [query, setQuery] = useState("");

    if (!isOpen) return null;

    const term = query.trim().toLowerCase();
    const filtered = term
        ? members.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(term))
        : members;

    function handleClose() {
        setQuery("");
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-slate-900">Membres ({members.length})</h3>
                    <button
                        onClick={handleClose}
                        aria-label="Fermer"
                        className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {members.length > 0 && (
                    <div className="border-b border-slate-100 px-4 py-3">
                        <div className="relative">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Rechercher un membre..."
                                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                    </div>
                )}

                <div className="flex-1 space-y-1 overflow-y-auto p-4">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-400">
                            {members.length === 0 ? "Aucun membre" : `Aucun résultat pour « ${query.trim()} »`}
                        </div>
                    ) : (
                        filtered.map((m) => (
                            <Link
                                key={m.userId}
                                href={`/profile/${m.userId}`}
                                onClick={handleClose}
                                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"
                            >
                                <Avatar firstName={m.firstName} lastName={m.lastName} src={m.avatarUrl} size={40} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                        {m.firstName} {m.lastName}
                                    </p>
                                </div>
                                {m.userId === creatorId && (
                                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                                        Créateur
                                    </span>
                                )}
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
