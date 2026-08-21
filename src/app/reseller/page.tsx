"use client";

import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useTheme } from "../components/ThemeProvider";
import { Globe2, CheckCircle, Send, AlertCircle } from "lucide-react";

export default function ResellerPage() {
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  const [siteName, setSiteName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !contact) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/reseller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_name: siteName, contact, notes }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMessage(data.error);
    } else {
      setMessage("تم استلام طلبك بنجاح، سنتواصل معك قريباً.");
      setSiteName("");
      setContact("");
      setNotes("");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black">أنشئ موقعك مجاناً</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                احصل على موقع خاص بك مثل {brandName} وابدأ بيع الخدمات وكسب العمولة.
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Globe2 size={28} />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="mb-4 text-lg font-black text-white">مميزات الموقع المجاني</h2>
          <ul className="space-y-3">
            {[
              `تصميم احترافي مثل ${brandName}`,
              "ربط تلقائي بالخدمات والأسعار",
              "نظام مستخدمين ورصيد كامل",
              "دعم فني على مدار الساعة",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle size={18} className="text-green-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
          <h2 className="text-lg font-black text-white">طلب موقع جديد</h2>
          <div>
            <label className="mb-1 block text-sm font-bold text-zinc-400">اسم الموقع</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-zinc-400">طريقة تواصل (واتساب / تيليجرام / بريد)</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-zinc-400">ملاحظات إضافية</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          {message && (
            <div className={`flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("error") || message.includes("Missing") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
              {message.includes("خطأ") || message.includes("error") ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
          >
            {loading ? "جاري الإرسال..." : <><Send size={18} /> إرسال الطلب</>}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
