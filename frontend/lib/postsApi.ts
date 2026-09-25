import { apiFetch } from "./api";

export type PostPrivacy = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export type Post = {
    id: string;
    content: string | null;
    imageUrl: string | null;
    privacy: PostPrivacy;
    allowedViewerIds?: string[] | null;
    authorId: string;
    authorFirstName: string;
    authorLastName: string;
    authorAvatarUrl: string | null;
    likesCount: number;
    likedByMe: boolean;
    commentsCount: number;
    createdAt: string;
};

export type CommentItem = {
    id: string;
    postId: string;
    content: string | null;
    imageUrl: string | null;
    authorId: string;
    authorFirstName: string;
    authorLastName: string;
    authorAvatarUrl: string | null;
    createdAt: string;
};

export type CreatePostData = {
    content?: string;
    imageUrl?: string;
    privacy?: PostPrivacy;
    allowedViewerIds?: string[];
};

export type UpdatePostData = {
    content?: string;
    imageUrl?: string;
    privacy?: PostPrivacy;
    allowedViewerIds?: string[];
};

export const postsApi = {
    getUserPosts: (userId: string) =>
        apiFetch<Post[]>(`/api/users/${userId}/posts`),

    createPost: (data: CreatePostData) =>
        apiFetch<Post>("/api/posts", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    updatePost: (postId: string, data: UpdatePostData) =>
        apiFetch<Post>(`/api/posts/${postId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    deletePost: (postId: string) =>
        apiFetch<void>(`/api/posts/${postId}`, { method: "DELETE" }),

    toggleLike: (postId: string) =>
        apiFetch<void>(`/api/posts/${postId}/like`, { method: "POST" }),

    getComments: (postId: string) =>
        apiFetch<CommentItem[]>(`/api/posts/${postId}/comments`),

    createComment: (postId: string, content: string, imageUrl?: string) =>
        apiFetch<CommentItem>(`/api/posts/${postId}/comments`, {
            method: "POST",
            body: JSON.stringify({ content, imageUrl }),
        }),

    deleteComment: (commentId: string) =>
        apiFetch<void>(`/api/comments/${commentId}`, { method: "DELETE" }),

    uploadPostImage: (file: File) => uploadImage("/api/posts/image", file),

    uploadGroupPostImage: (groupId: string, file: File) =>
        uploadImage(`/api/groups/${groupId}/posts/image`, file),
};

async function uploadImage(path: string, file: File): Promise<string> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        body: formData,
        credentials: "include",
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Upload failed: ${res.status}`);
    }

    const data = (await res.json()) as { imageUrl: string };
    return data.imageUrl;
}

export function formatRelativeTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "à l'instant";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "hier";
    if (days < 7) return `il y a ${days} jours`;

    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
