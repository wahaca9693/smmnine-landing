"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import { announceAuthChange } from "../components/auth-client";

export default function VerifyEmailPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("جارٍ التحقق من رابط البريد...");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [returnPath] = useState(() => {
    if (typeof window === "undefined") return "/services";
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/services";
  });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      window.setTimeout(() => {
        setState("error");
        setMessage("رابط التحقق غير موجود أو غير صالح.");
      }, 0);
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => ({})) as { error?: string; user?: { username: string; role: string; balance: number; emailVerified: boolean } };
        if (!response.ok) throw new Error(data.error || "تعذر تأكيد البريد.");
        if (data.user) announceAuthChange(data.user);
        setState("success");
        setMessage("تم تأكيد بريدك الإلكتروني بنجاح.");
        window.setTimeout(() => router.replace(returnPath), 900);
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "تعذر تأكيد البريد.");
      }
    };

    void verify();
  }, [returnPath, router]);

  const resend = async () => {
    setResending(true);
    setResendMessage("");
    try {
      const response = await fetch("/api/auth/resend-email", { method: "POST" });
      const data = await response.json().catch(() => ({})) as { error?: string };
      setResendMessage(response.ok ? "تمت إعادة إرسال رسالة التحقق." : (data.error || "تعذر إعادة الإرسال حاليًا."));
    } catch {
      setResendMessage("تعذر إعادة الإرسال حاليًا.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#33260c] via-[#241a08] to-[#171004] p-7 text-center shadow-[0_24px_80px_-24px_rgba(212,175,55,0.45)]">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${state === "success" ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-300" : state === "error" ? "border-red-300/30 bg-red-400/10 text-red-300" : "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)]"}`}>
          {state === "success" ? <CheckCircle2 size={30} /> : state === "error" ? <ShieldAlert size={30} /> : <Loader2 size={30} className="animate-spin" />}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-black text-[var(--color-gold-pale)]"><MailCheck size={15} /> {t("auth.verifyEmailTitle") || "تأكيد البريد الإلكتروني"}</div>
        <p className="mt-3 text-sm leading-7 text-zinc-300" aria-live="polite">{message}</p>
        {state === "success" && <p className="mt-3 text-[11px] text-zinc-500">سيتم إعادتك إلى الصفحة المطلوبة تلقائيًا.</p>}
        {state === "error" && (
          <div className="mt-5 space-y-2">
            <button type="button" onClick={resend} disabled={resending} className="w-full rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)] px-5 py-3 text-sm font-black text-black disabled:opacity-60">{resending ? "جارٍ الإرسال..." : "إعادة إرسال رسالة التحقق"}</button>
            <button type="button" onClick={() => router.replace("/login")} className="w-full rounded-xl border border-[var(--color-gold)]/25 px-5 py-3 text-sm font-black text-[var(--color-gold-pale)]">العودة إلى تسجيل الدخول</button>
            {resendMessage && <p className="text-[11px] text-zinc-400" aria-live="polite">{resendMessage}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
