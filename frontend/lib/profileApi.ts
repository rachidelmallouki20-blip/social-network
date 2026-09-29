import { apiFetch } from "./api";

export type Profile = {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    avatarUrl: string | null;
    nickname: string | null;
    aboutMe: string | null;
    isPublic: boolean;
    createdAt: string;
    followersCount: number;
    followingCount: number;
    followStatus: "SELF" | "NONE" | "PENDING" | "ACCEPTED";
    canViewContent: boolean;
};

export type FollowItem = {
    followId: string | null;
    userId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    nickname: string | null;
    status: string;
    createdAt: string | null;
    isOnline?: boolean;
};

export type UpdateProfileData = {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    avatarUrl?: string;
    nickname?: string;
    aboutMe?: string;
    isPublic?: boolean;
};

export const profileApi = {
    // Récupérer un profil par son ID (ou "me")
    getProfile: (userId: string) => 
        apiFetch<Profile>(`/api/profile/${userId}`),

    // Mettre à jour son propre profil (infos + toggle public/privé)
    updateProfile: (data: UpdateProfileData) =>
        apiFetch<Profile>("/api/profile/me", {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    // Uploader un fichier image d'avatar depuis les fichiers locaux / galerie
    uploadAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
        const res = await fetch(`${API_BASE}/api/profile/avatar`, {
            method: "POST",
            body: formData,
            credentials: "include",
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `Upload failed: ${res.status}`);
        }
        return res.json() as Promise<Profile>;
    },

    // Follow / Unfollow un utilisateur
    toggleFollow: (userId: string) =>
        apiFetch<FollowItem>(`/api/profile/${userId}/follow`, {
            method: "POST",
        }),

    // Récupérer les followers d'un utilisateur
    getFollowers: (userId: string) =>
        apiFetch<FollowItem[]>(`/api/profile/${userId}/followers`),

    // Récupérer les personnes suivies par un utilisateur
    getFollowing: (userId: string) =>
        apiFetch<FollowItem[]>(`/api/profile/${userId}/following`),

    // Récupérer les demandes de follow reçues en attente
    getPendingRequests: () =>
        apiFetch<FollowItem[]>("/api/profile/requests"),

    // Accepter une demande de follow
    acceptRequest: (followId: string) =>
        apiFetch<{ message: string }>(`/api/profile/requests/${followId}/accept`, {
            method: "POST",
        }),

    // Refuser une demande de follow
    rejectRequest: (followId: string) =>
        apiFetch<{ message: string }>(`/api/profile/requests/${followId}/reject`, {
            method: "POST",
        }),
};