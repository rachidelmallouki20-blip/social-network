"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { notificationsApi } from "@/lib/notificationsApi";
import { getUnreadMessageCount } from "@/lib/messagesApi";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import Avatar from "@/components/Avatar";

import { Home, User, Users, MessageCircle, Bell } from "lucide-react";

const NAV_ITEMS = [
    { href: "/", label: "Fil d'actualité", icon: Home },
    { href: "/profile/me", label: "Mon profil", icon: User },
    { href: "/groups", label: "Groupes", icon: Users },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/notifications", label: "Notifications", icon: Bell },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [loading, user, router]);

    useEffect(() => {
        if (!user?.id) return;
        let active = true;

        async function loadUnreadCount() {
            try {
                const [notificationCount, messageResult] = await Promise.all([
                    notificationsApi.getUnreadCount(),
                    getUnreadMessageCount(),
                ]);
                if (active) {
                    setUnreadNotifications(notificationCount);
                    setUnreadMessages(messageResult.count);
                }
            } catch {
                if (active) {
                    setUnreadNotifications(0);
                    setUnreadMessages(0);
                }
            }
        }

        void loadUnreadCount();
        window.addEventListener("messages-read", loadUnreadCount);

        return () => {
            active = false;
            window.removeEventListener("messages-read", loadUnreadCount);
        };
    }, [user?.id, pathname]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <p className="text-sm text-slate-500">Chargement de la session...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                            ✦
                        </span>
                        <span className="font-bold text-slate-900">SocialNet</span>
                    </Link>
                    <Link href="/profile/me">
                        <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size={36} online />
                    </Link>
                </div>
                <nav className="flex-1 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active =
                            item.href === "/"
                                ? pathname === "/"
                                : pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="flex-1">{item.label}</span>
                                {item.href === "/notifications" && unreadNotifications > 0 && (
                                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                                    </span>
                                )}
                                {item.href === "/messages" && unreadMessages > 0 && (
                                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                        {unreadMessages > 99 ? "99+" : unreadMessages}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
                <Sidebar />
                <main className="min-w-0 flex-1">{children}</main>
                <RightPanel />
            </div>
        </div>
    );
}
