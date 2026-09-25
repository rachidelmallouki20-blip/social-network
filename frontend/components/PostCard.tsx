"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Post, PostPrivacy, formatRelativeTime, postsApi } from "@/lib/postsApi";
import { profileApi } from "@/lib/profileApi";
import { copyToClipboard } from "@/lib/clipboard";
import Avatar, { resolveAvatarUrl } from "./Avatar";
import CommentSection from "./CommentSection";
import UserPicker, { PickedUser } from "./UserPicker";

import { Globe2, Users, Lock, Heart, MessageCircle, Share2 } from "lucide-react";

type PostCardProps = {
    post: Post;
    onDeleted?: (id: string) => void;
    onUpdated?: (post: Post) => void;
};

const privacyMeta: Record<string, { icon: React.ReactNode; label: string }> = {
    PUBLIC: { icon: <Globe2 size={12} />, label: "Public" },
    FOLLOWERS: { icon: <Users size={12} />, label: "Abonnés" },
    PRIVATE: { icon: <Lock size={12} />, label: "Privé" },
};

export default function PostCard({ post, onDeleted, onUpdated }: PostCardProps) {
    const { user } = useAuth();
    const isAuthor = user?.id === post.authorId;

    const [liked, setLiked] = useState(post.likedByMe);
    const [likes, setLikes] = useState(post.likesCount);
    const [liking, setLiking] = useState(false);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount ?? 0);
    const [showComments, setShowComments] = useState(false);

    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content ?? "");
    const [editPrivacy, setEditPrivacy] = useState<PostPrivacy>(post.privacy);
    const [editViewers, setEditViewers] = useState<PickedUser[]>([]);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [shared, setShared] = useState(false);

    async function handleLike() {
        if (liking) return;
        const nextLiked = !liked;
        setLiked(nextLiked);
        setLikes((v) => v + (nextLiked ? 1 : -1));
        setLiking(true);
        try {
            await postsApi.toggleLike(post.id);
        } catch {
            setLiked(post.likedByMe);
            setLikes(post.likesCount);
        } finally {
            setLiking(false);
        }
    }

    async function startEditing() {
        setEditing(true);
        setEditContent(post.content ?? "");
        setEditPrivacy(post.privacy);
        setEditViewers([]);
        if (post.privacy === "PRIVATE" && post.allowedViewerIds?.length) {
            const profiles = await Promise.all(
                post.allowedViewerIds.map((id) => profileApi.getProfile(id).catch(() => null))
            );
            setEditViewers(
                profiles
                    .filter((p): p is NonNullable<typeof p> => p !== null)
                    .map((p) => ({
                        id: p.id,
                        firstName: p.firstName,
                        lastName: p.lastName,
                        avatarUrl: p.avatarUrl,
                    }))
            );
        }
    }

    async function handleSave() {
        if (!editContent.trim() || saving) return;
        setSaving(true);
        try {
            const updated = await postsApi.updatePost(post.id, {
                content: editContent.trim(),
                privacy: editPrivacy,
                allowedViewerIds: editPrivacy === "PRIVATE" ? editViewers.map((v) => v.id) : [],
            });
            onUpdated?.(updated);
            setEditing(false);
        } catch (err) {
            alert("Erreur lors de la modification : " + (err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (deleting) return;
        if (!confirm("Supprimer définitivement cette publication ?")) return;
        setDeleting(true);
        try {
            await postsApi.deletePost(post.id);
            onDeleted?.(post.id);
        } catch (err) {
            alert("Erreur lors de la suppression : " + (err as Error).message);
            setDeleting(false);
        }
    }

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <header className="flex items-start gap-3">
                <Link href={`/profile/${post.authorId}`}>
                    <Avatar
                        firstName={post.authorFirstName}
                        lastName={post.authorLastName}
                        src={post.authorAvatarUrl}
                        size={44}
                    />
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                        <Link
                            href={`/profile/${post.authorId}`}
                            className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600"
                        >
                            {post.authorFirstName} {post.authorLastName}
                        </Link>
                        <span className="text-xs text-slate-400">· {formatRelativeTime(post.createdAt)}</span>
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                        {privacyMeta[post.privacy]?.icon}
                        {privacyMeta[post.privacy]?.label ?? post.privacy}
                    </p>
                </div>

                {isAuthor && !editing && (
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            onClick={startEditing}
                            className="rounded-full px-2.5 py-1 font-medium text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
                        >
                            Modifier
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="rounded-full px-2.5 py-1 font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                            Supprimer
                        </button>
                    </div>
                )}
            </header>

            <div className="mt-3">
                {editing ? (
                    <div className="space-y-2">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Visibilité :</span>
                            <select
                                value={editPrivacy}
                                onChange={(e) => setEditPrivacy(e.target.value as PostPrivacy)}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-indigo-400"
                            >
                                <option value="PUBLIC">🌍 Public</option>
                                <option value="FOLLOWERS">👥 Abonnés</option>
                                <option value="PRIVATE">🔒 Privé</option>
                            </select>
                        </div>
                        {editPrivacy === "PRIVATE" && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="mb-2 text-xs font-medium text-slate-600">Qui peut voir ce post</p>
                                <UserPicker
                                    selected={editViewers}
                                    onChange={setEditViewers}
                                    placeholder="Rechercher un utilisateur..."
                                />
                                <p className="mt-2 text-[11px] text-slate-400">
                                    Si personne n&apos;est sélectionné, seul vous verrez ce post.
                                </p>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setEditing(false)}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !editContent.trim()}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                            >
                                {saving ? "Enregistrement..." : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                ) : (
                    post.content && (
                        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-800">
                            {post.content}
                        </p>
                    )
                )}

                {!editing && post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={resolveAvatarUrl(post.imageUrl) ?? undefined}
                        alt="Illustration de la publication"
                        className="mt-3 max-h-96 w-full rounded-xl object-cover"
                    />
                )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                <span>{likes > 0 ? `${likes} J'aime` : "Aucun J'aime"}</span>
                <button
                    onClick={() => setShowComments((v) => !v)}
                    className="rounded-full px-2 py-1 font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                    {showComments
                        ? "Masquer les commentaires"
                        : commentsCount === 0
                        ? "0 commentaire"
                        : commentsCount === 1
                        ? "1 commentaire"
                        : `${commentsCount} commentaires`}
                </button>
            </div>

            <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2">
                <button
                    onClick={handleLike}
                    disabled={liking}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${liked ? "text-rose-500 hover:bg-rose-50" : "text-slate-600 hover:bg-slate-100"
                        }`}
                >
                    <span>{liked ? <Heart size={18} className="fill-rose-500 text-rose-500" /> : <Heart size={18} />}
                    </span> J&apos;aime
                </button>
                <button
                    onClick={() => setShowComments((v) => !v)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
                        showComments ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                    <MessageCircle size={18} /> Commenter
                </button>
                <button
                    onClick={async () => {
                        const url = `${window.location.origin}/profile/${post.authorId}`;
                        const ok = await copyToClipboard(url);
                        if (ok) {
                            setShared(true);
                            setTimeout(() => setShared(false), 2000);
                        }
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                    <Share2 size={18} /> {shared ? "Lien copié !" : "Partager"}
                </button>
            </div>

            {showComments && (
                <CommentSection
                    postId={post.id}
                    onCommentsCountChange={(count) => setCommentsCount(count)}
                    onClose={() => setShowComments(false)}
                />
            )}
        </article>
    );
}
