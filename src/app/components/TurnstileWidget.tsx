"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileWidgetApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible" | "invisible";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: (errorCode?: string) => void;
    },
  ) => string | number;
  reset: (widgetId?: string | number) => void;
  execute?: (widgetId?: string | number) => void;
  remove?: (widgetId?: string | number) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidgetApi;
  }
}

type TurnstileWidgetProps = {
  onToken: (token: string) => void;
  onError?: (errorCode: string) => void;
  className?: string;
};

type WidgetStatus = "loading" | "ready" | "passed" | "error";

export default function TurnstileWidget({ onToken, onError, className = "" }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isTesting = process.env.NEXT_PUBLIC_TURNSTILE_MODE === "testing";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | number | undefined>(undefined);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<WidgetStatus>("loading");

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile || widgetIdRef.current !== undefined) return;

    const handleError = (errorCode?: string) => {
      const normalizedCode = errorCode || "turnstile-error";
      setStatus("error");
      onTokenRef.current("");
      onErrorRef.current?.(normalizedCode);
    };

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "auth",
        theme: "dark",
        size: isTesting ? "invisible" : "flexible",
        callback: (token) => {
          setStatus("passed");
          onTokenRef.current(token);
        },
        "expired-callback": () => {
          setStatus("ready");
          onTokenRef.current("");
          if (isTesting && window.turnstile?.execute && widgetIdRef.current !== undefined) {
            window.turnstile.execute(widgetIdRef.current);
          }
        },
        "error-callback": handleError,
      });
      window.setTimeout(() => setStatus("ready"), 0);
      if (isTesting && window.turnstile?.execute && widgetIdRef.current !== undefined) {
        window.turnstile.execute(widgetIdRef.current);
      }
    } catch (error) {
      console.error("Turnstile render error:", error);
      handleError("render-error");
    }

    return () => {
      if (widgetIdRef.current !== undefined && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = undefined;
    };
  }, [siteKey, scriptReady, isTesting]);

  if (!siteKey) {
    return (
      <div className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center ${className}`} role="status">
        <p className="text-[12px] font-black text-amber-200">التحقق الأمني غير مهيأ بعد</p>
        <p className="mt-1 text-[10px] leading-relaxed text-amber-100/70">أضف NEXT_PUBLIC_TURNSTILE_SITE_KEY للواجهة وTURNSTILE_SECRET_KEY للخادم لتفعيل «لست روبوتًا» الحقيقي.</p>
      </div>
    );
  }

  const statusMessage = status === "error"
    ? "تعذر تحميل التحقق الأمني على هذا النطاق. إذا كنت تستخدم رابط معاينة، يجب استعمال مفتاح اختبار أو إضافة نطاقك المملوك في Cloudflare."
    : isTesting
      ? ""
      : "حماية أمنية لمنع التسجيلات الآلية والإساءة.";

  return (
    <div className={isTesting ? "h-0 overflow-hidden" : `rounded-xl border border-[var(--color-border)] bg-black/20 p-3 ${className}`}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => {
          setStatus("error");
          onTokenRef.current("");
          onErrorRef.current?.("script-load-error");
        }}
      />
      <div ref={containerRef} className={isTesting ? "h-0 overflow-hidden" : "flex min-h-[65px] justify-center"} aria-label="التحقق الأمني" />
      {!isTesting && statusMessage && (
        <p className={`mt-2 text-center text-[11px] leading-relaxed ${status === "error" ? "text-amber-300" : "text-zinc-500"}`} role={status === "error" ? "alert" : undefined}>
          {statusMessage}
        </p>
      )}
    </div>
  );
}
