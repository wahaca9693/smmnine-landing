"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Gift, KeyRound, Loader2, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";

type GiftCode = { id: number; code: string; kind: string; amount: number; max_uses: number; used_count: number; expires_at?: string | null; is_active: number; created_at: string };

function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString("ar-IQ") : "بلا انتهاء"; }

export default function GiftCodesPage() {
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [form, setForm] = useState({ code: "", amount: "", max_uses: "1", length: "6", expires_at: "" });
  const [unlimited, setUnlimited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/gift-codes", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setCodes(data.codes || []); else setMessage({ text: data.error || "تعذر تحميل الأكواد", error: true });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNow(Date.now());
      void load();
    }, 0);
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setMessage(null);
    const res = await fetch("/api/admin/gift-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount), max_uses: unlimited ? 0 : Number(form.max_uses), length: Number(form.length), unlimited }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMessage({ text: data.error || "تعذر إنشاء الكود", error: true }); return; }
    setMessage({ text: `تم إنشاء الكود ${data.code} بقيمة $${Number(data.amount).toFixed(6)}` });
    setForm({ code: "", amount: "", max_uses: "1", length: "6", expires_at: "" });
    setUnlimited(false); void load();
  };

  const action = async (actionName: "toggle" | "delete", id: number) => {
    if (actionName === "delete" && !confirm("حذف هذا الكود نهائيًا؟")) return;
    const res = await fetch("/api/admin/gift-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, id }) });
    const data = await res.json();
    if (!res.ok) setMessage({ text: data.error || "تعذر تنفيذ العملية", error: true }); else void load();
  };

  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setMessage({ text: `تم نسخ الكود ${value}` }); };

  return <DashboardLayout>
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold-bright)] to-[var(--color-gold-deep)] text-black shadow-lg"><Gift size={24} /></span><div><h1 className="text-2xl font-black text-white">أكواد الهدايا والدعوة</h1><p className="text-xs text-zinc-500">أنشئ رصيدًا ترويجيًا قابلًا للتحكم والاستخدام الآمن</p></div></div>
        <button onClick={() => void load()} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-zinc-300"><RefreshCw size={16} /></button>
      </div>
      {message && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${message.error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-green-500/30 bg-green-500/10 text-green-300"}`}>{message.text}</div>}

      <form onSubmit={create} className="glass-card space-y-3 rounded-3xl border border-[var(--color-gold)]/25 p-4">
        <div className="flex items-center gap-2 text-sm font-black text-[var(--color-gold-pale)]"><Plus size={16} /> إنشاء كود جديد</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-[11px] font-bold text-zinc-400">الكود المخصص <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="اتركه فارغًا للتوليد" className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black tracking-widest text-white outline-none focus:border-[var(--color-gold)]" /></label>
          <label className="text-[11px] font-bold text-zinc-400">قيمة الرصيد بالدولار <input required type="number" min="0.000001" step="0.000001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="مثل 5.500000" className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black text-white outline-none focus:border-[var(--color-gold)]" /></label>
          <label className="text-[11px] font-bold text-zinc-400">طول الكود العشوائي <input type="number" min="5" max="16" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black text-white outline-none focus:border-[var(--color-gold)]" /></label>
          <label className="text-[11px] font-bold text-zinc-400">عدد المستخدمين <input disabled={unlimited} type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black text-white outline-none disabled:opacity-50 focus:border-[var(--color-gold)]" /></label>
          <label className="text-[11px] font-bold text-zinc-400">ينتهي في (اختياري) <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black text-white outline-none focus:border-[var(--color-gold)]" /></label>
          <label className="flex items-end gap-2 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 px-3 py-2 text-xs font-black text-[var(--color-gold-pale)]"><input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)]" /> استخدامات بلا حدود</label>
        </div>
        <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold-bright)] via-[var(--color-gold)] to-[var(--color-gold-deep)] text-sm font-black text-black disabled:opacity-50">{loading ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />} إنشاء الكود</button>
      </form>

      <section className="glass-card overflow-hidden rounded-3xl border border-[var(--color-border)]"><div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-black text-white">الأكواد الحالية ({codes.length})</div><div className="divide-y divide-[var(--color-border)]">{codes.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">لا توجد أكواد حتى الآن.</div> : codes.map((item) => { const exhausted = item.max_uses > 0 && item.used_count >= item.max_uses; const expired = Boolean(now !== null && item.expires_at && new Date(item.expires_at).getTime() <= now); return <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-1 font-mono text-lg font-black tracking-[0.18em] text-[var(--color-gold-bright)]">{item.code}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black ${item.is_active && !exhausted && !expired ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>{item.is_active && !exhausted && !expired ? "فعال" : expired ? "منتهي" : exhausted ? "مستنفد" : "متوقف"}</span></div><div className="mt-2 text-[11px] text-zinc-400">الرصيد <b className="text-white">${Number(item.amount).toFixed(6)}</b> · الاستخدام <b className="text-white">{item.used_count}/{item.max_uses === 0 ? "∞" : item.max_uses}</b> · {formatDate(item.expires_at)}</div></div><div className="flex gap-2"><button onClick={() => void copy(item.code)} className="flex h-9 items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 text-[10px] font-black text-zinc-300"><Copy size={13} /> نسخ</button><button onClick={() => void action("toggle", item.id)} className="flex h-9 items-center gap-1 rounded-xl border border-[var(--color-gold)]/30 px-3 text-[10px] font-black text-[var(--color-gold-pale)]"><Power size={13} /> {item.is_active ? "إيقاف" : "تفعيل"}</button><button onClick={() => void action("delete", item.id)} className="flex h-9 items-center justify-center rounded-xl border border-red-500/30 px-3 text-red-300"><Trash2 size={13} /></button></div></div>; })}</div></section>
    </div>
  </DashboardLayout>;
}
