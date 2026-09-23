import { apiFetch } from "./api";
import { Post } from "./postsApi";

export type GroupMemberStatus = "INVITED" | "REQUESTED" | "ACCEPTED";

export type Group = {
    id: string;
    title: string;
    description: string | null;
    creatorId: string;
    creatorName: string;
    memberCount: number;
    myStatus: GroupMemberStatus | null;
    createdAt: string;
};

export type GroupMember = {
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    status: GroupMemberStatus;
};

export type GroupChatMessage = {
    id: string;
    groupId: string;
    senderId: string;
    senderFirstName: string;
    senderLastName: string;
    senderAvatarUrl: string | null;
    content: string;
    sentAt: string;
};

export type CreateGroupData = {
    title: string;
    description?: string;
};

export const groupsApi = {
    // ---------- Groupes ----------
    createGroup: (data: CreateGroupData) =>
        apiFetch<Group>("/api/groups", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    listAllGroups: () => apiFetch<Group[]>("/api/groups"),

    getGroupDetail: (groupId: string) => apiFetch<Group>(`/api/groups/${groupId}`),

    listMembers: (groupId: string) =>
        apiFetch<GroupMember[]>(`/api/groups/${groupId}/members`),

    listMyGroups: () => apiFetch<Group[]>("/api/users/me/groups"),

    leaveGroup: (groupId: string) =>
        apiFetch<void>(`/api/groups/${groupId}/leave`, { method: "POST" }),

    deleteGroup: (groupId: string) =>
        apiFetch<void>(`/api/groups/${groupId}`, { method: "DELETE" }),

    listMyInvitations: () => apiFetch<Group[]>("/api/users/me/group-invitations"),

    // ---------- Invitations ----------
    inviteUser: (groupId: string, userId: string) =>
        apiFetch<GroupMember>(`/api/groups/${groupId}/invite`, {
            method: "POST",
            body: JSON.stringify({ userId }),
        }),

    acceptInvitation: (groupId: string) =>
        apiFetch<Group>(`/api/groups/${groupId}/invitation/accept`, { method: "POST" }),

    refuseInvitation: (groupId: string) =>
        apiFetch<Group>(`/api/groups/${groupId}/invitation/refuse`, { method: "POST" }),

    // ---------- Demandes d'adhésion ----------
    requestToJoin: (groupId: string) =>
        apiFetch<GroupMember>(`/api/groups/${groupId}/join-request`, { method: "POST" }),

    listPendingRequests: (groupId: string) =>
        apiFetch<GroupMember[]>(`/api/groups/${groupId}/requests`),

    acceptJoinRequest: (groupId: string, userId: string) =>
        apiFetch<Group>(`/api/groups/${groupId}/requests/${userId}/accept`, { method: "POST" }),

    refuseJoinRequest: (groupId: string, userId: string) =>
        apiFetch<Group>(`/api/groups/${groupId}/requests/${userId}/refuse`, { method: "POST" }),

    // ---------- Posts de groupe ----------
    getGroupPosts: (groupId: string) =>
        apiFetch<Post[]>(`/api/groups/${groupId}/posts`),

    getGroupMessages: (groupId: string) =>
        apiFetch<GroupChatMessage[]>(`/api/groups/${groupId}/messages`),

    sendGroupMessage: (groupId: string, content: string) =>
        apiFetch<GroupChatMessage>(`/api/groups/${groupId}/messages`, {
            method: "POST",
            body: JSON.stringify({ content }),
        }),

    createGroupPost: (groupId: string, data: { content?: string; imageUrl?: string }) =>
        apiFetch<Post>(`/api/groups/${groupId}/posts`, {
            method: "POST",
            body: JSON.stringify(data),
        }),
};
