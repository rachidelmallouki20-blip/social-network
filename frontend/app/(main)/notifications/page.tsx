"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notificationsApi, type NotificationItem } from "@/lib/notificationsApi";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        async function loadNotifications() {
            try {
                const result = await notificationsApi.getAll();
                if (active) setNotifications(result);
            } catch (err) {
                if (active) setError((err as Error).message);
            } finally {
                if (active) setLoading(false);
            }
        }

        void loadNotifications();

        return () => {
            active = false;
        };
    }, []);

    async function markAsRead(notification: NotificationItem) {
        if (notification.read) {
            return;
        }

        await notificationsApi.markAsRead(notification.id);

        setNotifications((previous) =>
            previous.map((item) =>
                item.id === notification.id
                    ? { ...item, read: true }
                    : item
            )
        );
    }

    async function markAllAsRead() {
        await notificationsApi.markAllAsRead();

        setNotifications((previous) =>
            previous.map((item) => ({ ...item, read: true }))
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">
                        Notifications
                    </h1>
                    <p className="text-sm text-slate-500">
                        Vos dernières notifications
                    </p>
                </div>

                {notifications.some((notification) => !notification.read) && (
                    <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                        Tout marquer comme lu
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    Chargement...
                </div>
            ) : notifications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    Aucune notification.
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((notification) => (
                        <Link
                            key={notification.id}
                            href={notification.href ?? "/notifications"}
                            onClick={() => {
                                void markAsRead(notification);
                            }}
                            className={`w-full rounded-xl border p-4 text-left transition ${
                                notification.read
                                    ? "border-slate-200 bg-white"
                                    : "border-indigo-200 bg-indigo-50 hover:border-indigo-300"
                            }`}
                        >
                            <p className="text-sm font-medium text-slate-900">
                                {notification.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                {notification.details}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                {new Date(
                                    notification.createdAt
                                ).toLocaleString("fr-FR")}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
