"use client";

import { EventRsvp, GroupEvent, formatEventDate } from "@/lib/eventsApi";
import { CalendarDays, Check, X } from "lucide-react";

type EventCardProps = {
    event: GroupEvent;
    busy?: boolean;
    onRespond: (eventId: string, response: EventRsvp) => void;
};

export default function EventCard({ event, busy, onRespond }: EventCardProps) {
    const going = event.goingCount;
    const notGoing = event.notGoingCount;
    const total = going + notGoing || 1;

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                    <CalendarDays size={20} />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{event.title}</h3>
                    <p className="text-[11px] capitalize text-slate-400">{formatEventDate(event.eventTime)}</p>
                </div>
            </div>

            {event.description && (
                <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                    {event.description}
                </p>
            )}

            <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Check size={13} /> {going} participant{going > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 text-rose-500">
                    <X size={13} /> {notGoing} absent{notGoing > 1 ? "s" : ""}
                </span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${(going / total) * 100}%` }} />
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                    onClick={() => onRespond(event.id, "GOING")}
                    disabled={busy}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                        event.myResponse === "GOING"
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-300 text-slate-600 hover:bg-emerald-50"
                    }`}
                >
                    <Check size={14} /> Je participe
                </button>
                <button
                    onClick={() => onRespond(event.id, "NOT_GOING")}
                    disabled={busy}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                        event.myResponse === "NOT_GOING"
                            ? "bg-rose-600 text-white"
                            : "border border-slate-300 text-slate-600 hover:bg-rose-50"
                    }`}
                >
                    <X size={14} /> Je ne participe pas
                </button>
            </div>
        </article>
    );
}
