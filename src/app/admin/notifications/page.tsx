"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { Bell, CheckCircle2, Clock3, Megaphone, RefreshCw, Search, Send, ShieldAlert, UserRound } from "lucide-react";

type NotificationRow = {
  id: number;
  user_id: number;
  username?: string;
  title: string;
  body: string;
  is_read: number;
  created_at: string;
};

function dateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AdminNotificationsPage() {
  const [recipientType, setRecipientType] = useState<"broadcast" | "user">("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [username, setUsername] = useState("");
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/notifications?search=${encodeURIComponent(search)}`, { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحميل السجل");
      setNotifications(data.notifications || []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل السجل");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, body, recipientType, username: recipientType === "user" ? username : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر إرسال الإشعار");
      setMessage(data.message || "تم إرسال الإشعار بنجاح");
      setTitle("");
      setBody("");
      if (recipientType === "user") setUsername("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال الإشعار");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-6">
        <header className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(212,175,55,0.14),rgba(16,16,16,0.95))] p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-gold)]/15 text-[var(--color-gold)]"><Bell size={22} /></span>
            <div className="min-w-0"><h1 className="text-xl font-black text-white sm:text-2xl">مركز الإشعارات</h1><p className="mt-1 text-xs leading-6 text-zinc-400">أرسل تنبيهات تشغيلية للمستخدمين وتابع آخر الرسائل التي أنشأتها الإدارة.</p></div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form onSubmit={send} className="glass-card min-w-0 rounded-2xl border border-[var(--color-border)] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><Send size={17} className="text-[var(--color-gold)]" /><h2 className="text-base font-black text-white">إنشاء إشعار</h2></div>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 p-1">
              <button type="button" onClick={() => setRecipientType("broadcast")} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-black transition ${recipientType === "broadcast" ? "bg-[var(--color-gold)] text-black" : "text-zinc-400 hover:text-white"}`}><Megaphone size={14} />جماعي</button>
              <button type="button" onClick={() => setRecipientType("user")} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-black transition ${recipientType === "user" ? "bg-[var(--color-gold)] text-black" : "text-zinc-400 hover:text-white"}`}><UserRound size={14} />مستخدم محدد</button>
            </div>
            {recipientType === "broadcast" ? <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-5 text-amber-100"><ShieldAlert size={14} className="ml-1 inline text-amber-300" />سيصل الإشعار إلى المستخدمين النشطين فقط، ولن يُرسل إلى حسابات الإدارة أو الحسابات المحظورة.</div> : <label className="mb-3 block text-xs font-bold text-zinc-300">اسم المستخدم<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="مثال: user123" className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-gold)]" /></label>}
            <label className="mb-3 block text-xs font-bold text-zinc-300">العنوان<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان واضح وقصير" className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-gold)]" /></label>
            <label className="block text-xs font-bold text-zinc-300">نص الإشعار<textarea required maxLength={1000} rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="اكتب تفاصيل التنبيه هنا..." className="mt-1.5 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-[var(--color-gold)]" /></label>
            <button disabled={sending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-deep)] py-3 text-sm font-black text-black transition active:scale-[0.98] disabled:opacity-50"><Send size={16} />{sending ? "جاري الإرسال..." : recipientType === "broadcast" ? "إرسال إلى النشطين" : "إرسال للمستخدم"}</button>
            {message && <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300"><CheckCircle2 size={15} />{message}</div>}
            {error && <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}
          </form>

          <section className="glass-card min-w-0 rounded-2xl border border-[var(--color-border)] p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 text-base font-black text-white"><Clock3 size={17} className="text-[var(--color-gold)]" />سجل الإشعارات</h2><p className="mt-1 text-[10px] text-zinc-500">{total} إشعار محفوظ في النظام</p></div><button type="button" onClick={() => void load()} className="self-end rounded-lg p-2 text-zinc-400 hover:text-[var(--color-gold)]" aria-label="تحديث السجل"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button></div>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 px-3"><Search size={15} className="shrink-0 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالعنوان أو المستخدم" className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-white outline-none" /></div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">{loading && <div className="py-10 text-center text-xs text-zinc-500">جارٍ تحميل السجل...</div>}{!loading && notifications.length === 0 && <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-xs text-zinc-500">لا توجد إشعارات مطابقة</div>}{notifications.map((item) => <article key={item.id} className="rounded-xl border border-[var(--color-border)] bg-black/10 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xs font-black text-white">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-zinc-400">{item.body}</p></div><span className="shrink-0 rounded-lg bg-[var(--color-gold)]/10 px-2 py-1 text-[9px] font-bold text-[var(--color-gold)]">{item.username || `#${item.user_id}`}</span></div><div className="mt-2 text-[9px] text-zinc-600">{dateTime(item.created_at)} · {item.is_read ? "مقروء" : "غير مقروء"}</div></article>)}</div>
          </section>
        </section>
        <Link href="/admin" className="inline-flex rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white">العودة إلى لوحة الإدارة</Link>
      </div>
    </DashboardLayout>
  );
}
