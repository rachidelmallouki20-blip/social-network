import { apiFetch } from "./api";

export type EventRsvp = "GOING" | "NOT_GOING";

export type GroupEvent = {
    id: string;
    groupId: string;
    title: string | null;
    description: string | null;
    eventTime: string;
    creatorId: string;
    goingCount: number;
    notGoingCount: number;
    myResponse: EventRsvp | null;
    createdAt: string;
};

export type CreateEventData = {
    title: string;
    description?: string;
    eventTime: string;
};

export const eventsApi = {
    createEvent: (groupId: string, data: CreateEventData) =>
        apiFetch<GroupEvent>(`/api/groups/${groupId}/events`, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    listEvents: (groupId: string) =>
        apiFetch<GroupEvent[]>(`/api/groups/${groupId}/events`),

    respondToEvent: (eventId: string, response: EventRsvp) =>
        apiFetch<GroupEvent>(`/api/events/${eventId}/responses`, {
            method: "POST",
            body: JSON.stringify({ response }),
        }),
};

export function formatEventDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
