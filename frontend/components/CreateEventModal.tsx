"use client";

import { useState } from "react";
import { eventsApi, GroupEvent } from "@/lib/eventsApi";
import { X } from "lucide-react";

type CreateEventModalProps = {
    isOpen: boolean;
    groupId: string;
    onClose: () => void;
    onCreated: (event: GroupEvent) => void;
};

export default function CreateEventModal({ isOpen, groupId, onClose, onCreated }: CreateEventModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [eventTime, setEventTime] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !eventTime || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const created = await eventsApi.createEvent(groupId, {
                title: title.trim(),
                description: description.trim() || undefined,
                eventTime,
            });
            onCreated(created);
            setTitle("");
            setDescription("");
            setEventTime("");
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">Créer un événement</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700">Titre</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex : Match amical"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700">Date et heure</label>
                        <input
                            type="datetime-local"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Détails de l'événement..."
                            className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                        />
                    </div>

                    {error && <p className="text-xs text-rose-500">{error}</p>}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !title.trim() || !eventTime}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {submitting ? "Création..." : "Créer"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
