
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import { useLiveRefresh } from "./useLiveRefresh";

type DashboardUser = { username: string; balance: number; role: string };

type UserSnapshot = {
  user: DashboardUser;
  unread: number;
  fetchedAt: number;
};

let clientSnapshot: UserSnapshot | null = null;
let clientRequest: Promise<void> | null = null;
const CLIENT_SNAPSHOT_TTL_MS = 15_000;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(clientSnapshot?.user || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(!clientSnapshot);
  const [unread, setUnread] = useState(clientSnapshot?.unread || 0);
  const router = useRouter();
  const pathname = usePathname();
  const mountedRef = useRef(true);

  const refreshUser = useCallback(async () => {
    if (clientRequest) {
      await clientRequest;
      return;
    }

    if (clientSnapshot && Date.now() - clientSnapshot.fetchedAt < CLIENT_SNAPSHOT_TTL_MS) {
      if (mountedRef.current) {
        setUser(clientSnapshot.user);
        setUnread(clientSnapshot.unread);
        setLoading(false);
      }
      return;
    }

    const request = (async () => {
      try {
        const res = await fetch("/api/user", {
          cache: "no-store",
          credentials: "include",
        });

        // Only a deliberate/expired session should send the user to login.
        // A 5xx, proxy hiccup, or temporary Turso failure must not look like logout.
        if (res.status === 401) {
          clientSnapshot = null;
          router.replace("/login");
          return;
        }
        if (!res.ok) return;

        const data = await res.json();
        if (!data?.user) return;

        const nextSnapshot: UserSnapshot = {
          user: data.user,
          unread: Number(data.unreadNotifications || 0),
          fetchedAt: Date.now(),
        };
        clientSnapshot = nextSnapshot;
        if (mountedRef.current) {
          setUser(nextSnapshot.user);
          setUnread(nextSnapshot.unread);
        }
      } catch {
        // Preserve the current session view during transient network failures.
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    clientRequest = request;
    try {
      await request;
    } finally {
      if (clientRequest === request) clientRequest = null;
    }
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshUser();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshUser]);

  useLiveRefresh(refreshUser, { intervalMs: 30_000 });

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-bg)]">
      {loading && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-[var(--color-border)]" aria-label="جاري تحديث الحساب">
          <div className="h-full w-1/3 animate-pulse bg-[var(--color-primary)]" />
        </div>
      )}
      <Header onMenuClick={() => setSidebarOpen(true)} user={user} unreadNotifications={unread} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      <main key={pathname} className="flex-1 pb-28 pt-4 px-4 animate-fadeIn">{children}</main>
      <BottomNav />
    </div>
  );
}
