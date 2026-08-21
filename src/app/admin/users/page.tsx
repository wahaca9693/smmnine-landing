"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { AlertCircle, Ban, CheckSquare, ChevronLeft, ChevronRight, ClipboardList, Eye, History, KeyRound, Minus, Plus, RefreshCw, Search, Square, TicketCheck, Trash2, Unlock, Users, Wallet, X, Download } from "lucide-react";

interface UserRow { id: number; username: string; email: string; balance: number; is_banned: number; status: string; orders_count: number; created_at?: string; }
interface UserStats { total_users: number; active_users: number; banned_users: number; total_balance: number; }
interface DetailOrder { id: number; service_name?: string | null; charge?: number | string | null; status?: string | null; }
interface DetailTransaction { id: number; description?: string | null; type?: string | null; amount?: number | string | null; }
interface DetailTicket { id: number; status?: string | null; }
interface DetailAudit { id: number; action?: string | null; }
interface UserDetails { user: UserRow & { terms_accepted: number }; orders: DetailOrder[]; transactions: DetailTransaction[]; tickets: DetailTicket[]; audit: DetailAudit[]; }
type UsersResponse = { users?: UserRow[]; error?: string; page?: number; pages?: number; total?: number; stats?: UserStats };
type UsersRequestResult = UsersResponse & { ok: boolean };
type StatusFilter = "all" | "active" | "banned";
type SortMode = "created_desc" | "created_asc" | "balance_desc" | "balance_asc" | "username_asc";

async function requestAdminUsers(search: string, status: StatusFilter, sort: SortMode, page: number): Promise<UsersRequestResult> {
  const params = new URLSearchParams({ search, status, sort, page: String(page), limit: "25" });
  const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include", cache: "no-store" });
  const data = await res.json() as UsersResponse;
  return { ...data, ok: res.ok };
}

const money = (value: unknown) => `$${Number(value || 0).toFixed(6)}`;
const dateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium" }).format(date);
};

