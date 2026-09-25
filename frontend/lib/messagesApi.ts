import { apiFetch } from "./api";

export type ChatMessage = {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    sentAt: string;
};

export function getConversation(userId: string) {
    return apiFetch<ChatMessage[]>(`/api/messages/${userId}`);
}

export function getUnreadMessageCount() {
    return apiFetch<{ count: number }>("/api/messages/unread-count");
}

export function markConversationAsRead(userId: string) {
    return apiFetch<{ message: string }>(`/api/messages/${userId}/read`, {
        method: "POST",
    });
}

export function notifyMessagesRead() {
    window.dispatchEvent(new Event("messages-read"));
}
