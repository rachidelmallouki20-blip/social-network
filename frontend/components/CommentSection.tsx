"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Send, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CommentItem, formatRelativeTime, postsApi } from "@/lib/postsApi";
import Avatar, { resolveAvatarUrl } from "./Avatar";

type CommentSectionProps = {
    postId: string;
    onCommentsCountChange?: (count: number) => void;
    onClose?: () => void;
};

export default function CommentSection({ postId, onCommentsCountChange, onClose }: CommentSectionProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(5);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let active = true;
        postsApi
            .getComments(postId)
            .then((data) => {
                if (!active) return;
                // Tri par ordre antéchronologique (du plus récent au plus ancien)
                const sorted = [...data].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setComments(sorted);
                onCommentsCountChange?.(sorted.length);
            })
            .catch((err) => {
                if (active) setError((err as Error).message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [postId, onCommentsCountChange]);

    async function handleFileSelect(file: File) {
        if (!file.type.startsWith("image/")) {
            alert("Veuillez sélectionner une image ou un GIF (JPEG, PNG, WEBP, GIF).");
            return;
        }

        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);
        setUploading(true);
        setError(null);

        try {
            const url = await postsApi.uploadPostImage(file);
            setImageUrl(url);
            setPreview(resolveAvatarUrl(url) ?? url);
        } catch (err) {
            setError((err as Error).message);
            setPreview(null);
            setImageUrl("");
        } finally {
            URL.revokeObjectURL(localPreview);
            setUploading(false);
        }
    }

    function clearImage() {
        setImageUrl("");
        setPreview(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if ((!text.trim() && !imageUrl) || sending || uploading) return;

        setSending(true);
        setError(null);
        try {
            const created = await postsApi.createComment(postId, text.trim(), imageUrl || undefined);
            // Ajoute le nouveau commentaire tout en haut (1er)
            const next = [created, ...comments];
            setComments(next);
            onCommentsCountChange?.(next.length);
            setText("");
            clearImage();
            // On ne modifie pas visibleCount : ainsi, seuls les 5 plus récents sont affichés,
            // et l'ancien 5ème (devenu 6ème) passe sous le bouton "Voir plus"
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSending(false);
        }
    }

    async function handleDeleteComment(commentId: string) {
        if (!confirm("Supprimer ce commentaire ?")) return;
        try {
            await postsApi.deleteComment(commentId);
            const next = comments.filter((c) => c.id !== commentId);
            setComments(next);
            onCommentsCountChange?.(next.length);
        } catch (err) {
            alert("Erreur lors de la suppression : " + (err as Error).message);
        }
    }

    const displayedComments = comments.slice(0, visibleCount);

    return (
        <div className="mt-3 border-t border-slate-100 pt-3">
            {loading ? (
                <p className="py-2 text-center text-xs text-slate-400">Chargement des commentaires...</p>
            ) : comments.length === 0 ? (
                <div className="flex items-center justify-between px-1 py-2">
                    <p className="text-xs text-slate-400">Soyez le premier à commenter.</p>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                        >
                            Masquer
                        </button>
                    )}
                </div>
            ) : (
                <ul className="space-y-3">
                    {displayedComments.map((comment) => {
                        const isAuthor = user?.id === comment.authorId;
                        return (
                            <li key={comment.id} className="group flex items-start gap-2.5">
                                <Avatar
                                    firstName={comment.authorFirstName}
                                    lastName={comment.authorLastName}
                                    src={comment.authorAvatarUrl}
                                    size={32}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="relative inline-block max-w-full rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2">
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-xs font-semibold text-slate-900">
                                                {comment.authorFirstName} {comment.authorLastName}
                                            </p>
                                            <span className="text-[10px] text-slate-400">
                                                {formatRelativeTime(comment.createdAt)}
                                            </span>
                                        </div>

                                        {comment.content && (
                                            <p className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-700">
                                                {comment.content}
                                            </p>
                                        )}

                                        {comment.imageUrl && (
                                            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={resolveAvatarUrl(comment.imageUrl) ?? comment.imageUrl}
                                                    alt="Pièce jointe du commentaire"
                                                    className="max-h-60 max-w-full rounded-xl object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Action supprimer pour l'auteur */}
                                    {isAuthor && (
                                        <div className="mt-1 flex items-center gap-2 pl-2">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="flex items-center gap-1 text-[11px] text-slate-400 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                                            >
                                                <Trash2 size={11} /> Supprimer
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Actions sous la liste des commentaires (Voir plus & Masquer tout) */}
            {!loading && comments.length > 0 && (
                <div className="my-3 flex items-center justify-between px-1">
                    {comments.length > visibleCount ? (
                        <button
                            type="button"
                            onClick={() => setVisibleCount((prev) => prev + 5)}
                            className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                        >
                            Voir plus de commentaires ({comments.length - visibleCount} restant{comments.length - visibleCount > 1 ? "s" : ""})
                        </button>
                    ) : (
                        <span className="text-[11px] text-slate-400">
                            Tous les commentaires sont affichés ({comments.length})
                        </span>
                    )}

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-800"
                        >
                            Masquer tout
                        </button>
                    )}
                </div>
            )}

            {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

            {/* Formulaire de saisie d'un commentaire */}
            <form onSubmit={handleSubmit} className="mt-3">
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                        e.target.value = "";
                    }}
                />

                {/* Aperçu de l'image/GIF sélectionné */}
                {preview && (
                    <div className="relative mb-2 ml-10 inline-block overflow-hidden rounded-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Aperçu" className="max-h-24 max-w-xs rounded-xl object-cover" />
                        {uploading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                                <Loader2 size={18} className="animate-spin" />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={clearImage}
                                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                                aria-label="Supprimer l'image"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <Avatar firstName={user?.firstName} lastName={user?.lastName} src={user?.avatarUrl} size={32} />
                    <div className="relative flex flex-1 items-center">
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Écrire un commentaire..."
                            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className={`absolute right-2.5 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50 ${
                                imageUrl ? "text-indigo-600" : ""
                            }`}
                            title="Ajouter une image ou un GIF"
                            aria-label="Ajouter une image ou un GIF"
                        >
                            <ImagePlus size={17} />
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={sending || uploading || (!text.trim() && !imageUrl)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Envoyer le commentaire"
                        aria-label="Envoyer"
                    >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    </button>
                </div>
            </form>
        </div>
    );
}
