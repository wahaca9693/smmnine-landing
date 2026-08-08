"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { RefreshCw, Plus, Trash2, AlertCircle, Check } from "lucide-react";

export default function AutoRefillPage() {
  const [services, setServices] = useState<any[]>([]);
  const [refills, setRefills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedService, setSelectedService] = useState("");
  const [link, setLink] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [intervalHours, setIntervalHours] = useState("24");

  const fetchData = async () => {
    try {
      const [sRes, rRes] = await Promise.all([fetch("/api/services"), fetch("/api/auto-refill")]);
      const sData = await sRes.json();
      const rData = await rRes.json();
      setServices(sData.services || []);
      setRefills(rData.refills || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !link || !targetQuantity) return;
    setSubmitting(true);
    setMessage("");

    const service = services.find((s) => String(s.service) === selectedService);

    const res = await fetch("/api/auto-refill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: Number(selectedService),
        service_name: service?.name || "",
        link,
        target_quantity: Number(targetQuantity),
        interval_hours: Number(intervalHours),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      setMessage(data.error);
    } else {
      setMessage("تم إنشاء التعبئة التلقائية بنجاح");
      setSelectedService("");
      setLink("");
      setTargetQuantity("");
      setIntervalHours("24");
      fetchData();
    }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه التعبئة التلقائية؟")) return;
    await fetch(`/api/auto-refill?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">التعبئة التلقائية</h1>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
            <Plus size={20} className="text-[var(--color-primary)]" />
            إنشاء تعبئة تلقائية
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-zinc-400">الخدمة</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                required
              >
                <option value="">اختر خدمة...</option>
                {services.map((s) => (
                  <option key={s.service} value={String(s.service)}>
                    #{s.service} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-zinc-400">الرابط</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-400">الكمية المستهدفة</label>
                <input
                  type="number"
                  min={1}
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-400">الفاصل (ساعة)</label>
                <input
                  type="number"
                  min={1}
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                  required
                />
              </div>
            </div>
            {message && (
              <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("error") || message.includes("فشل") || message.includes("Missing") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
            >
              {submitting ? "جاري..." : "إنشاء التعبئة التلقائية"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-black text-white">قواعد التعبئة التلقائية</h2>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            </div>
          ) : refills.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] text-zinc-500">
              <AlertCircle size={40} className="mb-2 opacity-30" />
              <p>لا توجد قواعد تعبئة تلقائية</p>
            </div>
          ) : (
            <div className="space-y-3">
              {refills.map((r) => (
                <div key={r.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">#{r.service_id}</div>
                      <div className="mt-1 line-clamp-1 text-sm text-zinc-400">{r.service_name || "خدمة بدون اسم"}</div>
                    </div>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${r.is_active ? "bg-green-500/10 text-green-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                      {r.is_active ? <Check size={12} /> : <AlertCircle size={12} />}
                      {r.is_active ? "نشط" : "غير نشط"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-[var(--color-surface)] p-2">
                      <div className="text-xs text-zinc-500">الكمية المستهدفة</div>
                      <div className="font-bold text-white">{r.target_quantity}</div>
                    </div>
                    <div className="rounded-xl bg-[var(--color-surface)] p-2">
                      <div className="text-xs text-zinc-500">الفاصل الزمني</div>
                      <div className="font-bold text-white">{r.interval_hours} ساعة</div>
                    </div>
                  </div>
                  <div className="mt-2 truncate text-xs text-zinc-500">{r.link}</div>
                  <button
                    onClick={() => remove(r.id)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2 text-sm font-bold text-red-400 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
