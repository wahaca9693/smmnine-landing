"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Shield, Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";
import { announceAuthChange, type ClientAuthUser } from "@/app/components/auth-client";

type VerifyResponse = {
  error?: string;
  user?: ClientAuthUser;
};

async function readVerifyResponse(response: Response): Promise<VerifyResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as VerifyResponse;
  } catch {
    return { error: "تعذر قراءة استجابة التحقق. أعد المحاولة." };
  }
}

export default function Verify2FAPage() {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [returnPath] = useState(() => {
    if (typeof window === "undefined") return "/services";
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/services";
  });
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("أدخل رمز الأمان المكون من 6 أرقام.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await readVerifyResponse(res);
      if (!res.ok) throw new Error(data.error || "رمز الأمان غير صحيح");

      if (data.user) announceAuthChange(data.user);
      setSuccess(true);
      window.setTimeout(() => {
        router.replace(returnPath);
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "رمز الأمان غير صحيح");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-[var(--color-gold)]/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--color-gold)]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative w-24 h-24 mb-2">
             <Image src="/logo.gif" alt="follower" fill className="object-contain" unoptimized />
          </div>
          <div className="h-16 w-16 rounded-3xl bg-[var(--color-gold)]/10 flex items-center justify-center text-[var(--color-gold)] border border-[var(--color-gold)]/20 shadow-lg shadow-[var(--color-gold)]/5">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t('auth.verifyTitle')}</h1>
          <p className="text-zinc-400 text-sm max-w-[280px] leading-relaxed">{t('auth.verifyDesc')}</p>
        </div>

        <div className="admin-card p-8 border-[var(--color-gold)]/20 shadow-2xl shadow-black/50">
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-300 flex items-center gap-2">
                <Lock size={14} className="text-[var(--color-gold)]" /> {t('auth.securityCodeLabel')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                placeholder="000000"
                className="input-premium w-full text-center text-2xl tracking-[0.5em] font-black py-4 placeholder:tracking-normal placeholder:font-normal"
                required
                autoFocus
              />
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold animate-shake">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs font-bold">
                <CheckCircle2 size={14} /> {t('auth.verifySuccess')}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success || code.length !== 6}
              className="btn-gold w-full py-4 flex items-center justify-center gap-3 text-lg group"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              ) : (
                <>
                  {t('auth.confirmCode')} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              {t('auth.lostCode')}
            </p>
          </div>
        </div>
        
        <p className="text-center text-zinc-600 text-[10px] font-medium">
          follower &copy; 2026 • نظام أمان متقدم
        </p>
      </div>
    </div>
  );
}
