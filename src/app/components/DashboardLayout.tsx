"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import { useLiveRefresh } from "./useLiveRefresh";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ username: string; balance: number; role: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const router = useRouter();
  const firstLoadRef = useRef(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user", {
        cache: "no-store",
        credentials: "include",
      });

      // Only a deliberate/expired session should send the user to login.
      // A 5xx, proxy hiccup, or temporary Turso failure must not look like logout.
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      if (!data?.user) {
        return;
      }
      setUser(data.user);
      setUnread(Number(data.unreadNotifications || 0));
    } catch {
      // Preserve the current session view during transient network failures.
    } finally {
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        setLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshUser();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshUser]);

  useLiveRefresh(refreshUser, { intervalMs: 30000 });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Header onMenuClick={() => setSidebarOpen(true)} user={user} unreadNotifications={unread} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      <main className="flex-1 pb-28 pt-4 px-4">{children}</main>
      <BottomNav />
    </div>
  );
}
