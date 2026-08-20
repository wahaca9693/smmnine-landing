"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { Smartphone, LogOut, Save, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

type AsiacellStatus = {
  authenticated?: boolean;
  phone?: string | null;
  store_phone?: string | null;
  exchange_rate?: number | string | null;
};

export default function AsiacellAdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [status, setStatus] = useState<AsiacellStatus | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [rate, setRate] = useState("1666");
  const [step, setStep] = useState<"login" | "otp">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/asiacell/admin");
      const data = await res.json();
      if (data.error) return;
      setStatus(data as AsiacellStatus);
      setStorePhone(data.store_phone || "");
      setRate(String(data.exchange_rate || 1666));
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => setAuthorized(data.user?.role === "admin"));
    const timer = window.setTimeout(() => { void fetchStatus(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchStatus]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMessage(data.error);
    } else {
      setStep("otp");
      setMessage(data.message || "تم إرسال رمز التحقق");
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", otp }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.error || data.message);
    if (data.success) {
      setStep("login");
      setOtp("");
      fetchStatus();
    }
  };

  const logout = async () => {
    setLoading(true);
    await fetch("/api/payments/asiacell/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setLoading(false);
    fetchStatus();
  };

  const savePhone = async () => {
    const p = cleanPhone(storePhone);
    if (!/^07\d{9}$/.test(p)) {
      setMessage("رقم المتجر يجب أن يكون 07XXXXXXXXX");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-store-phone", phone: p }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.error || "تم حفظ رقم المتجر");
    fetchStatus();
  };

  const saveRate = async () => {
    const r = parseInt(rate, 10);
    if (!r) return;
    setLoading(true);
    const res = await fetch("/api/payments/asiacell/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-rate", rate: r }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.error || "تم حفظ سعر الصرف");
    fetchStatus();
  };

  const checkRecords = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check-records" }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.error || `تم فحص السجلات: ${data.processed || 0} معالجة`);
  };

  const cleanPhone = (p: string) => p.replace(/[^0-9]/g, "");

  if (authorized === null) {
    return (
      <DashboardLayout>
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      </DashboardLayout>
    );
  }

  if (authorized === false) {
    return (
      <DashboardLayout>
        <div className="flex h-60 flex-col items-center justify-center text-center text-red-400">
          <AlertCircle size={48} className="mb-3" />
          <h2 className="text-xl font-bold">غير مصرح</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Smartphone className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">إعدادات بوابة آسياسيل</h1>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">حالة الأدمن</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${status?.authenticated ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {status?.authenticated ? "متصل" : "غير متصل"}
            </span>
          </div>
          {status?.authenticated && (
            <div className="mt-3 text-sm text-zinc-400">
              الرقم: <span className="text-white">{status.phone}</span>
            </div>
          )}
        </div>

        {status?.authenticated ? (
          <>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
              <h3 className="font-bold text-white">رقم المتجر (المستلم)</h3>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={savePhone}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] px-4 font-bold text-white disabled:opacity-50"
                >
                  <Save size={18} /> حفظ
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
              <h3 className="font-bold text-white">سعر الصرف (د.ع مقابل 1$)</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={saveRate}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] px-4 font-bold text-white disabled:opacity-50"
                >
                  <Save size={18} /> حفظ
                </button>
              </div>
            </div>

            <button
              onClick={checkRecords}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-3 font-bold text-white transition hover:border-[var(--color-primary)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><RefreshCw size={18} /> فحص سجلات الرسائل الواردة</>}
            </button>

            <button
              onClick={logout}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              <LogOut size={18} /> فك ربط الأدمن
            </button>
          </>
        ) : (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            {step === "login" ? (
              <form onSubmit={login} className="space-y-4">
                <h3 className="font-bold text-white">ربط رقم آسياسيل (الأدمن)</h3>
                <p className="text-xs text-zinc-400">هذا الرقم يستخدم لفحص سجلات التحويلات الواردة وكاحتياط لشحن الكروت.</p>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                >
                  {loading ? "جاري..." : "إرسال رمز التحقق"}
                </button>
              </form>
            ) : (
              <form onSubmit={verify} className="space-y-4">
                <h3 className="font-bold text-white">أدخل رمز التحقق</h3>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="رمز OTP"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                >
                  {loading ? "جاري..." : "ربط البوابة"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="w-full text-center text-sm text-zinc-400"
                >
                  تغيير الرقم
                </button>
              </form>
            )}
          </div>
        )}

        {message && (
          <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("فشل") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {message}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
