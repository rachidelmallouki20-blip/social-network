"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuth, type User } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { markConversationAsRead, notifyMessagesRead } from "@/lib/messagesApi";
import { profileApi, type FollowItem } from "@/lib/profileApi";
import { groupsApi, type Group } from "@/lib/groupsApi";
import Avatar from "@/components/Avatar";
import GroupChat from "@/components/GroupChat";

type ChatMessage = {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    sentAt: string;
};

const EMOJIS = ["😀", "😂", "😍", "😢", "😮", "👍", "🙏", "🔥", "🎉", "❤️"];

type Conversation = {
    friend: FollowItem;
    lastMessage: ChatMessage | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function sortByMostRecent(conversations: Conversation[]): Conversation[] {
    return [...conversations].sort((left, right) => {
        const leftTime = left.lastMessage ? new Date(left.lastMessage.sentAt).getTime() : 0;
        const rightTime = right.lastMessage ? new Date(right.lastMessage.sentAt).getTime() : 0;
        return rightTime - leftTime;
    });
}

export default function MessagesPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const targetUserId = searchParams.get("userId");

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");

    const [friends, setFriends] = useState<FollowItem[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);

    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);

    const [connected, setConnected] = useState(false);
    const stompClientRef = useRef<Client | null>(null);
    const selectedUserRef = useRef<User | null>(null);

    const [chatError, setChatError] = useState<string | null>(null);   // add
    const [showEmoji, setShowEmoji] = useState(false);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        if (!user?.id) return;

        profileApi
            .getFollowing(user.id)
            .then(setFriends)
            .catch((error) => {
                console.error("Could not load friends:", error);
                setFriends([]);
            });
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;

        groupsApi
            .listMyGroups()
            .then(setGroups)
            .catch(() => setGroups([]));
    }, [user?.id]);

    useEffect(() => {
        let isStillMounted = true;

        async function loadConversations() {
            const results = await Promise.all(
                friends.map(async (friend) => {
                    try {
                        const history = await apiFetch<ChatMessage[]>(`/api/messages/${friend.userId}`);
                        return { friend, lastMessage: history.at(-1) ?? null };
                    } catch {
                        return { friend, lastMessage: null };
                    }
                })
            );

            if (isStillMounted) setConversations(sortByMostRecent(results));
        }

        void loadConversations();

        return () => {
            isStillMounted = false;
        };
    }, [friends]);

    useEffect(() => {
        if (!user?.id || !targetUserId) return;

        profileApi
            .getProfile(targetUserId)
            .then((profile) =>
                openPrivateChat({
                    id: profile.id,
                    email: profile.email ?? "",
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    dateOfBirth: profile.dateOfBirth ?? "",
                    avatarUrl: profile.avatarUrl,
                    nickname: profile.nickname,
                    aboutMe: profile.aboutMe,
                    isPublic: profile.isPublic,
                })
            )
            .catch((error) => console.error("Could not open conversation:", error));
    }, [targetUserId, user?.id]);

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
            reconnectDelay: 5000, // auto-retry every 5s if the connection drops
            onConnect: () => {
                setConnected(true);

                client.subscribe("/user/queue/messages", (frame: IMessage) => {
                    const incoming = JSON.parse(frame.body) as ChatMessage;
                    const openChatUser = selectedUserRef.current;

                    const belongsToOpenChat =
                        openChatUser &&
                        (incoming.senderId === openChatUser.id || incoming.receiverId === openChatUser.id);

                    if (!belongsToOpenChat) return;

                    setMessages((previous) => [...previous, incoming]);

                    if (incoming.receiverId === user?.id) {
                        void markConversationAsRead(incoming.senderId)
                            .then(notifyMessagesRead)
                            .catch(() => {});
                    }
                });
                client.subscribe("/user/queue/errors", (frame: IMessage) => {
                    const payload = JSON.parse(frame.body) as { error?: string };
                    setChatError(
                        payload.error ?? "Vous ne pouvez pas envoyer de message à cette personne."
                    );
                });
            },
            onDisconnect: () => setConnected(false),
            onWebSocketError: () => setConnected(false),
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            client.deactivate();
            stompClientRef.current = null;
        };
    }, []);

    async function searchUsers(value: string) {
        setSearch(value);

        if (!value.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const result = await apiFetch<User[]>(`/api/users/search?query=${encodeURIComponent(value)}`);
            setSearchResults(result);
        } finally {
            setSearching(false);
        }
    }

    async function openPrivateChat(target: User) {
        setSelectedUser(target);
        setSelectedGroup(null);
        setSearchResults([]);
        setSearch("");
        setChatError(null);
        setShowEmoji(false); 

        const history = await apiFetch<ChatMessage[]>(`/api/messages/${target.id}`);
        setMessages(history);

        setConversations((previous) => {
            const updated = previous.map((conversation) =>
                conversation.friend.userId === target.id
                    ? { ...conversation, lastMessage: history.at(-1) ?? null }
                    : conversation
            );
            return sortByMostRecent(updated);
        });

        await markConversationAsRead(target.id);
        notifyMessagesRead();
    }

    function openGroupChat(group: Group) {
        setSelectedUser(null);
        setSelectedGroup(group);
        setSearchResults([]);
        setSearch("");
    }

    function sendMessage(event: FormEvent) {
        event.preventDefault();

        const client = stompClientRef.current;
        const hasSomethingToSend = user && selectedUser && text.trim();

        if (!hasSomethingToSend || !client?.connected) return;

        client.publish({
            destination: "/app/chat.send",
            body: JSON.stringify({
                receiverId: selectedUser.id,
                content: text.trim(),
            }),
        });

        setText("");
    }
    function addEmoji(emoji: string) {
        setText((current) => current + emoji);
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold text-slate-900">Messages</h1>
                <p className="text-sm text-slate-500">
                    {connected ? "Connecté" : "Connexion en cours..."}
                </p>
            </div>

            {/* Search box for starting a new conversation with anyone */}
            <div className="relative">
                <input
                    value={search}
                    onChange={(event) => searchUsers(event.target.value)}
                    placeholder="Rechercher une personne..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />

                {(searching || searchResults.length > 0) && (
                    <div className="absolute z-10 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                        {searching ? (
                            <p className="p-4 text-sm text-slate-500">Recherche...</p>
                        ) : (
                            searchResults.map((foundUser) => (
                                <button
                                    key={foundUser.id}
                                    type="button"
                                    onClick={() => openPrivateChat(foundUser)}
                                    className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
                                >
                                    {foundUser.firstName} {foundUser.lastName}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Three possible views: group chat open, private chat open, or the conversation list */}
            {selectedGroup ? (
                <GroupChatView group={selectedGroup} onBack={() => setSelectedGroup(null)} />
            ) : selectedUser ? (
                <PrivateChatView
                    currentUserId={user?.id}
                    otherUser={selectedUser}
                    messages={messages}
                    text={text}     
                    connected={connected}
                    chatError={chatError}          
                    showEmoji={showEmoji}          
                    onToggleEmoji={() => setShowEmoji((v) => !v)}   
                    onEmojiSelect={addEmoji}       
                    onTextChange={setText}
                    onSend={sendMessage}
                    onBack={() => setSelectedUser(null)}
                />
            ) : (
                <ConversationList
                    groups={groups}
                    conversations={conversations}
                    onSelectGroup={openGroupChat}
                    onSelectFriend={(friend) =>
                        openPrivateChat({
                            id: friend.userId,
                            email: friend.email ?? "",
                            firstName: friend.firstName,
                            lastName: friend.lastName,
                            dateOfBirth: "",
                            avatarUrl: friend.avatarUrl,
                            nickname: friend.nickname,
                            isPublic: true,
                        })
                    }
                />
            )}
        </div>
    );
}

function GroupChatView({ group, onBack }: { group: Group; onBack: () => void }) {
    return (
        <div className="space-y-3">
            <button type="button" onClick={onBack} className="text-sm font-medium text-indigo-600 hover:underline">
                ← Toutes les conversations
            </button>
            <GroupChat groupId={group.id} />
        </div>
    );
}

function PrivateChatView({
    currentUserId,
    otherUser,
    messages,
    text,
    connected,
    chatError,          
    showEmoji,          
    onToggleEmoji,      
    onEmojiSelect,
    onTextChange,
    onSend,
    onBack,
}: {
    currentUserId?: string;
    otherUser: User;
    messages: ChatMessage[];
    text: string;
    connected: boolean;
    chatError: string | null;                    
    showEmoji: boolean;                           
    onToggleEmoji: () => void;                    
    onEmojiSelect: (emoji: string) => void;       
    onTextChange: (value: string) => void;
    onSend: (event: FormEvent) => void;
    onBack: () => void;
}) {
    return (
        <div className="flex min-h-[500px] flex-col rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <button type="button" onClick={onBack} className="text-sm font-medium text-indigo-600 hover:underline">
                    ←
                </button>
                <h2 className="font-semibold text-slate-900">
                    {otherUser.firstName} {otherUser.lastName}
                </h2>
            </div>

            {chatError && (                                                                     
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                    {chatError}
                </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {messages.map((message) => {
                    const isOwnMessage = message.senderId === currentUserId;
                    return (
                        <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                            <p
                                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                                    isOwnMessage ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
                                }`}
                            >
                                {message.content}
                            </p>
                        </div>
                    );
                })}
            </div>

            {showEmoji && (                                                                      /* add */
                <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-slate-100 bg-slate-50 p-2">
                    {EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => onEmojiSelect(emoji)}
                            className="rounded-lg p-1.5 text-lg hover:bg-slate-200"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={onSend} className="flex gap-2 border-t border-slate-100 pt-3">
               <button                                                                          /* add */
                    type="button"
                    onClick={onToggleEmoji}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                        showEmoji ? "border-indigo-300 bg-indigo-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    😊
                </button>
                <input
                    value={text}
                    onChange={(event) => onTextChange(event.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <button
                    type="submit"
                    disabled={!connected || !text.trim()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                    Envoyer
                </button>
            </form>
        </div>
    );
}

function ConversationList({
    groups,
    conversations,
    onSelectGroup,
    onSelectFriend,
}: {
    groups: Group[];
    conversations: Conversation[];
    onSelectGroup: (group: Group) => void;
    onSelectFriend: (friend: FollowItem) => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            {groups.length > 0 && (
                <div className="mb-4 border-b border-slate-100 pb-3">
                    <h2 className="mb-2 text-sm font-semibold text-slate-900">Discussions de groupes</h2>
                    <div className="divide-y divide-slate-100">
                        {groups.map((group) => (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => onSelectGroup(group)}
                                className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-slate-50"
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                                    {group.title.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-slate-900">{group.title}</span>
                                    <span className="block truncate text-xs text-slate-500">Discussion du groupe</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <h2 className="mb-3 text-sm font-semibold text-slate-900">Conversations privées</h2>

            {conversations.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">Aucun ami à contacter pour le moment.</p>
            ) : (
                <div className="divide-y divide-slate-100">
                    {conversations.map(({ friend, lastMessage }) => (
                        <button
                            key={friend.userId}
                            type="button"
                            onClick={() => onSelectFriend(friend)}
                            className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-slate-50"
                        >
                            <Avatar firstName={friend.firstName} lastName={friend.lastName} src={friend.avatarUrl} size={40} />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-slate-900">
                                    {friend.firstName} {friend.lastName}
                                </span>
                                <span className="block truncate text-xs text-slate-500">
                                    {lastMessage?.content ?? "Commencer une conversation"}
                                </span>
                            </span>
                            {lastMessage && (
                                <time className="text-[10px] text-slate-400">
                                    {new Date(lastMessage.sentAt).toLocaleDateString("fr-FR")}
                                </time>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}