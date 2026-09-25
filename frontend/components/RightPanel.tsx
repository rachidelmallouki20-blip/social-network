"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { FollowItem, profileApi } from "@/lib/profileApi";
import Avatar from "./Avatar";

export default function RightPanel() {
    const { user } = useAuth();
    const [friends, setFriends] = useState<FollowItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!user?.id) return;
        let active = true;

        // Récupère à la fois les abonnements et les abonnés
        Promise.all([
            profileApi.getFollowing(user.id).catch(() => []),
            profileApi.getFollowers(user.id).catch(() => []),
        ])
            .then(([following, followers]) => {
                if (!active) return;
                const map = new Map<string, FollowItem>();
                following.forEach((f) => map.set(f.userId, f));
                followers.forEach((f) => {
                    if (!map.has(f.userId)) map.set(f.userId, f);
                });
                setFriends(Array.from(map.values()));
            })
            .catch(() => {
                if (active) setFriends([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [user?.id]);

    // Filtrage par recherche
    const filteredFriends = useMemo(() => {
        if (!searchQuery.trim()) return friends;
        const q = searchQuery.toLowerCase();
        return friends.filter(
            (f) =>
                f.firstName.toLowerCase().includes(q) ||
                f.lastName.toLowerCase().includes(q)
        );
    }, [friends, searchQuery]);

    // Limiter strictement à 10 personnes maximum
    const displayedFriends = useMemo(() => {
        return filteredFriends.slice(0, 5);
    }, [filteredFriends]);

    return (
        <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-72 flex-col rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm xl:flex">
            {/* En-tête avec compteur (max 10) */}
            <div className="mb-2.5 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                    Amis en ligne
                </h2>
                {!loading && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                        {displayedFriends.length}
                    </span>
                )}
            </div>

            {/* Barre de recherche compacte (visible si plus de 4 amis au total) */}
            {friends.length > 4 && (
                <div className="relative mb-2.5">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full rounded-xl bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            aria-label="Effacer la recherche"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}

            {/* Liste des amis (10 maximum) avec défilement si nécessaire */}
            <div className="flex-1 space-y-0.5 overflow-y-auto pr-1">
                {loading ? (
                    <div className="space-y-2 p-1">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex animate-pulse items-center gap-2.5 px-2 py-1.5">
                                <div className="h-8 w-8 rounded-full bg-slate-100" />
                                <div className="h-3 w-24 rounded bg-slate-100" />
                            </div>
                        ))}
                    </div>
                ) : friends.length === 0 ? (
                    <div className="px-2 py-8 text-center text-xs text-slate-400">
                        Aucun ami pour le moment.
                    </div>
                ) : filteredFriends.length === 0 ? (
                    <div className="px-2 py-6 text-center text-xs text-slate-400">
                        Aucun résultat pour cette recherche.
                    </div>
                ) : (
                    <>
                        {displayedFriends.map((friend) => (
                            <FriendRow key={friend.userId} friend={friend} />
                        ))}
                        {filteredFriends.length > 10 && (
                            <p className="pt-2 text-center text-[11px] text-slate-400">
                                +{filteredFriends.length - 5} autre{filteredFriends.length - 5 > 1 ? "s" : ""} ami{filteredFriends.length - 5 > 1 ? "s" : ""}
                            </p>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}

function FriendRow({ friend }: { friend: FollowItem }) {
    return (
        <Link
            href={`/messages?userId=${encodeURIComponent(friend.userId)}`}
            className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-100"
        >
            <Avatar
                firstName={friend.firstName}
                lastName={friend.lastName}
                src={friend.avatarUrl}
                size={32}
                online={true}
            />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 group-hover:text-slate-900">
                {friend.firstName} {friend.lastName}
            </span>
        </Link>
    );
}