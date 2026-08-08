"use client";

import { useState, useEffect } from "react";
import { Menu, User, Bell, Zap, X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

interface HeaderProps {
  onMenuClick: () => void;
  user?: { username: string; balance: number; role: string } | null;
  unreadNotifications?: number;
}

export default function Header({ onMenuClick, user, unreadNotifications = 0 }: HeaderProps) {
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (e) {}
  };

  const markRead = async () => {
    try {
      await fetch("/api/notifications", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (e) {}
  };

  useEffect(() => {
    if (showNotifications) fetchNotifications();
  }, [showNotifications]);

  return (
    <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] px-4 shadow-lg">
      {/* Logo on the right (RTL visual left) */}
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
          <Zap size={22} fill="currentColor" />
        </span>
        <span className="text-xl font-black text-white">Follower</span>
      </div>

      {/* Icons on the left (RTL visual right) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markRead(); }}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
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
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
          title={t("header.profile")}
        >
          <User size={20} />
        </button>
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
          title={t("sidebar.menu")}
        >
          <Menu size={22} />
        </button>
      </div>

      {showNotifications && (
        <div className="absolute left-4 top-[68px] z-[60] w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-2xl animate-fadeIn">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-white">{t("header.notifications")}</span>
            <button onClick={() => setShowNotifications(false)}><X size={18} className="text-zinc-400" /></button>
          </div>
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">{t("header.noNotifications")}</p>
          ) : (
            <div className="max-h-[300px] overflow-auto space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className={`rounded-xl p-3 text-sm ${n.is_read ? "bg-[var(--color-surface)] text-zinc-400" : "bg-[var(--color-primary-dark)]/10 text-white border border-[var(--color-primary-dark)]/20"}`}>
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
