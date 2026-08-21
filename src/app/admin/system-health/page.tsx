"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../../components/DashboardLayout";
import { Activity, AlertCircle, CheckCircle2, ChevronLeft, Database, HardDrive, KeyRound, Link2, RefreshCw, ServerCog, ShieldCheck, Ticket, Users, Wallet, XCircle, Zap } from "lucide-react";

type Health = {
  generatedAt: string;
  overall: "healthy" | "attention";
  database: { status: string; latencyMs: number; connected: boolean; missingTables: string[] };
  integrations: { nowPayments: { status: string; credentialsPresent: boolean }; asiaCell: { status: string; proxyConfigured: boolean }; storage: { mode: string; status: string; blobConfigured: boolean } };
  metrics: { users: { total: number; banned: number }; orders: { total: number; pending: number }; providers: { total: number; active: number }; providerServices: { total: number; active: number }; deposits: { total: number; pending: number }; tickets: { total: number; open: number } };
};

type HealthResponse = Health & { error?: string };

const integer = (value: number) => new Intl.NumberFormat("ar-IQ").format(value);
const dateTime = (value: string) => value ? new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

function StatusBadge({ status }: { status: string }) {
  const ready = ["healthy", "ready"].includes(status);
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${ready ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{ready ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}{ready ? "جاهز" : "يحتاج مراجعة"}</span>;
}

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof Activity; label: string; value: string; hint: string }) {
  return <div className="glass-card rounded-2xl border border-[var(--color-border)] p-3"><div className="flex items-center justify-between gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]"><Icon size={16} /></span><span className="text-[10px] text-zinc-600">{hint}</span></div><div className="mt-3 text-xl font-black text-white">{value}</div><div className="mt-1 text-[10px] font-bold text-zinc-500">{label}</div></div>;
}

export default function AdminSystemHealthPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/system-health", { credentials: "include", cache: "no-store" });
      const data = await response.json() as HealthResponse;
      if (!response.ok) throw new Error(data.error || "تعذر قراءة صحة النظام");
      setHealth(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر قراءة صحة النظام"); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch("/api/user", { credentials: "include", cache: "no-store" }).then((response) => response.json()).then((data) => setAuthorized(data.user?.role === "admin")).catch(() => setAuthorized(false));
  }, []);
  useEffect(() => {
    if (!authorized) return;
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [authorized, load]);

  if (authorized === null || (authorized && loading && !health)) return <DashboardLayout><div className="flex h-48 items-center justify-center"><RefreshCw className="animate-spin text-[var(--color-gold)]" /></div></DashboardLayout>;
  if (authorized === false) return <DashboardLayout><div className="flex h-60 flex-col items-center justify-center text-center text-red-400"><AlertCircle size={48} className="mb-3" /><h2 className="text-xl font-bold">غير مصرح</h2><p className="text-zinc-500">لا تملك صلاحية الوصول إلى هذه الصفحة</p></div></DashboardLayout>;
  if (!health) return <DashboardLayout><div className="flex h-60 flex-col items-center justify-center gap-3 text-center text-zinc-400"><XCircle size={42} /><p>{error || "لا توجد بيانات"}</p><button onClick={() => void load()} className="rounded-xl bg-[var(--color-gold)] px-4 py-2 text-xs font-black text-black">إعادة المحاولة</button></div></DashboardLayout>;

  return <DashboardLayout><div className="space-y-4 pb-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]"><ServerCog size={23} /></div><div><h1 className="text-2xl font-black text-white">مركز صحة النظام</h1><p className="text-xs text-zinc-500">مراقبة آمنة للاتصال والمخطط والتكاملات</p></div></div><div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />تحديث</button><Link href="/admin" className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300">الإدارة<ChevronLeft size={14} /></Link></div></div>
    <section className={`rounded-2xl border p-4 ${health.overall === "healthy" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{health.overall === "healthy" ? <CheckCircle2 className="text-emerald-300" size={25} /> : <AlertCircle className="text-amber-300" size={25} />}<div><h2 className="font-black text-white">{health.overall === "healthy" ? "النظام يعمل بصورة طبيعية" : "توجد عناصر تحتاج مراجعة"}</h2><p className="text-[10px] text-zinc-500">آخر فحص: {dateTime(health.generatedAt)}</p></div></div><span className="text-xs font-bold text-zinc-400">زمن قاعدة البيانات: {health.database.latencyMs}ms</span></div></section>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><MetricCard icon={Users} label="المستخدمون" value={integer(health.metrics.users.total)} hint={`${health.metrics.users.banned} محظور`} /><MetricCard icon={Activity} label="الطلبات" value={integer(health.metrics.orders.total)} hint={`${health.metrics.orders.pending} معلّق`} /><MetricCard icon={Wallet} label="الإيداعات" value={integer(health.metrics.deposits.total)} hint={`${health.metrics.deposits.pending} معلّق`} /><MetricCard icon={Link2} label="المزودون" value={integer(health.metrics.providers.total)} hint={`${health.metrics.providers.active} نشط`} /><MetricCard icon={Zap} label="خدمات المزودين" value={integer(health.metrics.providerServices.total)} hint={`${health.metrics.providerServices.active} نشط`} /><MetricCard icon={Ticket} label="تذاكر الدعم" value={integer(health.metrics.tickets.total)} hint={`${health.metrics.tickets.open} مفتوحة`} /></div>
    <div className="grid gap-3 lg:grid-cols-2"><section className="glass-card rounded-2xl border border-[var(--color-border)] p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Database size={17} className="text-[var(--color-gold)]" />قاعدة البيانات والمخطط</h3><div className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-xs"><span className="text-zinc-400">الاتصال</span><span className="flex items-center gap-2 font-bold text-zinc-200">{health.database.connected ? "متصل" : "غير متصل"}<StatusBadge status={health.database.status} /></span></div><div className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-xs"><span className="text-zinc-400">الجداول المطلوبة</span><span className="font-bold text-zinc-200">{health.database.missingTables.length ? `ناقص ${health.database.missingTables.length}` : "مكتمل"}</span></div>{health.database.missingTables.length > 0 && <p className="mt-3 rounded-xl bg-amber-500/10 p-2 text-[10px] text-amber-200">الجداول الناقصة: {health.database.missingTables.join("، ")}</p>}</section><section className="glass-card rounded-2xl border border-[var(--color-border)] p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><ShieldCheck size={17} className="text-[var(--color-gold)]" />التكاملات والتخزين</h3><div className="space-y-2 text-xs"><div className="flex items-center justify-between"><span className="text-zinc-400">NOWPayments</span><StatusBadge status={health.integrations.nowPayments.status} /></div><div className="flex items-center justify-between"><span className="text-zinc-400">آسياسيل</span><StatusBadge status={health.integrations.asiaCell.status} /></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-zinc-400"><HardDrive size={14} />الوسائط ({health.integrations.storage.mode})</span><StatusBadge status={health.integrations.storage.status} /></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-zinc-400"><KeyRound size={14} />حالة المفاتيح</span><span className="text-[10px] text-zinc-500">لا يتم عرض القيم السرية</span></div></div></section></div>
    {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">{error}</div>}
  </div></DashboardLayout>;
}
