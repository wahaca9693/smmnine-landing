"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { Activity, ChevronLeft, ChevronRight, FileSearch, RefreshCw, Search, ShieldCheck } from "lucide-react";

type AuditRow = {
  id: number;
  action: string;
  details: string;
  created_at: string;
  admin_username?: string;
  target_username?: string;
  target_user_id?: number | null;
};

type ActionCount = { action: string; total: number };

const labels: Record<string, string> = {
  ban: "حظر",
  unban: "فك حظر",
  addBalance: "إضافة رصيد",
  subtractBalance: "خصم رصيد",
  setPassword: "إعادة تعيين كلمة مرور",
  broadcastNotification: "إشعار جماعي",
  userNotification: "إشعار فردي",
  createGiftCode: "إنشاء كود هدية",
  disableGiftCode: "تعطيل كود هدية",
  deleteGiftCode: "حذف كود هدية",
};

function actionLabel(action: string) { return labels[action] || action || "إجراء"; }
function dateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [actions, setActions] = useState<ActionCount[]>([]);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "40" });
      if (action) params.set("action", action);
      if (search) params.set("search", search);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`, { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحميل السجل");
      setLogs(data.logs || []);
      setActions(data.actions || []);
      setTotal(Number(data.total || 0));
      setPages(Number(data.pages || 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل السجل");
    } finally {
      setLoading(false);
    }
  }, [action, from, page, search, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const apply = () => setPage(1);

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-6">
        <header className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(212,175,55,0.14),rgba(16,16,16,0.95))] p-4 sm:p-6">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-gold)]/15 text-[var(--color-gold)]"><ShieldCheck size={22} /></span><div className="min-w-0"><h1 className="text-xl font-black text-white sm:text-2xl">سجل التدقيق الإداري</h1><p className="mt-1 text-xs leading-6 text-zinc-400">كل إجراء حساس يظهر هنا دون تخزين كلمات المرور أو مفاتيح الوصول بصورتها المكشوفة.</p></div></div>
        </header>

        <section className="glass-card rounded-2xl border border-[var(--color-border)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-black text-white"><FileSearch size={17} className="text-[var(--color-gold)]" />فلاتر السجل</h2><button type="button" onClick={() => void load()} className="rounded-lg p-2 text-zinc-400 hover:text-[var(--color-gold)]" aria-label="تحديث السجل"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 px-3 sm:col-span-2 lg:col-span-2"><Search size={15} className="shrink-0 text-zinc-500" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="اسم المستخدم أو رقم الحساب" className="min-w-0 flex-1 bg-transparent py-3 text-xs text-white outline-none" /></label>
            <select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs text-white outline-none"><option value="">كل الإجراءات</option>{actions.map((item) => <option key={item.action} value={item.action}>{actionLabel(item.action)} ({item.total})</option>)}</select>
            <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs text-white outline-none" aria-label="من تاريخ" />
            <div className="flex gap-2"><input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs text-white outline-none" aria-label="إلى تاريخ" /><button type="button" onClick={apply} className="rounded-xl bg-[var(--color-gold)] px-3 text-xs font-black text-black">تطبيق</button></div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}
        <section className="glass-card overflow-hidden rounded-2xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-4"><div><h2 className="text-sm font-black text-white">النشاط المسجل</h2><p className="mt-1 text-[10px] text-zinc-500">{total} عملية مطابقة للفلاتر الحالية</p></div><Activity size={18} className="text-[var(--color-gold)]" /></div>
          <div className="divide-y divide-[var(--color-border)]">{loading && <div className="p-10 text-center text-xs text-zinc-500">جارٍ تحميل سجل التدقيق...</div>}{!loading && logs.length === 0 && <div className="p-10 text-center text-xs text-zinc-500">لا توجد عمليات مطابقة</div>}{logs.map((log) => <article key={log.id} className="p-4 transition hover:bg-white/[0.02]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-[var(--color-gold)]/12 px-2 py-1 text-[10px] font-black text-[var(--color-gold)]">{actionLabel(log.action)}</span><span className="text-[10px] text-zinc-500">بواسطة {log.admin_username || "الإدارة"}</span></div><p className="mt-2 text-xs font-bold text-zinc-200">{log.target_username ? `المستخدم المستهدف: ${log.target_username}` : "إجراء عام للنظام"}{log.target_user_id ? <span className="mr-2 text-[10px] text-zinc-600">#{log.target_user_id}</span> : null}</p>{log.details && <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-black/20 p-2 text-[10px] leading-5 text-zinc-500">{log.details}</pre>}</div><time className="shrink-0 text-[9px] text-zinc-600">{dateTime(log.created_at)}</time></div></article>)}</div>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] p-3"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[10px] font-bold text-zinc-300 disabled:opacity-40"><ChevronRight size={14} />السابق</button><span className="text-[10px] font-bold text-zinc-500">صفحة {page} من {pages}</span><button type="button" disabled={page >= pages || loading} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[10px] font-bold text-zinc-300 disabled:opacity-40">التالي<ChevronLeft size={14} /></button></div>
        </section>
        <Link href="/admin/settings" className="inline-flex rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white">العودة إلى الإعدادات</Link>
      </div>
    </DashboardLayout>
  );
}
