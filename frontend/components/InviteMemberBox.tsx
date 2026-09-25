"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { groupsApi } from "@/lib/groupsApi";
import { User } from "@/context/AuthContext";
import Avatar from "./Avatar";
import { UserPlus, Search } from "lucide-react";

type InviteMemberBoxProps = {
    groupId: string;
    existingMemberIds: string[];
    onInvited: () => void;
};

export default function InviteMemberBox({ groupId, existingMemberIds, onInvited }: InviteMemberBoxProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query.trim()) return;
        const timeout = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const users = await apiFetch<User[]>(
                    `/api/users/search?query=${encodeURIComponent(query.trim())}`
                );
                setResults(users);
            } catch (err) {
                setError((err as Error).message);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [query]);

    async function handleInvite(userId: string) {
        setBusyId(userId);
        setError(null);
        try {
            await groupsApi.inviteUser(groupId, userId);
            setResults((prev) => prev.filter((u) => u.id !== userId));
            setQuery("");
            onInvited();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Inviter des membres</h3>
            <div className="relative mt-3">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        const value = e.target.value;
                        setQuery(value);
                        if (!value.trim()) {
                            setResults([]);
                            setLoading(false);
                        }
                    }}
                    placeholder="Rechercher un utilisateur à inviter..."
                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                />
            </div>

            {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

            {loading && <p className="mt-3 text-xs text-slate-400">Recherche...</p>}

            {!loading && results.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100">
                    {results.map((u) => {
                        const alreadyIn = existingMemberIds.includes(u.id);
                        return (
                            <li key={u.id} className="flex items-center gap-3 py-2">
                                <Avatar firstName={u.firstName} lastName={u.lastName} src={u.avatarUrl} size={36} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        {u.firstName} {u.lastName}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {u.nickname ? `@${u.nickname}` : u.email}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleInvite(u.id)}
                                    disabled={busyId === u.id || alreadyIn}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40"
                                >
                                    <UserPlus size={13} />
                                    {alreadyIn ? "Déjà membre" : "Inviter"}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {!loading && query.trim() && results.length === 0 && (
                <p className="mt-3 text-xs text-slate-400">Aucun utilisateur trouvé.</p>
            )}
        </div>
    );
}
