"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { User } from "@/context/AuthContext";
import Avatar from "./Avatar";

export type PickedUser = {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
};

type UserPickerProps = {
    selected: PickedUser[];
    onChange: (users: PickedUser[]) => void;
    placeholder?: string;
};

export default function UserPicker({ selected, onChange, placeholder }: UserPickerProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!query.trim()) return;
        const timeoutId = setTimeout(async () => {
            setLoading(true);
            try {
                const users = await apiFetch<User[]>(
                    `/api/users/search?query=${encodeURIComponent(query.trim())}`
                );
                setResults(users.filter((u) => !selected.some((s) => s.id === u.id)));
                setIsOpen(true);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [query, selected]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function addUser(u: User) {
        onChange([...selected, { id: u.id, firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl }]);
        setQuery("");
        setResults([]);
        setIsOpen(false);
    }

    function removeUser(id: string) {
        onChange(selected.filter((s) => s.id !== id));
    }

    return (
        <div ref={containerRef} className="relative">
            {selected.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                    {selected.map((u) => (
                        <span
                            key={u.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-1 pr-2 text-xs font-medium text-indigo-700"
                        >
                            <Avatar firstName={u.firstName} lastName={u.lastName} src={u.avatarUrl} size={22} />
                            {u.firstName} {u.lastName}
                            <button
                                type="button"
                                onClick={() => removeUser(u.id)}
                                aria-label="Retirer"
                                className="text-indigo-500 transition hover:text-indigo-800"
                            >
                                <X size={13} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        const value = e.target.value;
                        setQuery(value);
                        if (!value.trim()) {
                            setResults([]);
                            setIsOpen(false);
                            setLoading(false);
                        }
                    }}
                    onFocus={() => query.trim() && setIsOpen(true)}
                    placeholder={placeholder ?? "Rechercher un utilisateur..."}
                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                />
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {loading ? (
                        <div className="p-3 text-center text-xs text-slate-500">Recherche...</div>
                    ) : results.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">Aucun utilisateur trouvé</div>
                    ) : (
                        results.map((u) => (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => addUser(u)}
                                className="flex w-full items-center gap-3 p-2.5 text-left transition hover:bg-slate-50"
                            >
                                <Avatar firstName={u.firstName} lastName={u.lastName} src={u.avatarUrl} size={32} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        {u.firstName} {u.lastName}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {u.nickname ? `@${u.nickname}` : u.email}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
