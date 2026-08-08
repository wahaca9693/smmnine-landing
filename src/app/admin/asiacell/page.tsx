"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { Smartphone, Save, AlertCircle, Loader2 } from "lucide-react";

export default function AsiacellAdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [storePhone, setStorePhone] = useState("");
  const [rate, setRate] = useState("1666");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => setAuthorized(data.user?.role === "admin"));
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/payments/asiacell/admin");
      const data = await res.json();
      if (data.error) return;
      setStorePhone(data.store_phone || "");
      setRate(String(data.exchange_rate || 1666));
    } catch (e) {}
  };

  const savePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-store-phone", phone: storePhone }),
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

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
          <h3 className="font-bold text-white">رقم متجر آسياسيل (رقم المستلم)</h3>
          <p className="text-xs text-zinc-400">هذا الرقم يستقبل التحويلات من المستخدمين. لا يحتاج تسجيل دخول، فقط يُحفظ لإرسال التحويلات إليه.</p>
          <form onSubmit={savePhone} className="flex gap-2">
            <input
              type="tel"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="07XXXXXXXXX"
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] px-4 font-bold text-white disabled:opacity-50"
            >
              <Save size={18} /> حفظ
            </button>
          </form>
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

        {message && (
          <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("فشل") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {message}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
