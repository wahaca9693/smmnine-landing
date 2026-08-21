"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { Activity, AlertCircle, ArrowLeft, CheckSquare, ChevronLeft, ChevronRight, Download, KeyRound, Power, RefreshCw, Search, Square, Trash2, Users } from "lucide-react";

interface ApiKeyRow { id: number; user_id: number; username: string; key_hint: string; name: string; requests_count: number; last_used_at: string | null; is_active: number; created_at: string; }
interface KeyStats { total: number; active: number; disabled: number; requests: number; }
type ApiKeysResponse = { keys?: ApiKeyRow[]; error?: string; page?: number; pages?: number; total?: number; stats?: KeyStats };
type StatusFilter = "all" | "active" | "disabled";

const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"))) : "لم يُستخدم بعد";
const integer = (value: number) => new Intl.NumberFormat("ar-IQ").format(value);

export default function AdminApiKeysPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [stats, setStats] = useState<KeyStats>({ total: 0, active: 0, disabled: 0, requests: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async (requestedPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, status, page: String(requestedPage), limit: "25" });
      const response = await fetch(`/api/admin/api-keys?${params.toString()}`, { credentials: "include", cache: "no-store" });
      const data = await response.json() as ApiKeysResponse;
      if (!response.ok) throw new Error(data.error || "تعذر تحميل المفاتيح");
      setKeys(data.keys || []); setStats(data.stats || { total: 0, active: 0, disabled: 0, requests: 0 }); setTotal(Number(data.total || 0)); setPages(Math.max(1, Number(data.pages || 1))); setPage(Math.max(1, Number(data.page || requestedPage)));
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر تحميل المفاتيح"); } finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetch("/api/user", { credentials: "include", cache: "no-store" }).then((response) => response.json()).then((data) => setAuthorized(data.user?.role === "admin")).catch(() => setAuthorized(false)); }, []);
  useEffect(() => {
    if (!authorized) return;
    const timer = window.setTimeout(() => { void refresh(1); }, 0);
    return () => window.clearTimeout(timer);
  }, [authorized, refresh]);

  const act = async (id: number, action: "toggle" | "delete") => {
    if (action === "delete" && !confirm("حذف مفتاح API نهائيًا؟")) return;
    setActionLoading(true); setMessage("");
    try {
      const response = await fetch("/api/admin/api-keys", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, action }) });
      const data = await response.json(); setMessage(data.error || data.message || "تم التنفيذ"); if (response.ok) await refresh();
    } catch { setMessage("تعذر الاتصال بالخادم"); } finally { setActionLoading(false); }
  };

  const bulkDisable = async () => {
    if (selectedIds.length === 0 || actionLoading) return;
    if (!confirm(`تعطيل ${selectedIds.length} مفتاح؟`)) return;
    setActionLoading(true); setMessage("");
    try {
      const response = await fetch("/api/admin/api-keys", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "bulkDisable", keyIds: selectedIds }) });
      const data = await response.json(); setMessage(data.error || data.message || "تم التنفيذ"); if (response.ok) { setSelectedIds([]); await refresh(); }
    } catch { setMessage("تعذر الاتصال بالخادم"); } finally { setActionLoading(false); }
  };

  const toggle = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const allSelected = keys.length > 0 && keys.every((item) => selectedIds.includes(item.id));
  const toggleAll = () => setSelectedIds((current) => allSelected ? current.filter((id) => !keys.some((item) => item.id === id)) : [...new Set([...current, ...keys.map((item) => item.id)])]);
  const exportUrl = useMemo(() => `/api/admin/api-keys?format=csv&search=${encodeURIComponent(search)}&status=${status}`, [search, status]);

  if (authorized === null) return <DashboardLayout><div className="flex h-40 items-center justify-center"><RefreshCw className="animate-spin text-[var(--color-gold)]" /></div></DashboardLayout>;
  if (authorized === false) return <DashboardLayout><div className="flex h-60 flex-col items-center justify-center text-center text-red-400"><AlertCircle size={48} className="mb-3" /><h2 className="text-xl font-bold">غير مصرح</h2></div></DashboardLayout>;

  return <DashboardLayout><div className="space-y-4 pb-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-deep)] shadow-lg shadow-[var(--color-gold)]/20"><KeyRound size={24} className="text-black" /></div><div><h1 className="text-2xl font-black text-white">مفاتيح API للمستخدمين</h1><p className="text-xs text-zinc-500">إدارة آمنة للربط، الاستخدام، الحالة والتدقيق</p></div></div><Link href="/admin" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-zinc-300"><ArrowLeft size={14} className="ml-1 inline" />لوحة الأدمن</Link></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="glass-card rounded-2xl p-4"><div className="flex items-center gap-2 text-xs text-zinc-400"><KeyRound size={13} className="text-[var(--color-gold)]" />إجمالي المفاتيح</div><div className="mt-1 text-2xl font-black text-white">{integer(stats.total)}</div></div><div className="glass-card rounded-2xl p-4"><div className="flex items-center gap-2 text-xs text-zinc-400"><Activity size={13} className="text-emerald-300" />نشطة</div><div className="mt-1 text-2xl font-black text-emerald-300">{integer(stats.active)}</div></div><div className="glass-card rounded-2xl p-4"><div className="flex items-center gap-2 text-xs text-zinc-400"><Power size={13} className="text-red-300" />معطلة</div><div className="mt-1 text-2xl font-black text-red-300">{integer(stats.disabled)}</div></div><div className="glass-card rounded-2xl p-4"><div className="flex items-center gap-2 text-xs text-zinc-400"><Activity size={13} className="text-[var(--color-gold)]" />إجمالي الطلبات</div><div className="mt-1 text-2xl font-black text-[var(--color-gold)]">{integer(stats.requests)}</div></div></div>
    <section className="glass-card space-y-3 rounded-2xl border border-[var(--color-border)] p-3"><div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void refresh(1)} placeholder="ابحث بالمستخدم أو اسم المفتاح أو الرقم..." className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-3 pr-10 pl-3 text-xs text-white outline-none focus:border-[var(--color-primary)]" /></div><button onClick={() => void refresh(1)} className="rounded-xl border border-[var(--color-border)] px-3 text-zinc-300" aria-label="تحديث"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs text-white"><option value="all">كل الحالات</option><option value="active">نشطة فقط</option><option value="disabled">معطلة فقط</option></select><a href={exportUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)]/30 px-3 py-3 text-xs font-black text-[var(--color-gold)]"><Download size={14} />تصدير CSV</a><button onClick={toggleAll} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-3 text-xs font-bold text-zinc-300">{allSelected ? <CheckSquare size={14} /> : <Square size={14} />}تحديد الصفحة</button>{selectedIds.length > 0 ? <button disabled={actionLoading} onClick={() => void bulkDisable()} className="flex items-center justify-center gap-2 rounded-xl bg-red-500/15 px-3 py-3 text-xs font-black text-red-300 disabled:opacity-50"><Power size={14} />تعطيل {selectedIds.length}</button> : <span className="flex items-center justify-center rounded-xl border border-transparent text-[10px] text-zinc-600">المفتاح الخام غير معروض</span>}</div></section>
    {message && <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs font-bold text-zinc-200">{message}</div>}
    <div className="flex items-center justify-between text-[11px] text-zinc-500"><span>{total} مفتاح مطابق · الصفحة {page} من {pages}</span><span>{selectedIds.length ? `${selectedIds.length} محدد` : ""}</span></div>
    <div className="glass-card divide-y divide-[var(--color-border)]/50 overflow-hidden rounded-2xl">{loading ? <div className="p-8 text-center text-sm text-zinc-500"><RefreshCw className="mx-auto mb-2 animate-spin" size={20} />جاري التحميل...</div> : keys.length === 0 ? <div className="flex flex-col items-center gap-2 p-8 text-center"><Users size={28} className="text-zinc-600" /><p className="text-sm text-zinc-500">لا توجد مفاتيح API مطابقة</p></div> : keys.map((key) => <div key={key.id} className={`p-4 ${selectedIds.includes(key.id) ? "bg-[var(--color-gold)]/5" : ""}`}><div className="flex items-start gap-3"><button onClick={() => toggle(key.id)} className="mt-1 shrink-0 text-zinc-500" aria-label={`تحديد المفتاح ${key.id}`}>{selectedIds.includes(key.id) ? <CheckSquare size={18} className="text-[var(--color-gold)]" /> : <Square size={18} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-white">{key.username || `مستخدم #${key.user_id}`}</span><span className="text-[10px] text-zinc-600">#{key.id}</span>{Number(key.is_active) ? <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[9px] font-black text-green-400">نشط</span> : <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-black text-red-400">معطل</span>}</div><div className="mt-1 text-[10px] text-zinc-500">{key.name}</div><div className="mt-1 flex items-center gap-1.5 rounded-lg bg-black/40 px-2 py-1"><code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--color-gold-pale)]">{key.key_hint}</code><span className="text-[9px] text-zinc-600">مخفي</span></div><div className="mt-1 text-[10px] text-zinc-500">استخدامات: <span className="font-bold text-zinc-300">{integer(key.requests_count)}</span> · آخر استخدام: {dateTime(key.last_used_at)}</div></div><div className="flex shrink-0 flex-col gap-1.5"><button disabled={actionLoading} onClick={() => void act(key.id, "toggle")} className="flex items-center gap-1 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-2.5 py-1.5 text-[10px] font-black text-[var(--color-gold)]"><Power size={11} />{Number(key.is_active) ? "تعطيل" : "تفعيل"}</button><button disabled={actionLoading} onClick={() => void act(key.id, "delete")} className="flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-black text-red-400"><Trash2 size={11} />حذف</button></div></div></div>)}</div>
    <div className="flex items-center justify-between gap-3"><button disabled={page <= 1 || loading} onClick={() => void refresh(page - 1)} className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 disabled:opacity-40"><ChevronRight size={15} />السابق</button><span className="text-xs font-bold text-zinc-500">{page} / {pages}</span><button disabled={page >= pages || loading} onClick={() => void refresh(page + 1)} className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 disabled:opacity-40">التالي<ChevronLeft size={15} /></button></div>
  </div></DashboardLayout>;
}
