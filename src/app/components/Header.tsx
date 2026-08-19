"use client";

import { useState } from "react";
import { Menu, User, Bell, X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import BrandMark from "./BrandMark";

interface HeaderProps {
  onMenuClick: () => void;
  user?: { username: string; balance: number; role: string } | null;
  unreadNotifications?: number;
}

type NotificationItem = {
  id: string | number;
  is_read?: boolean | number;
  title: string;
  body: string;
};

function isNotificationItem(value: unknown): value is NotificationItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (typeof item.id === "string" || typeof item.id === "number") && typeof item.title === "string" && typeof item.body === "string";
}

export default function Header({ onMenuClick, unreadNotifications = 0 }: HeaderProps) {
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = (await res.json()) as { notifications?: unknown };
      const items = Array.isArray(data.notifications) ? data.notifications.filter(isNotificationItem) : [];
      setNotifications(items);
    } catch {}
  };

  const markRead = async () => {
    try {
      await fetch("/api/notifications", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {}
  };

  return (
    <header className="glass sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-[var(--gold)]/25 bg-[linear-gradient(135deg,rgba(120,90,30,0.92),rgba(60,42,15,0.95),rgba(30,22,8,0.95))] px-4">
      <div className="pointer-events-none absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-[var(--gold-light)]/50 to-transparent" />
      {/* Logo on the right (RTL visual left) */}
      <BrandMark
        size="md"
        imageClassName="ring-1 ring-[var(--gold)]/40"
        nameClassName="max-w-[150px] text-xl font-black text-gradient-luxe"
      />

      {/* Icons on the left (RTL visual right) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { const opening = !showNotifications; setShowNotifications(opening); if (opening) { void fetchNotifications(); void markRead(); } }}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--gold)]/40 bg-[rgba(212,175,55,0.14)] text-[var(--color-gold-bright)] backdrop-blur-sm transition hover:bg-[rgba(212,175,55,0.26)] hover:text-[var(--color-gold-bright)]"
          title={t("header.notifications")}
        >
          <Bell size={20} />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </button>
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--gold)]/20 bg-[var(--color-surface)] text-[var(--color-gold-pale)] transition hover:border-[var(--gold)]/50 hover:text-[var(--color-gold-bright)]"
          title={t("header.profile")}
        >
          <User size={20} />
        </button>
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--gold)]/20 bg-[var(--color-surface)] text-[var(--color-gold-pale)] transition hover:border-[var(--gold)]/50 hover:text-[var(--color-gold-bright)]"
          title={t("sidebar.menu")}
        >
          <Menu size={22} />
        </button>
      </div>

      {showNotifications && (
        <div className="absolute left-4 top-[68px] z-[60] w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-[var(--gold)]/30 bg-[rgba(40,30,12,0.97)] p-3 shadow-2xl animate-fadeIn">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-white">{t("header.notifications")}</span>
            <button onClick={() => setShowNotifications(false)}><X size={18} className="text-zinc-400" /></button>
          </div>
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">{t("header.noNotifications")}</p>
          ) : (
            <div className="max-h-[300px] overflow-auto space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className={`rounded-xl p-3 text-sm ${n.is_read ? "bg-[var(--color-surface)] text-zinc-400" : "border border-[var(--gold)]/25 bg-[var(--gold)]/10 text-white"}`}>
                  <div className="font-bold">{n.title}</div>
                  <div className="text-xs opacity-80">{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
