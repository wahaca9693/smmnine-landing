"use client";

import { useEffect, useRef } from "react";

interface LiveRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
}

/** Keeps client snapshots aligned with server state without creating duplicate timers. */
export function useLiveRefresh(refresh: () => void | Promise<void>, options: LiveRefreshOptions = {}) {
  const { intervalMs = 30000, enabled = true } = options;
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (document.visibilityState === "visible") {
        void refreshRef.current();
      }
    };
    const onFocus = () => run();
    const onVisibilityChange = () => run();
    const timer = window.setInterval(run, intervalMs);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