export default function AdminUsersPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<UserStats>({ total_users: 0, active_users: 0, banned_users: 0, total_balance: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("created_desc");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async (requestedPage = page) => {
    setLoading(true);
    try {
      const data = await requestAdminUsers(search, status, sort, requestedPage);
      setUsers(data.users || []);
      setStats(data.stats || { total_users: 0, active_users: 0, banned_users: 0, total_balance: 0 });
      setTotal(Number(data.total || 0));
      setPages(Math.max(1, Number(data.pages || 1)));
      setPage(Math.max(1, Number(data.page || requestedPage)));
      if (!data.ok) setMessage(data.error || "تعذر تحميل المستخدمين");
    } catch {
      setMessage("تعذر تحميل المستخدمين");
    } finally { setLoading(false); }
  }, [page, search, sort, status]);

  useEffect(() => {
    fetch("/api/user", { credentials: "include", cache: "no-store" }).then((res) => res.json()).then((data) => setAuthorized(data.user?.role === "admin")).catch(() => setAuthorized(false));
    const timer = window.setTimeout(() => { void fetchUsers(1); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUsers]);

  const openDetails = async (user: UserRow) => {
    setSelectedUser(user); setDetails(null); setDetailsLoading(true); setMessage("");
    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (res.ok) setDetails(data as UserDetails); else setMessage(data.error || "تعذر تحميل التفاصيل");
    } catch { setMessage("تعذر تحميل التفاصيل"); } finally { setDetailsLoading(false); }
  };

  const action = async (userId: number, actionName: string, extra: Record<string, unknown> = {}) => {
    if (actionLoading) return;
    setActionLoading(true); setMessage("");
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: actionName, userId, ...extra }) });
      const data = await res.json();
      setMessage(data.error || data.message || "تم التنفيذ");
      if (res.ok) { await fetchUsers(); if (details?.user.id === userId) await openDetails(details.user); }
    } catch { setMessage("تعذر الاتصال بالخادم"); } finally { setActionLoading(false); }
  };

  const bulkAction = async (actionName: "bulkBan" | "bulkUnban") => {
    if (actionLoading || selectedIds.length === 0) return;
    setActionLoading(true); setMessage("");
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: actionName, userIds: selectedIds }) });
      const data = await res.json();
      setMessage(data.error || data.message || "تم التنفيذ");
      if (res.ok) { setSelectedIds([]); await fetchUsers(); }
    } catch { setMessage("تعذر الاتصال بالخادم"); } finally { setActionLoading(false); }
  };

  const toggleSelected = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const allVisibleSelected = users.length > 0 && users.every((user) => selectedIds.includes(user.id));
  const toggleAll = () => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !users.some((user) => user.id === id)) : [...new Set([...current, ...users.map((user) => user.id)])]);
  const closeModal = () => { setSelectedUser(null); setDetails(null); setAmount(""); setNewPassword(""); };
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({ format: "csv", search, status, sort });
    return `/api/admin/users?${params.toString()}`;
  }, [search, sort, status]);

  if (authorized === null || (authorized === false && loading)) return <DashboardLayout><div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div></DashboardLayout>;
  if (authorized === false) return <DashboardLayout><div className="flex h-60 flex-col items-center justify-center text-center text-red-400"><AlertCircle size={48} className="mb-3" /><h2 className="text-xl font-bold">غير مصرح</h2></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Users className="text-[var(--color-primary)]" size={28} /><div><h1 className="text-2xl font-black text-white">مركز تحكم المستخدمين</h1><p className="text-xs text-zinc-500">بحث، حماية، رصيد، إجراءات جماعية وتقارير آمنة</p></div></div><Link href="/admin" className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300">لوحة الإدارة</Link></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="glass-card rounded-xl p-3"><div className="text-[10px] text-zinc-500">كل المستخدمين</div><div className="mt-1 text-lg font-black text-white">{stats.total_users}</div></div><div className="glass-card rounded-xl p-3"><div className="text-[10px] text-zinc-500">النشطون</div><div className="mt-1 text-lg font-black text-emerald-300">{stats.active_users}</div></div><div className="glass-card rounded-xl p-3"><div className="text-[10px] text-zinc-500">المحظورون</div><div className="mt-1 text-lg font-black text-red-300">{stats.banned_users}</div></div><div className="glass-card rounded-xl p-3"><div className="text-[10px] text-zinc-500">إجمالي الأرصدة</div><div className="mt-1 truncate text-lg font-black text-[var(--color-gold)]">{money(stats.total_balance)}</div></div></div>
        <section className="glass-card space-y-3 rounded-2xl border border-[var(--color-border)] p-3 sm:p-4">
          <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} /><input type="text" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void fetchUsers(1)} placeholder="ابحث بالاسم أو البريد أو رقم المستخدم..." className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] py-3.5 pr-12 pl-4 text-sm text-white outline-none focus:border-[var(--color-primary)]" /></div><button type="button" onClick={() => void fetchUsers(1)} className="rounded-2xl border border-[var(--color-border)] px-4 text-zinc-300" aria-label="تحديث المستخدمين"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs text-white outline-none"><option value="all">كل الحالات</option><option value="active">نشط فقط</option><option value="banned">محظور فقط</option></select><select value={sort} onChange={(event) => { setSort(event.target.value as SortMode); setPage(1); }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs text-white outline-none"><option value="created_desc">الأحدث تسجيلًا</option><option value="created_asc">الأقدم تسجيلًا</option><option value="balance_desc">الأعلى رصيدًا</option><option value="balance_asc">الأقل رصيدًا</option><option value="username_asc">الاسم أبجديًا</option></select><a href={exportUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)]/30 px-3 py-3 text-xs font-black text-[var(--color-gold)]"><Download size={14} />تصدير CSV</a><button type="button" onClick={toggleAll} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-3 text-xs font-bold text-zinc-300">{allVisibleSelected ? <CheckSquare size={14} /> : <Square size={14} />}تحديد الصفحة</button></div>
          {selectedIds.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 p-2"><span className="text-[11px] font-black text-[var(--color-gold)]">تم تحديد {selectedIds.length}</span><button type="button" disabled={actionLoading} onClick={() => void bulkAction("bulkBan")} className="rounded-lg bg-red-500/15 px-3 py-2 text-[10px] font-black text-red-300 disabled:opacity-50"><Ban size={13} className="ml-1 inline" />حظر جماعي</button><button type="button" disabled={actionLoading} onClick={() => void bulkAction("bulkUnban")} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-[10px] font-black text-emerald-300 disabled:opacity-50"><Unlock size={13} className="ml-1 inline" />فك جماعي</button><button type="button" onClick={() => setSelectedIds([])} className="mr-auto rounded-lg px-2 py-2 text-[10px] text-zinc-500">إلغاء التحديد</button></div>}
        </section>
        {message && <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm font-bold text-zinc-200">{message}</div>}
        <div className="flex items-center justify-between text-[11px] text-zinc-500"><span>{total} مستخدم مطابق للفلاتر · الصفحة {page} من {pages}</span><span>{selectedIds.length ? `${selectedIds.length} محدد` : ""}</span></div>
        {loading ? <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div> : users.length === 0 ? <div className="glass-card rounded-2xl p-10 text-center text-sm text-zinc-500">لا توجد حسابات مطابقة</div> : <div className="space-y-3">{users.map((u) => <div key={u.id} className={`glass-card rounded-2xl border p-4 ${selectedIds.includes(u.id) ? "border-[var(--color-gold)]/50" : "border-[var(--color-border)]"}`}><div className="flex items-start gap-3"><button type="button" onClick={() => toggleSelected(u.id)} className="mt-1 shrink-0 text-zinc-500" aria-label={`تحديد ${u.username}`}>{selectedIds.includes(u.id) ? <CheckSquare size={18} className="text-[var(--color-gold)]" /> : <Square size={18} />}</button><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><span className="font-black text-white">{u.username}</span><span className="mr-2 text-[10px] text-zinc-600">#{u.id}</span></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${u.is_banned ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>{u.is_banned ? "محظور" : "نشط"}</span></div><div className="truncate text-xs text-zinc-400">{u.email || "لا يوجد بريد مسجل"}</div><div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-bold text-[var(--color-primary)]"><span>{money(u.balance)}</span><span className="text-[10px] font-normal text-zinc-600">{u.orders_count} طلب · {dateTime(u.created_at)}</span></div></div></div><div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><button onClick={() => void openDetails(u)} className="flex items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white"><Eye size={14} /> التفاصيل</button><Link href={`/admin/users/${u.id}/orders`} className="flex items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white"><ClipboardList size={14} /> الطلبات</Link><button onClick={() => void action(u.id, u.is_banned ? "unban" : "ban")} className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${u.is_banned ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{u.is_banned ? <Unlock size={14} /> : <Ban size={14} />}{u.is_banned ? "فك الحظر" : "حظر"}</button><button onClick={() => { setSelectedUser(u); setDetails(null); }} className="flex items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white"><Wallet size={14} /> الرصيد</button><button onClick={() => { if (confirm(`حذف المستخدم ${u.username} نهائيًا؟`)) void action(u.id, "delete"); }} className="flex items-center justify-center gap-1 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400"><Trash2 size={14} /> حذف</button></div></div>)}</div>}
        <div className="flex items-center justify-between gap-3"><button type="button" disabled={page <= 1 || loading} onClick={() => void fetchUsers(page - 1)} className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 disabled:opacity-40"><ChevronRight size={15} />السابق</button><span className="text-xs font-bold text-zinc-500">{page} / {pages}</span><button type="button" disabled={page >= pages || loading} onClick={() => void fetchUsers(page + 1)} className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 disabled:opacity-40">التالي<ChevronLeft size={15} /></button></div>
        {selectedUser && <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-black/80 p-3 sm:items-center"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-white">تحكم بالحساب: {selectedUser.username}</h3><p className="text-[10px] text-zinc-500">#{selectedUser.id} · لا تُعرض كلمات المرور القديمة أو تُحفظ بصورتها الأصلية</p></div><button onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-zinc-400"><X size={17} /></button></div>{detailsLoading ? <div className="flex h-32 items-center justify-center"><RefreshCw className="animate-spin text-[var(--color-gold)]" /></div> : details ? <div className="space-y-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-[10px] text-zinc-500">الرصيد</div><b className="text-sm text-[var(--color-gold)]">{money(details.user.balance)}</b></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-[10px] text-zinc-500">الطلبات</div><b className="text-sm text-white">{details.orders.length}</b></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-[10px] text-zinc-500">المعاملات</div><b className="text-sm text-white">{details.transactions.length}</b></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-[10px] text-zinc-500">الدعم</div><b className="text-sm text-white">{details.tickets.length}</b></div></div><div className="grid gap-3 sm:grid-cols-2"><section className="rounded-2xl border border-[var(--color-border)] p-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-black text-white"><Wallet size={14} className="text-[var(--color-gold)]" />تعديل الرصيد</h4><input type="number" min="0" step="0.000001" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="المبلغ بالدولار" className="input-luxe w-full rounded-xl px-3 py-2 text-sm text-white" /><div className="mt-2 grid grid-cols-2 gap-2"><button disabled={actionLoading} onClick={() => void action(details.user.id, "addBalance", { amount })} className="rounded-xl bg-emerald-500/15 py-2 text-xs font-bold text-emerald-300"><Plus size={14} className="inline" /> إضافة</button><button disabled={actionLoading} onClick={() => void action(details.user.id, "subtractBalance", { amount })} className="rounded-xl bg-red-500/15 py-2 text-xs font-bold text-red-300"><Minus size={14} className="inline" /> خصم</button></div></section><section className="rounded-2xl border border-[var(--color-border)] p-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-black text-white"><KeyRound size={14} className="text-[var(--color-gold)]" />إعادة تعيين آمنة</h4><input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="كلمة مرور جديدة، 8 أحرف على الأقل" className="input-luxe w-full rounded-xl px-3 py-2 text-sm text-white" /><button disabled={actionLoading || newPassword.length < 8} onClick={() => void action(details.user.id, "setPassword", { password: newPassword })} className="mt-2 w-full rounded-xl bg-[var(--color-gold)] py-2 text-xs font-black text-black disabled:opacity-50">حفظ كلمة مرور جديدة</button></section></div><div className="grid gap-3 sm:grid-cols-2"><section className="rounded-2xl border border-[var(--color-border)] p-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-black text-white"><ClipboardList size={14} className="text-[var(--color-gold)]" />آخر الطلبات</h4><div className="space-y-1.5">{details.orders.slice(0, 6).map((order) => <div key={order.id} className="flex justify-between gap-2 text-[10px] text-zinc-300"><span className="truncate">#{order.id} · {order.service_name || "خدمة"}</span><span>{money(order.charge)} · {order.status}</span></div>)}{details.orders.length === 0 && <span className="text-[10px] text-zinc-500">لا توجد طلبات</span>}</div></section><section className="rounded-2xl border border-[var(--color-border)] p-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-black text-white"><History size={14} className="text-[var(--color-gold)]" />آخر المعاملات والتدقيق</h4><div className="space-y-1.5">{details.transactions.slice(0, 4).map((transaction) => <div key={`t-${transaction.id}`} className="flex justify-between gap-2 text-[10px] text-zinc-300"><span className="truncate">{transaction.description || transaction.type}</span><span>{money(transaction.amount)}</span></div>)}{details.audit.slice(0, 3).map((audit) => <div key={`a-${audit.id}`} className="text-[10px] text-amber-200">إجراء إداري: {audit.action}</div>)}{details.transactions.length === 0 && details.audit.length === 0 && <span className="text-[10px] text-zinc-500">لا يوجد سجل</span>}</div></section></div><div className="flex flex-wrap gap-2"><button onClick={() => void action(details.user.id, details.user.is_banned ? "unban" : "ban")} className={`rounded-xl px-3 py-2 text-xs font-bold ${details.user.is_banned ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{details.user.is_banned ? <Unlock size={14} className="inline" /> : <Ban size={14} className="inline" />} {details.user.is_banned ? "فك الحظر" : "حظر الحساب"}</button><Link href={`/admin/users/${details.user.id}/orders`} className="rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white"><TicketCheck size={14} className="inline" /> مراجعة الطلبات كاملة</Link></div></div> : <div className="text-center text-sm text-zinc-500">اختر مستخدمًا لعرض التفاصيل</div>}</div></div>}
      </div>
    </DashboardLayout>
  );
}
