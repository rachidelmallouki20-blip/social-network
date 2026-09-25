"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Post, PostPrivacy, postsApi } from "@/lib/postsApi";
import Avatar, { resolveAvatarUrl } from "./Avatar";
import UserPicker, { PickedUser } from "./UserPicker";

import { ImagePlus, Smile, X, Loader2 } from "lucide-react";

type PostComposerProps = {
    onCreated: (post: Post) => void;
};

const MOODS = ["😊", "😄", "🔥", "❤️", "🎉", "🤔", "😎", "🥳"];

export default function PostComposer({ onCreated }: PostComposerProps) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showMoods, setShowMoods] = useState(false);
    const [privacy, setPrivacy] = useState<PostPrivacy>("PUBLIC");
    const [allowedViewers, setAllowedViewers] = useState<PickedUser[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFileSelect(file: File) {
        if (!file.type.startsWith("image/")) {
            alert("Veuillez sélectionner une image (JPEG, PNG, WEBP, GIF).");
            return;
        }

        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);
        setUploading(true);
        setError(null);

        try {
            const url = await postsApi.uploadPostImage(file);
            setImageUrl(url);
            setPreview(resolveAvatarUrl(url));
        } catch (err) {
            setError((err as Error).message);
            setPreview(null);
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
        if ((!content.trim() && !imageUrl) || submitting || uploading) return;

        setSubmitting(true);
        setError(null);
        try {
            const created = await postsApi.createPost({
                content: content.trim() || undefined,
                imageUrl: imageUrl || undefined,
                privacy,
                allowedViewerIds: privacy === "PRIVATE" ? allowedViewers.map((v) => v.id) : undefined,
            });
            onCreated(created);
            setContent("");
            clearImage();
            setPrivacy("PUBLIC");
            setAllowedViewers([]);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

            <div className="flex items-start gap-3">
                <Avatar firstName={user?.firstName} lastName={user?.lastName} src={user?.avatarUrl} size={44} />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Quoi de neuf, ${user?.firstName ?? ""} ?`}
                    rows={3}
                    className="min-h-[64px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white"
                />
            </div>

            {preview && (
                <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Aperçu" className="max-h-80 w-full object-cover" />
                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    )}
                    {!uploading && (
                        <button
                            type="button"
                            onClick={clearImage}
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                            aria-label="Retirer l'image"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {showMoods && (
                <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                    {MOODS.map((mood) => (
                        <button
                            key={mood}
                            type="button"
                            onClick={() => setContent((c) => `${c}${mood}`)}
                            className="rounded-lg px-2 py-1 text-lg transition hover:bg-white"
                        >
                            {mood}
                        </button>
                    ))}
                </div>
            )}

            {privacy === "PRIVATE" && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-600">Choisir qui peut voir ce post</p>
                    <UserPicker
                        selected={allowedViewers}
                        onChange={setAllowedViewers}
                        placeholder="Rechercher un utilisateur à autoriser..."
                    />
                    <p className="mt-2 text-[11px] text-slate-400">
                        Si personne n&apos;est sélectionné, seul vous verrez ce post.
                    </p>
                </div>
            )}

            {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            preview ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        <ImagePlus size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowMoods((v) => !v)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            showMoods ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        <Smile size={16} className="inline mr-1" /> Humeur
                    </button>
                    <select
                        value={privacy}
                        onChange={(e) => setPrivacy(e.target.value as PostPrivacy)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-indigo-400"
                    >
                        <option value="PUBLIC">🌍 Public</option>
                        <option value="FOLLOWERS">👥 Abonnés</option>
                        <option value="PRIVATE">🔒 Privé</option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={submitting || uploading || (!content.trim() && !imageUrl)}
                    className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {submitting ? "Publication..." : "Publier"}
                </button>
            </div>
        </form>
    );
}
