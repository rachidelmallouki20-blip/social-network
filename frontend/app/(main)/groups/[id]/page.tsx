"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { groupsApi, Group, GroupMember } from "@/lib/groupsApi";
import { eventsApi, GroupEvent, EventRsvp } from "@/lib/eventsApi";
import { Post } from "@/lib/postsApi";
import PostCard from "@/components/PostCard";
import GroupPostComposer from "@/components/GroupPostComposer";
import EventCard from "@/components/EventCard";
import CreateEventModal from "@/components/CreateEventModal";
import InviteMemberBox from "@/components/InviteMemberBox";
import GroupMembersModal from "@/components/GroupMembersModal";
import Avatar from "@/components/Avatar";

import { ArrowLeft, CalendarPlus, Check, Clock, FileText, Lock, Users, X } from "lucide-react";

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: groupId } = use(params);
    const { user } = useAuth();

    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [requests, setRequests] = useState<GroupMember[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [events, setEvents] = useState<GroupEvent[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [tab, setTab] = useState<"posts" | "events">("posts");

    const isMember = group?.myStatus === "ACCEPTED";
    const isCreator = !!user && group?.creatorId === user.id;

    const loadGroup = useCallback(async () => {
        const g = await groupsApi.getGroupDetail(groupId);
        setGroup(g);
        return g;
    }, [groupId]);

    const loadMemberContent = useCallback(async () => {
        const [m, p, e] = await Promise.all([
            groupsApi.listMembers(groupId),
            groupsApi.getGroupPosts(groupId),
            eventsApi.listEvents(groupId),
        ]);
        setMembers(m);
        setPosts(p);
        setEvents(e);
    }, [groupId]);

    const loadRequests = useCallback(async () => {
        try {
            setRequests(await groupsApi.listPendingRequests(groupId));
        } catch {
            setRequests([]);
        }
    }, [groupId]);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const g = await groupsApi.getGroupDetail(groupId);
                if (!active) return;
                setGroup(g);
                if (g.myStatus === "ACCEPTED") {
                    await loadMemberContent();
                    if (user?.id === g.creatorId) await loadRequests();
                }
            } catch (err) {
                if (active) setError((err as Error).message);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [groupId, user?.id, loadMemberContent, loadRequests]);

    async function handleRequestJoin() {
        setBusy(true);
        try {
            await groupsApi.requestToJoin(groupId);
            await loadGroup();
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function handleAcceptInvitation() {
        setBusy(true);
        try {
            const updated = await groupsApi.acceptInvitation(groupId);
            setGroup(updated);
            await loadMemberContent();
            if (updated.creatorId === user?.id) await loadRequests();
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function handleRefuseInvitation() {
        setBusy(true);
        try {
            const updated = await groupsApi.refuseInvitation(groupId);
            setGroup(updated);
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function handleRespondEvent(eventId: string, response: EventRsvp) {
        try {
            const updated = await eventsApi.respondToEvent(eventId, response);
            setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        }
    }

    async function handleAcceptRequest(userId: string) {
        try {
            const updated = await groupsApi.acceptJoinRequest(groupId, userId);
            setGroup(updated);
            setRequests((prev) => prev.filter((r) => r.userId !== userId));
            setMembers(await groupsApi.listMembers(groupId));
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        }
    }

    async function handleRefuseRequest(userId: string) {
        try {
            await groupsApi.refuseJoinRequest(groupId, userId);
            setRequests((prev) => prev.filter((r) => r.userId !== userId));
        } catch (err) {
            alert("Erreur : " + (err as Error).message);
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                Chargement du groupe...
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="font-medium text-rose-600">{error ?? "Groupe introuvable"}</p>
                <Link href="/groups" className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
                    <ArrowLeft size={15} /> Retour aux groupes
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
                <ArrowLeft size={15} /> Tous les groupes
            </Link>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-24 bg-gradient-to-r from-violet-300 to-indigo-400" />
                <div className="px-5 pb-5">
                    <div className="-mt-8 flex items-start gap-4">
                        <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-indigo-600 text-white shadow">
                            <Users size={26} />
                        </span>
                        <div className="min-w-0 flex-1 pt-4">
                            <h1 className="-mt-3 text-xl font-bold text-slate-900">{group.title}</h1>
                            <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                                {isMember ? (
                                    <button
                                        onClick={() => setMembersModalOpen(true)}
                                        className="font-semibold text-slate-700 transition hover:text-indigo-600"
                                    >
                                        {group.memberCount} membre{group.memberCount > 1 ? "s" : ""}
                                    </button>
                                ) : (
                                    <span>
                                        {group.memberCount} membre{group.memberCount > 1 ? "s" : ""}
                                    </span>
                                )}
                                <span>· créé par {group.creatorName}</span>
                            </p>
                        </div>
                    </div>

                    {group.description && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                            {group.description}
                        </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {group.myStatus === null && (
                            <button
                                onClick={handleRequestJoin}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                            >
                                <Lock size={15} /> Demander à rejoindre
                            </button>
                        )}
                        {group.myStatus === "REQUESTED" && (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                                <Clock size={15} /> Demande en attente
                            </span>
                        )}
                        {group.myStatus === "INVITED" && (
                            <>
                                <button
                                    onClick={handleAcceptInvitation}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <Check size={15} /> Accepter l&apos;invitation
                                </button>
                                <button
                                    onClick={handleRefuseInvitation}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <X size={15} /> Refuser
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {!isMember ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <Lock size={32} className="mx-auto text-slate-300" />
                    <h3 className="mt-2 text-base font-semibold text-slate-900">Contenu réservé aux membres</h3>
                    <p className="mx-auto max-w-sm text-sm text-slate-500">
                        Rejoignez ce groupe pour voir les publications, les événements et les membres.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Inviter des membres */}
                    <InviteMemberBox
                        groupId={groupId}
                        existingMemberIds={members.map((m) => m.userId)}
                        onInvited={() => {}}
                    />

                    {/* Onglets Publications / Événements */}
                    <div className="flex items-center gap-2 border-b border-slate-200">
                        <button
                            onClick={() => setTab("posts")}
                            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
                                tab === "posts"
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Publications
                        </button>
                        <button
                            onClick={() => setTab("events")}
                            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
                                tab === "events"
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Événements
                        </button>
                    </div>

                    {tab === "events" && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-end">
                                <button
                                    onClick={() => setEventModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    <CalendarPlus size={15} /> Créer un événement
                                </button>
                            </div>
                            {events.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                    <CalendarPlus size={30} className="mx-auto text-slate-300" />
                                    <p className="mt-2 text-sm text-slate-500">Aucun événement pour le moment.</p>
                                </div>
                            ) : (
                                events.map((event) => (
                                    <EventCard key={event.id} event={event} onRespond={handleRespondEvent} />
                                ))
                            )}
                        </section>
                    )}

                    {tab === "posts" && (
                        <section className="space-y-4">
                            <GroupPostComposer groupId={groupId} onCreated={(p) => setPosts((prev) => [p, ...prev])} />
                            {posts.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                    <FileText size={30} className="mx-auto text-slate-300" />
                                    <p className="mt-2 text-sm text-slate-500">Aucune publication dans ce groupe.</p>
                                </div>
                            ) : (
                                posts.map((post) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        onDeleted={(pid) => setPosts((prev) => prev.filter((p) => p.id !== pid))}
                                        onUpdated={(updated) =>
                                            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                                        }
                                    />
                                ))
                            )}
                        </section>
                    )}

                    {/* Demandes d'adhésion (créateur) */}
                    {isCreator && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900">
                                Demandes d&apos;adhésion ({requests.length})
                            </h3>
                            {requests.length === 0 ? (
                                <p className="mt-3 text-xs text-slate-400">Aucune demande en attente.</p>
                            ) : (
                                <ul className="mt-3 divide-y divide-slate-100">
                                    {requests.map((r) => (
                                        <li key={r.userId} className="flex items-center gap-3 py-2">
                                            <Avatar firstName={r.firstName} lastName={r.lastName} src={r.avatarUrl} size={36} />
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                                                {r.firstName} {r.lastName}
                                            </span>
                                            <button
                                                onClick={() => handleAcceptRequest(r.userId)}
                                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                            >
                                                Accepter
                                            </button>
                                            <button
                                                onClick={() => handleRefuseRequest(r.userId)}
                                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                            >
                                                Refuser
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </div>
            )}

            <CreateEventModal
                isOpen={eventModalOpen}
                groupId={groupId}
                onClose={() => setEventModalOpen(false)}
                onCreated={(event) => setEvents((prev) => [event, ...prev])}
            />

            <GroupMembersModal
                isOpen={membersModalOpen}
                members={members}
                creatorId={group.creatorId}
                onClose={() => setMembersModalOpen(false)}
            />
        </div>
    );
}
