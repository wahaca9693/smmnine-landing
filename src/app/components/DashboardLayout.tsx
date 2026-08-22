"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import AuthRequiredGate from "./AuthRequiredGate";
import { useLiveRefresh } from "./useLiveRefresh";
import { AUTH_CHANGED_EVENT, type ClientAuthUser } from "./auth-client";
import { useInitialAuthUser } from "./Providers";

type DashboardUser = ClientAuthUser;

type UserSnapshot = {
  user: DashboardUser;
  unread: number;
  fetchedAt: number;
};

let clientSnapshot: UserSnapshot | null = null;
let clientRequest: Promise<void> | null = null;
let clientAuthRevision = 0;
const CLIENT_SNAPSHOT_TTL_MS = 15_000;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const initialUser = useInitialAuthUser();
  const bootUser = initialUser || clientSnapshot?.user || null;
  const hasBootUser = Boolean(bootUser);
  const [user, setUser] = useState<DashboardUser | null>(bootUser);
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "guest">(hasBootUser ? "authenticated" : "checking");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(clientSnapshot?.unread || 0);
  const router = useRouter();
  const pathname = usePathname();
  const mountedRef = useRef(true);

  const refreshUser = useCallback(async (force = false) => {
    if (clientRequest && !force) {
      await clientRequest;
      return;
    }

    if (!force && clientSnapshot && Date.now() - clientSnapshot.fetchedAt < CLIENT_SNAPSHOT_TTL_MS) {
      if (mountedRef.current) {
        setUser(clientSnapshot.user);
        setUnread(clientSnapshot.unread);
        setAuthState("authenticated");
        setLoading(false);
      }
      return;
    }

    const requestRevision = clientAuthRevision;
    const request = (async () => {
      try {
        const res = await fetch("/api/user", {
          cache: "no-store",
          credentials: "include",
        });

        // Only a deliberate/expired session should send the user to login.
        // A 5xx, proxy hiccup, or temporary Turso failure must not look like logout.
        if (requestRevision !== clientAuthRevision) return;

        if (res.status === 401) {
          clientSnapshot = null;
          if (mountedRef.current) {
            setUser(null);
            setAuthState("guest");
          }
          return;
        }

        if (res.status === 403) {
          const data = await res.json();
          if (data.requiresEmailVerification && pathname !== "/verify-email") {
            router.replace(`/verify-email?next=${encodeURIComponent(pathname || "/services")}`);
          } else if (data.requires2fa && pathname !== "/verify-2fa") {
            router.replace(`/verify-2fa?next=${encodeURIComponent(pathname || "/services")}`);
          }
          return;
        }

        if (!res.ok) return;

        const data = await res.json();
        if (!data?.user) return;

        // Redirect to 2FA verification if enabled but not verified
        if (data.user.is2faEnabled && !data.user.is2faVerified && pathname !== "/verify-2fa") {
          router.replace("/verify-2fa");
          return;
        }

        if (requestRevision !== clientAuthRevision) return;

        const nextSnapshot: UserSnapshot = {
          user: data.user,
          unread: Number(data.unreadNotifications || 0),
          fetchedAt: Date.now(),
        };
        clientSnapshot = nextSnapshot;
        if (mountedRef.current) {
          setUser(nextSnapshot.user);
          setUnread(nextSnapshot.unread);
          setAuthState("authenticated");
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
  }, [router, pathname]);

  useEffect(() => {
    mountedRef.current = true;
    if (initialUser) {
      clientSnapshot = {
        user: initialUser,
        unread: clientSnapshot?.unread || 0,
        fetchedAt: Date.now() - CLIENT_SNAPSHOT_TTL_MS,
      };
    }
    void refreshUser(true);
    return () => {
      mountedRef.current = false;
    };
  }, [initialUser, refreshUser]);

  useEffect(() => {
    const handleAuthChange = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: ClientAuthUser | null }>).detail;
      if (!detail || !Object.prototype.hasOwnProperty.call(detail, "user")) return;
      clientAuthRevision += 1;
      if (detail.user) {
        const nextUser = detail.user;
        clientSnapshot = { user: nextUser, unread: 0, fetchedAt: Date.now() - CLIENT_SNAPSHOT_TTL_MS };
        if (mountedRef.current) {
          setUser(nextUser);
          setAuthState("authenticated");
          setLoading(true);
        }
        void refreshUser(true);
      } else {
        clientSnapshot = null;
        if (mountedRef.current) {
          setUser(null);
          setUnread(0);
          setAuthState("guest");
          setLoading(false);
        }
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
  }, [refreshUser]);

  useLiveRefresh(refreshUser, { intervalMs: 30_000 });

  // Hide full layout content if 2FA is required but not verified
  const is2faRequired = user?.is2faEnabled && !user?.is2faVerified && pathname !== "/verify-2fa";
  const isGuest = authState === "guest";
  const isCheckingAuth = authState === "checking";

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-bg)]">
      {loading && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-[var(--color-border)]" aria-label="جاري تحديث الحساب">
          <div className="h-full w-1/3 animate-pulse bg-[var(--color-primary)]" />
        </div>
      )}

      {!is2faRequired && (
        <>
          <Header onMenuClick={() => setSidebarOpen(true)} user={user} unreadNotifications={unread} />
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
        </>
      )}

      <main key={pathname} className={`flex-1 ${!is2faRequired ? "pb-28 pt-4 px-4" : ""} animate-fadeIn`}>
        {isGuest ? (
          <AuthRequiredGate />
        ) : isCheckingAuth ? (
          <div className="flex min-h-[70vh] items-center justify-center" aria-label="جاري التحقق من الجلسة">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : is2faRequired ? (
          <div className="flex h-[80vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : children}
      </main>

      {!is2faRequired && !isGuest && <BottomNav />}
    </div>
  );
}
