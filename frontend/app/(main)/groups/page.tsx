"use client";

import { useEffect, useMemo, useState } from "react";
import { groupsApi, Group } from "@/lib/groupsApi";
import GroupCard from "@/components/GroupCard";
import CreateGroupModal from "@/components/CreateGroupModal";
import { Plus, Search, Users } from "lucide-react";

type Tab = "all" | "mine" | "invitations";

const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "Tous les groupes" },
    { key: "mine", label: "Mes groupes" },
    { key: "invitations", label: "Invitations" },
];

export default function GroupsPage() {
    const [tab, setTab] = useState<Tab>("all");
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const data =
                    tab === "all"
                        ? await groupsApi.listAllGroups()
                        : tab === "mine"
                        ? await groupsApi.listMyGroups()
                        : await groupsApi.listMyInvitations();
                if (!active) return;
                setGroups(data);
                setError(null);
            } catch (err) {
                if (active) setError((err as Error).message);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [tab]);

    async function handleRequestJoin(groupId: string) {
        setBusyId(groupId);
        try {
            await groupsApi.requestToJoin(groupId);
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, myStatus: "REQUESTED" } : g))
            );
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    async function handleAccept(groupId: string) {
        setBusyId(groupId);
        try {
            const updated = await groupsApi.acceptInvitation(groupId);
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? updated : g))
            );
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    async function handleRefuse(groupId: string) {
        setBusyId(groupId);
        try {
            await groupsApi.refuseInvitation(groupId);
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    async function handleLeave(groupId: string) {
        if (!confirm("Quitter ce groupe ?")) return;
        setBusyId(groupId);
        try {
            await groupsApi.leaveGroup(groupId);
            if (tab === "mine") {
                setGroups((prev) => prev.filter((g) => g.id !== groupId));
            } else {
                setGroups((prev) =>
                    prev.map((g) =>
                        g.id === groupId
                            ? { ...g, myStatus: null, memberCount: Math.max(0, g.memberCount - 1) }
                            : g
                    )
                );
            }
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(groupId: string) {
        if (!confirm("Supprimer définitivement ce groupe et tout son contenu ?")) return;
        setBusyId(groupId);
        try {
            await groupsApi.deleteGroup(groupId);
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    const visibleGroups = useMemo(() => {
        if (tab !== "all" || !query.trim()) return groups;
        const q = query.trim().toLowerCase();
        return groups.filter((g) => g.title.toLowerCase().includes(q));
    }, [groups, tab, query]);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Groupes</h1>
                    <p className="text-sm text-slate-500">
                        Créez, rejoignez et échangez avec les membres de vos groupes.
                    </p>
                </div>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                    <Plus size={16} /> Créer un groupe
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => {
                            if (t.key !== tab) setLoading(true);
                            setTab(t.key);
                        }}
                        className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                            tab === t.key
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "all" && (
                <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher un groupe par titre..."
                        className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>
            )}

            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                    Chargement des groupes...
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-rose-600 shadow-sm">
                    {error}
                </div>
            ) : visibleGroups.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <Users size={32} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                        {tab === "all"
                            ? "Aucun groupe pour le moment."
                            : tab === "mine"
                            ? "Vous n'avez encore rejoint aucun groupe."
                            : "Aucune invitation en attente."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {visibleGroups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            busy={busyId === group.id}
                            onRequestJoin={handleRequestJoin}
                            onAccept={handleAccept}
                            onRefuse={handleRefuse}
                            onLeave={handleLeave}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <CreateGroupModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={(group) => {
                    setGroups((prev) => [group, ...prev]);
                    setLoading(true);
                    setTab("mine");
                }}
            />
        </div>
    );
}
