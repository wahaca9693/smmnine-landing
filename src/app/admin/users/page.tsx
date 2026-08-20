"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { Users, Search, Ban, Unlock, Trash2, Plus, Minus, Eye, AlertCircle, History, KeyRound, X, RefreshCw, Wallet, ClipboardList, TicketCheck } from "lucide-react";

interface UserRow { id: number; username: string; email: string; balance: number; is_banned: number; status: string; created_at?: string; }
interface DetailOrder { id: number; service_name?: string | null; charge?: number | string | null; status?: string | null; }
interface DetailTransaction { id: number; description?: string | null; type?: string | null; amount?: number | string | null; }
interface DetailTicket { id: number; status?: string | null; }
interface DetailAudit { id: number; action?: string | null; }
interface UserDetails { user: UserRow & { terms_accepted: number }; orders: DetailOrder[]; transactions: DetailTransaction[]; tickets: DetailTicket[]; audit: DetailAudit[]; }
type UsersResponse = { users?: UserRow[]; error?: string };
type UsersRequestResult = UsersResponse & { ok: boolean };

async function requestAdminUsers(search: string): Promise<UsersRequestResult> {
  const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`, { credentials: "include", cache: "no-store" });
  const data = await res.json() as UsersResponse;
  return { ...data, ok: res.ok };
}

const money = (value: unknown) => `$${Number(value || 0).toFixed(6)}`;

export default function AdminUsersPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user", { credentials: "include", cache: "no-store" }).then((res) => res.json()).then((data) => setAuthorized(data.user?.role === "admin")).catch(() => setAuthorized(false));
    void requestAdminUsers("").then((data) => {
      setUsers(data.users || []);
      if (!data.ok) setMessage(data.error || "تعذر تحميل المستخدمين");
    }).catch(() => setMessage("تعذر تحميل المستخدمين"));
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await requestAdminUsers(search);
      setUsers(data.users || []);
      if (!data.ok) setMessage(data.error || "تعذر تحميل المستخدمين");
    } catch {
      setMessage("تعذر تحميل المستخدمين");
    } finally { setLoading(false); }
  }

  const openDetails = async (user: UserRow) => {
    setSelectedUser(user); setDetails(null); setDetailsLoading(true); setMessage("");
    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (res.ok) setDetails(data); else setMessage(data.error || "تعذر تحميل التفاصيل");
    } finally { setDetailsLoading(false); }
  };

  const action = async (userId: number, actionName: string, extra: Record<string, unknown> = {}) => {
    if (actionLoading) return;
    setActionLoading(true); setMessage("");
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: actionName, userId, ...extra }) });
      const data = await res.json();
      setMessage(data.error || data.message || "تم التنفيذ");
      if (res.ok) { await fetchUsers(); if (details?.user.id === userId) await openDetails(details.user); }
    } finally { setActionLoading(false); }
  };

  const closeModal = () => { setSelectedUser(null); setDetails(null); setAmount(""); setNewPassword(""); };

  if (authorized === null || (authorized === false && loading)) return <DashboardLayout><div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div></DashboardLayout>;
  if (authorized === false) return <DashboardLayout><div className="flex h-60 flex-col items-center justify-center text-center text-red-400"><AlertCircle size={48} className="mb-3" /><h2 className="text-xl font-bold">غير مصرح</h2></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Users className="text-[var(--color-primary)]" size={28} /><div><h1 className="text-2xl font-black text-white">مركز تحكم المستخدمين</h1><p className="text-xs text-zinc-500">الحساب، الرصيد، الطلبات، الدعم، السجل والحماية</p></div></div><Link href="/admin" className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300">لوحة الإدارة</Link></div>
        <div className="grid grid-cols-3 gap-2"><div className="glass-card rounded-xl p-3"><div className="text-[10px] text-zinc-500">النتائج</div><div className="mt-1 text-lg font-black text-white">{users.length}</div></div><div className="glass-card rounded-xl p-3"><div className="text-[10px] text-zinc-500">المحظورون</div><div className="mt-1 text-lg font-black text-red-300">{users.filter((u) => u.is_banned).length}</div></div><div className="glass-card rounded-xl p-3"><div className="text-[10px] text-zinc-500">الرصيد الظاهر</div><div className="mt-1 truncate text-lg font-black text-[var(--color-gold)]">{money(users.reduce((sum, u) => sum + Number(u.balance || 0), 0))}</div></div></div>
        <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void fetchUsers()} placeholder="ابحث بالاسم أو البريد أو رقم المستخدم..." className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] py-3.5 pr-12 pl-4 text-sm text-white outline-none focus:border-[var(--color-primary)]" /></div><button type="button" onClick={() => void fetchUsers()} className="rounded-2xl border border-[var(--color-border)] px-4 text-zinc-300"><RefreshCw size={17} /></button></div>
        {message && <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm font-bold text-zinc-200">{message}</div>}
        {loading ? <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div> : <div className="space-y-3">{users.map((u) => <div key={u.id} className="glass-card rounded-2xl border border-[var(--color-border)] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="font-black text-white">{u.username}</span><span className="text-[10px] text-zinc-600">#{u.id}</span></div><div className="truncate text-xs text-zinc-400">{u.email || "لا يوجد بريد مسجل"}</div><div className="mt-1 text-sm font-bold text-[var(--color-primary)]">{money(u.balance)}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${u.is_banned ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>{u.is_banned ? "محظور" : "نشط"}</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><button onClick={() => void openDetails(u)} className="flex items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white"><Eye size={14} /> التفاصيل</button><Link href={`/admin/users/${u.id}/orders`} className="flex items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white"><ClipboardList size={14} /> الطلبات</Link><button onClick={() => void action(u.id, u.is_banned ? "unban" : "ban")} className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${u.is_banned ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{u.is_banned ? <Unlock size={14} /> : <Ban size={14} />}{u.is_banned ? "فك الحظر" : "حظر"}</button><button onClick={() => { setSelectedUser(u); setDetails(null); }} className="flex items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white"><Wallet size={14} /> الرصيد</button><button onClick={() => { if (confirm(`حذف المستخدم ${u.username} نهائيًا؟`)) void action(u.id, "delete"); }} className="flex items-center justify-center gap-1 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400"><Trash2 size={14} /> حذف</button></div></div>)}</div>}
        {selectedUser && <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-black/80 p-3 sm:items-center"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-white">تحكم بالحساب: {selectedUser.username}</h3><p className="text-[10px] text-zinc-500">#{selectedUser.id} · لا تُعرض كلمات المرور القديمة أو تُحفظ بصورتها الأصلية</p></div><button onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-zinc-400"><X size={17} /></button></div>{detailsLoading ? <div className="flex h-32 items-center justify-center"><RefreshCw className="animate-spin text-[var(--color-gold)]" /></div> : details ? <div className="space-y-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-[10px] text-zinc-500">الرصيد</div><b className="text-sm text-[var(--color-gold)]">{money(details.user.balance)}</b></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-[10px] text-zinc-500">الطلبات</div><b className="text-sm text-white">{details.orders.length}</b></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-[10px] text-zinc-500">المعاملات</div><b className="text-sm text-white">{details.transactions.length}</b></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-[10px] text-zinc-500">الدعم</div><b className="text-sm text-white">{details.tickets.length}</b></div></div><div className="grid gap-3 sm:grid-cols-2"><section className="rounded-2xl border border-[var(--color-border)] p-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-black text-white"><Wallet size={14} className="text-[var(--color-gold)]" />تعديل الرصيد</h4><input type="number" min="0" step="0.000001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ بالدولار" className="input-luxe w-full rounded-xl px-3 py-2 text-sm text-white" /><div className="mt-2 grid grid-cols-2 gap-2"><button disabled={actionLoading} onClick={() => void action(details.user.id, "addBalance", { amount })} className="rounded-xl bg-emerald-500/15 py-2 text-xs font-bold text-emerald-300"><Plus size={14} className="inline" /> إضافة</button><button disabled={actionLoading} onClick={() => void action(details.user.id, "subtractBalance", { amount })} className="rounded-xl bg-red-500/15 py-2 text-xs font-bold text-red-300"><Minus size={14} className="inline" /> خصم</button></div></section><section className="rounded-2xl border border-[var(--color-border)] p-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-black text-white"><KeyRound size={14} className="text-[var(--color-gold)]" />إعادة تعيين آمنة</h4><input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة مرور جديدة، 8 أحرف على الأقل" className="input-luxe w-full rounded-xl px-3 py-2 text-sm text-white" /><button disabled={actionLoading || newPassword.length < 8} onClick={() => void action(details.user.id, "setPassword", { password: newPassword })} className="mt-2 w-full rounded-xl bg-[var(--color-gold)] py-2 text-xs font-black text-black disabled:opacity-50">حفظ كلمة مرور جديدة</button></section></div><div className="grid gap-3 sm:grid-cols-2"><section className="rounded-2xl border border-[var(--color-border)] p-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-black text-white"><ClipboardList size={14} className="text-[var(--color-gold)]" />آخر الطلبات</h4><div className="space-y-1.5">{details.orders.slice(0, 6).map((o) => <div key={o.id} className="flex justify-between gap-2 text-[10px] text-zinc-300"><span className="truncate">#{o.id} · {o.service_name || "خدمة"}</span><span>{money(o.charge)} · {o.status}</span></div>)}{details.orders.length === 0 && <span className="text-[10px] text-zinc-500">لا توجد طلبات</span>}</div></section><section className="rounded-2xl border border-[var(--color-border)] p-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-black text-white"><History size={14} className="text-[var(--color-gold)]" />آخر المعاملات والتدقيق</h4><div className="space-y-1.5">{details.transactions.slice(0, 4).map((t) => <div key={`t-${t.id}`} className="flex justify-between gap-2 text-[10px] text-zinc-300"><span className="truncate">{t.description || t.type}</span><span>{money(t.amount)}</span></div>)}{details.audit.slice(0, 3).map((a) => <div key={`a-${a.id}`} className="text-[10px] text-amber-200">إجراء إداري: {a.action}</div>)}{details.transactions.length === 0 && details.audit.length === 0 && <span className="text-[10px] text-zinc-500">لا يوجد سجل</span>}</div></section></div><div className="flex flex-wrap gap-2"><button onClick={() => void action(details.user.id, details.user.is_banned ? "unban" : "ban")} className={`rounded-xl px-3 py-2 text-xs font-bold ${details.user.is_banned ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{details.user.is_banned ? <Unlock size={14} className="inline" /> : <Ban size={14} className="inline" />} {details.user.is_banned ? "فك الحظر" : "حظر الحساب"}</button><Link href={`/admin/users/${details.user.id}/orders`} className="rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white"><TicketCheck size={14} className="inline" /> مراجعة الطلبات كاملة</Link></div></div> : <div className="text-center text-sm text-zinc-500">اختر مستخدمًا لعرض التفاصيل</div>}</div></div>}
      </div>
    </DashboardLayout>
  );
}
