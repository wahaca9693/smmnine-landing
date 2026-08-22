"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { useInitialAuthUser } from "@/app/components/Providers";
import Link from "next/link";
import {
  Activity,
  ServerCog,
  AlertCircle,
  Bell,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Coins,
  Clock3,
  Eye,
  FileSearch,
  KeyRound,
  MessageSquare,
  Minus,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Gift,
  TrendingUp,
  Users,
  Wallet,
  Settings2,
  Zap,
  XCircle,
} from "lucide-react";

type Range = "today" | "7d" | "30d" | "90d" | "all";
type Result = { message?: string; error?: string } | null;
type NumericRecord = Record<string, number>;

type AnalyticsData = {
  range: Range;
  generatedAt: string;
  summary: NumericRecord;
  topServices: Array<{ service_name: string; orders_count: number; total_quantity: number; total_sales: number }>;
  payments: Array<{ method: string; requests_count: number; requested_amount: number; completed_amount: number; pending_amount: number }>;
  daily: Array<{ day: string; orders_count: number; sales: number }>;
  recentOrders: Array<{ id: number; username: string; service_name: string; quantity: number; charge: number; status: string; created_at: string }>;
  topUsers: Array<{ id: number; username: string; balance: number; created_at: string; orders_count: number; orders_value: number }>;
  system: {
    nowpaymentsConfigured: boolean;
    asiacellConnected: boolean;
    asiacellUpdatedAt: string | null;
    recentActivity: Array<{ id: number; action: string; details: string; created_at: string; admin_username?: string; target_username?: string }>;
  };
};

const emptyAnalytics: AnalyticsData = {
  range: "30d",
  generatedAt: "",
  summary: {},
  topServices: [],
  payments: [],
  daily: [],
  recentOrders: [],
  topUsers: [],
  system: { nowpaymentsConfigured: false, asiacellConnected: false, asiacellUpdatedAt: null, recentActivity: [] },
};

const rangeLabels: Record<Range, string> = {
  today: "اليوم",
  "7d": "7 أيام",
  "30d": "30 يومًا",
  "90d": "90 يومًا",
  all: "كل الوقت",
};

const paymentLabels: Record<string, string> = {
  asiacell: "آسياسيل",
  usdt: "USDT",
  bnb: "BNB",
  btc: "BTC",
  crypto: "كريبتو",
  admin: "إدارة",
};

type QuickAction = { href: string; label: string; keywords: string; icon: typeof Users };

const quickActions: QuickAction[] = [
  { href: "/admin/orders", label: "مراجعة الطلبات", keywords: "طلبات order", icon: ClipboardList },
  { href: "/admin/users", label: "إدارة المستخدمين", keywords: "مستخدمين users حساب رصيد", icon: Users },
  { href: "/admin/providers", label: "المزودون والخدمات", keywords: "مزود خدمات providers", icon: Activity },
  { href: "/admin/crypto", label: "إيداعات الكريبتو", keywords: "دفع شحن crypto nowpayments", icon: Coins },
  { href: "/admin/asiacell", label: "إعدادات آسياسيل", keywords: "asiacell تحويل شحن", icon: Smartphone },
  { href: "/admin/free-services", label: "المجاني والهدايا", keywords: "مجاني هدايا free gifts", icon: Gift },
  { href: "/admin/gift-codes", label: "أكواد الهدايا", keywords: "كود هدية gift code", icon: Gift },
  { href: "/admin/theme", label: "هوية المنصة", keywords: "اسم شعار مظهر branding theme", icon: Palette },
  { href: "/admin/notifications", label: "إرسال إشعار", keywords: "إشعار notifications", icon: Bell },
  { href: "/admin/api-keys", label: "مفاتيح API", keywords: "api مفاتيح", icon: KeyRound },
  { href: "/admin/system-health", label: "صحة النظام", keywords: "صحة مراقبة health system database مخطط", icon: ServerCog },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function integer(value: number) {
  return new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(value);
}

function dateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function orderStatus(status: string) {
  const key = String(status || "").toLowerCase();
  if (["completed", "complete", "success"].includes(key)) return { label: "مكتمل", className: "text-emerald-400", icon: CheckCircle2 };
  if (["cancelled", "canceled", "failed", "refunded"].includes(key)) return { label: "متوقف", className: "text-red-400", icon: XCircle };
  return { label: status || "قيد المعالجة", className: "text-amber-300", icon: Clock3 };
}

function StatCard({ icon: Icon, label, value, hint, tone = "gold" }: { icon: typeof Activity; label: string; value: string; hint?: string; tone?: "gold" | "green" | "purple" | "blue" }) {
  const tones = {
    gold: "text-[var(--color-gold)] bg-[var(--color-gold)]/10",
    green: "text-emerald-300 bg-emerald-500/10",
    purple: "text-violet-300 bg-violet-500/10",
    blue: "text-sky-300 bg-sky-500/10",
  };
  return (
    <div className="glass-card min-w-0 rounded-2xl p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={16} /></span>
        {hint && <span className="truncate text-[9px] text-zinc-600">{hint}</span>}
      </div>
      <div className="truncate text-lg font-black text-white sm:text-xl">{value}</div>
      <div className="mt-1 truncate text-[10px] font-bold text-zinc-500">{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const initialUser = useInitialAuthUser();
  const authorized = initialUser ? initialUser.role === "admin" : null;
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [range, setRange] = useState<Range>("30d");
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"add" | "subtract">("add");
  const [result, setResult] = useState<Result>(null);
  const [loading, setLoading] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const analyticsAbortRef = useRef<AbortController | null>(null);
  const analyticsRequestRef = useRef(0);

  const loadAnalytics = useCallback(async () => {
    analyticsAbortRef.current?.abort();
    const controller = new AbortController();
    analyticsAbortRef.current = controller;
    const requestId = ++analyticsRequestRef.current;
    setLoadingAnalytics(true);
    setAnalyticsError("");
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`, { cache: "no-store", credentials: "include", signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحميل التحليلات");
      if (requestId === analyticsRequestRef.current) setAnalytics(data as AnalyticsData);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestId === analyticsRequestRef.current) setAnalyticsError(error instanceof Error ? error.message : "تعذر تحميل التحليلات");
    } finally {
      if (requestId === analyticsRequestRef.current) setLoadingAnalytics(false);
    }
  }, [range]);

  useEffect(() => {
    if (!authorized) return;
    const timer = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      analyticsAbortRef.current?.abort();
    };
  }, [authorized, loadAnalytics]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, amount, type }),
      });
      const data = await res.json();
      setResult(data);
      if (res.ok) {
        setUsername("");
        setAmount("");
        await loadAnalytics();
      }
    } catch {
      setResult({ error: "تعذر الاتصال بالخادم" });
    } finally {
      setLoading(false);
    }
  };

  const maxServiceOrders = useMemo(() => Math.max(1, ...analytics.topServices.map((service) => service.orders_count)), [analytics.topServices]);
  const maxDailySales = useMemo(() => Math.max(1, ...analytics.daily.map((day) => day.sales)), [analytics.daily]);
  const visibleQuickActions = useMemo(() => {
    const query = quickSearch.trim().toLocaleLowerCase("ar");
    if (!query) return quickActions;
    return quickActions.filter((action) => `${action.label} ${action.keywords}`.toLocaleLowerCase("ar").includes(query));
  }, [quickSearch]);

  if (authorized === null) {
    return <DashboardLayout><div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div></DashboardLayout>;
  }

  if (authorized === false) {
    return <DashboardLayout><div className="flex h-60 flex-col items-center justify-center text-center text-red-400"><AlertCircle size={48} className="mb-3" /><h2 className="text-xl font-bold">غير مصرح</h2><p className="text-zinc-500">لا تملك صلاحية الوصول إلى هذه الصفحة</p></div></DashboardLayout>;
  }

  const summary = analytics.summary;
  const operationalAlerts: Array<{ href: string; label: string; value: string; tone: "amber" | "red" }> = [];
  if ((summary.pending_orders || 0) > 0) {
    operationalAlerts.push({ href: "/admin/orders", label: "طلبات تحتاج متابعة", value: integer(summary.pending_orders), tone: "amber" });
  }
  if ((summary.pending_deposits || 0) > 0) {
    operationalAlerts.push({ href: "/admin/crypto", label: "إيداعات معلّقة", value: money(summary.pending_deposits), tone: "red" });
  }
  if ((summary.banned_users || 0) > 0) {
    operationalAlerts.push({ href: "/admin/users", label: "حسابات محظورة", value: integer(summary.banned_users), tone: "amber" });
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-6">
        <section className="flex flex-col gap-3 rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(212,175,55,0.12),rgba(16,16,16,0.9))] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-deep)] shadow-lg shadow-[var(--color-gold)]/20"><Shield size={22} className="text-black" /></div>
            <div className="min-w-0"><h1 className="truncate text-xl font-black text-white sm:text-2xl">لوحة الإدارة المتقدمة</h1><p className="truncate text-[10px] text-zinc-500 sm:text-xs">قراءة تشغيلية موحّدة للطلبات والأرصدة والمدفوعات</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/20 p-1">
            <CalendarDays size={15} className="mx-1 text-[var(--color-gold)]" />
            {(Object.keys(rangeLabels) as Range[]).map((item) => <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-lg px-2 py-1.5 text-[10px] font-black transition ${range === item ? "bg-[var(--color-gold)] text-black" : "text-zinc-400 hover:text-white"}`}>{rangeLabels[item]}</button>)}
            <button type="button" onClick={() => void loadAnalytics()} className="rounded-lg p-1.5 text-zinc-400 hover:text-[var(--color-gold)]" aria-label="تحديث التحليلات"><RefreshCw size={14} className={loadingAnalytics ? "animate-spin" : ""} /></button>
          </div>
        </section>

        {analyticsError && <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300"><span>{analyticsError}</span><button type="button" onClick={() => void loadAnalytics()} className="rounded-lg border border-red-400/20 px-3 py-1.5">إعادة المحاولة</button></div>}

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard icon={CircleDollarSign} label="قيمة الطلبات" value={money(summary.total_sales || 0)} hint={rangeLabels[range]} tone="gold" />
          <StatCard icon={ClipboardList} label="إجمالي الطلبات" value={integer(summary.total_orders || 0)} hint={`${integer(summary.completed_orders || 0)} مكتمل`} tone="purple" />
          <StatCard icon={Users} label="المستخدمون" value={integer(summary.total_users || 0)} hint={`${integer(summary.new_users || 0)} جديد`} tone="blue" />
          <StatCard icon={Wallet} label="أرصدة المستخدمين" value={money(summary.total_balance || 0)} hint={`${integer(summary.banned_users || 0)} محظور`} tone="green" />
        </section>

        {operationalAlerts.length > 0 && (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-amber-200"><AlertCircle size={15} />مركز المتابعة التشغيلية</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {operationalAlerts.map((alert) => (
                <Link key={alert.href} href={alert.href} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/15 px-3 py-2.5 transition hover:border-[var(--color-gold)]/40">
                  <span className="text-[11px] font-bold text-zinc-300">{alert.label}</span>
                  <span className={`text-sm font-black ${alert.tone === "red" ? "text-red-300" : "text-amber-200"}`}>{alert.value}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <StatCard icon={Banknote} label="شحن مكتمل" value={money(summary.completed_deposits || 0)} hint={`${integer(summary.deposit_requests || 0)} طلب شحن`} tone="green" />
            <StatCard icon={Clock3} label="شحن معلّق" value={money(summary.pending_deposits || 0)} hint="يحتاج متابعة" tone="gold" />
            <StatCard icon={Activity} label="طلبات قيد المعالجة" value={integer(summary.pending_orders || 0)} hint="مفتوحة الآن" tone="blue" />
            <StatCard icon={TrendingUp} label="متوسط الطلب" value={money((summary.total_orders || 0) ? (summary.total_sales || 0) / summary.total_orders : 0)} hint="لكل طلب" tone="purple" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-2xl border p-3 ${analytics.system.nowpaymentsConfigured ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}><div className="flex items-center gap-2 text-[10px] text-zinc-400"><CircleDollarSign size={14} className="text-[var(--color-gold)]" />NOWPayments</div><div className={`mt-2 text-xs font-black ${analytics.system.nowpaymentsConfigured ? "text-emerald-300" : "text-amber-300"}`}>{analytics.system.nowpaymentsConfigured ? "مهيّأ" : "غير مهيّأ"}</div><Link href="/admin/crypto" className="mt-2 inline-block text-[9px] font-bold text-[var(--color-gold)]">فتح المدفوعات</Link></div>
            <div className={`rounded-2xl border p-3 ${analytics.system.asiacellConnected ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}><div className="flex items-center gap-2 text-[10px] text-zinc-400"><Smartphone size={14} className="text-[var(--color-gold)]" />Asiacell</div><div className={`mt-2 text-xs font-black ${analytics.system.asiacellConnected ? "text-emerald-300" : "text-red-300"}`}>{analytics.system.asiacellConnected ? "متصل" : "غير متصل"}</div><Link href="/admin/asiacell" className="mt-2 inline-block text-[9px] font-bold text-[var(--color-gold)]">إدارة الربط</Link></div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
          <div className="glass-card rounded-2xl p-4"><div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-base font-black text-white"><Zap size={18} className="text-[var(--color-gold)]" />مركز الوصول السريع</h2><label className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 px-3 py-2 sm:w-52"><Search size={14} className="shrink-0 text-zinc-500" /><input value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="ابحث في الإدارة" aria-label="البحث في إجراءات الإدارة" className="min-w-0 flex-1 bg-transparent text-[11px] font-bold text-white outline-none placeholder:text-zinc-600" /></label></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{visibleQuickActions.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 p-3 text-xs font-bold text-zinc-200 transition hover:-translate-y-0.5 hover:border-[var(--color-gold)]/50"><Icon size={15} className="shrink-0 text-[var(--color-gold)]" /><span className="truncate">{label}</span></Link>)}{visibleQuickActions.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs text-zinc-500">لا توجد نتيجة مطابقة</div>}</div></div>
          <div className="glass-card rounded-2xl p-4"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-black text-white"><FileSearch size={18} className="text-[var(--color-gold)]" />آخر النشاطات</h2><Link href="/admin/audit-log" className="text-[10px] font-bold text-[var(--color-gold)]">السجل الكامل <ArrowUpRight size={12} className="inline" /></Link></div><div className="space-y-2">{analytics.system.recentActivity.length === 0 && <div className="rounded-xl border border-dashed border-[var(--color-border)] p-5 text-center text-xs text-zinc-500">لا توجد نشاطات مسجلة</div>}{analytics.system.recentActivity.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-black/10 p-2.5"><div className="min-w-0"><div className="truncate text-xs font-black text-zinc-200">{item.target_username || "إجراء عام"}</div><div className="mt-1 text-[9px] text-zinc-500">{item.action} · بواسطة {item.admin_username || "الإدارة"}</div></div><span className="shrink-0 text-[9px] text-zinc-600">{dateTime(item.created_at)}</span></div>)}</div></div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="glass-card min-w-0 rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="flex items-center gap-2 text-base font-black text-white"><BarChart3 size={18} className="text-[var(--color-gold)]" />الأكثر طلبًا</h2><p className="mt-1 text-[10px] text-zinc-500">ترتيب الخدمات حسب عدد الطلبات خلال {rangeLabels[range]}</p></div><Link href="/admin/providers" className="text-[10px] font-bold text-[var(--color-gold)]">إدارة الخدمات <ArrowUpRight size={12} className="inline" /></Link></div>
            <div className="space-y-3">
              {analytics.topServices.length === 0 && <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-zinc-500">لا توجد طلبات في الفترة المحددة</div>}
              {analytics.topServices.map((service, index) => <div key={`${service.service_name}-${index}`} className="min-w-0"><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate font-bold text-zinc-200"><span className="ml-1 text-[var(--color-gold)]">{index + 1}.</span>{service.service_name}</span><span className="shrink-0 text-[10px] font-black text-white">{integer(service.orders_count)} طلب</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-l from-[var(--color-gold-bright)] to-[var(--color-gold-deep)]" style={{ width: `${Math.max(4, (service.orders_count / maxServiceOrders) * 100)}%` }} /></div><div className="mt-1 text-[9px] text-zinc-600">الكمية {integer(service.total_quantity)} · المبيعات {money(service.total_sales)}</div></div>)}
            </div>
          </div>

          <div className="glass-card min-w-0 rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="flex items-center gap-2 text-base font-black text-white"><Coins size={18} className="text-[var(--color-gold)]" />طرق الشحن</h2><p className="mt-1 text-[10px] text-zinc-500">ما دفعه المستخدمون وكيف تم الشحن</p></div><Link href="/admin/crypto" className="text-[10px] font-bold text-[var(--color-gold)]">التفاصيل <ArrowUpRight size={12} className="inline" /></Link></div>
            <div className="space-y-2">
              {analytics.payments.length === 0 && <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-zinc-500">لا توجد عمليات شحن</div>}
              {analytics.payments.map((payment) => <div key={payment.method} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-black/10 p-3"><div className="min-w-0"><div className="truncate text-xs font-black text-white">{paymentLabels[payment.method.toLowerCase()] || payment.method}</div><div className="mt-1 text-[9px] text-zinc-500">{integer(payment.requests_count)} طلب · معلّق {money(payment.pending_amount)}</div></div><div className="shrink-0 text-left"><div className="text-sm font-black text-emerald-300">{money(payment.completed_amount)}</div><div className="text-[9px] text-zinc-600">مكتمل</div></div></div>)}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="glass-card min-w-0 rounded-2xl p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-base font-black text-white"><TrendingUp size={18} className="text-[var(--color-gold)]" />نشاط المبيعات</h2><p className="mt-1 text-[10px] text-zinc-500">ملخص يومي للفترة المختارة</p></div></div><div className="flex h-32 items-end gap-1 overflow-hidden sm:gap-2">{analytics.daily.length === 0 && <div className="flex w-full items-center justify-center text-xs text-zinc-500">لا توجد بيانات زمنية</div>}{analytics.daily.map((day) => <div key={day.day} className="group flex h-full min-w-[8px] flex-1 flex-col items-center justify-end gap-1"><div className="relative w-full rounded-t-md bg-gradient-to-t from-[var(--color-gold-deep)] to-[var(--color-gold-bright)] opacity-80 transition group-hover:opacity-100" style={{ height: `${Math.max(5, (day.sales / maxDailySales) * 100)}%` }} title={`${day.day}: ${money(day.sales)} — ${day.orders_count} طلب`} /><span className="hidden text-[8px] text-zinc-600 sm:block">{day.day.slice(5)}</span></div>)}</div></div>

          <div className="glass-card min-w-0 rounded-2xl p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-base font-black text-white"><Users size={18} className="text-[var(--color-gold)]" />أعلى المستخدمين نشاطًا</h2><p className="mt-1 text-[10px] text-zinc-500">حسب قيمة الطلبات والرصيد الحالي</p></div><Link href="/admin/users" className="text-[10px] font-bold text-[var(--color-gold)]">كل المستخدمين <ArrowUpRight size={12} className="inline" /></Link></div><div className="space-y-2">{analytics.topUsers.length === 0 && <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-zinc-500">لا يوجد مستخدمون</div>}{analytics.topUsers.map((user, index) => <Link href={`/admin/users/${user.id}/orders`} key={user.id} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] p-2.5 transition hover:border-[var(--color-gold)]/40"><div className="flex min-w-0 items-center gap-2"><span className="text-xs font-black text-[var(--color-gold)]">#{index + 1}</span><span className="truncate text-xs font-bold text-zinc-200">{user.username}</span></div><div className="shrink-0 text-left"><div className="text-xs font-black text-white">{money(user.orders_value)}</div><div className="text-[9px] text-zinc-500">رصيد {money(user.balance)}</div></div></Link>)}</div></div>
        </section>

        <section className="glass-card min-w-0 rounded-2xl p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-base font-black text-white"><ClipboardList size={18} className="text-[var(--color-gold)]" />آخر الطلبات</h2><p className="mt-1 text-[10px] text-zinc-500">المستخدم والخدمة والقيمة والتاريخ والحالة</p></div><Link href="/admin/users" className="text-[10px] font-bold text-[var(--color-gold)]">مراجعة المستخدمين <ArrowUpRight size={12} className="inline" /></Link></div><div className="space-y-2">{analytics.recentOrders.length === 0 && <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-zinc-500">لا توجد طلبات في الفترة المحددة</div>}{analytics.recentOrders.map((order) => { const status = orderStatus(order.status); const StatusIcon = status.icon; return <div key={order.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 p-3 sm:grid-cols-[1.1fr_1.6fr_auto_auto]"><div className="min-w-0"><div className="truncate text-xs font-black text-white">#{order.id} · {order.username}</div><div className="mt-1 text-[9px] text-zinc-500">{dateTime(order.created_at)}</div></div><div className="min-w-0 truncate text-[11px] text-zinc-300 sm:pt-1">{order.service_name || "خدمة غير مسماة"}</div><div className="text-left text-[10px] text-zinc-500">×{integer(order.quantity)}</div><div className="flex items-center justify-end gap-1 text-left"><span className={`text-[10px] font-bold ${status.className}`}><StatusIcon size={13} className="inline" /> {status.label}</span><span className="mr-1 text-xs font-black text-white">{money(order.charge)}</span></div></div>; })}</div></section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/providers" className="luxe-link flex items-center gap-3 rounded-2xl glass-card p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><TrendingUp size={20} /></span><span className="min-w-0"><b className="block truncate text-sm text-white">مزودو الخدمات</b><small className="block truncate text-[10px] text-zinc-500">الخدمات والأسعار والمزامنة</small></span></Link>
          <Link href="/admin/api-keys" className="luxe-link flex items-center gap-3 rounded-2xl glass-card p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]"><KeyRound size={20} /></span><span className="min-w-0"><b className="block truncate text-sm text-white">مفاتيح API</b><small className="block truncate text-[10px] text-zinc-500">إدارة مفاتيح المستخدمين</small></span></Link>
          <Link href="/admin/crypto" className="luxe-link flex items-center gap-3 rounded-2xl glass-card p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]"><Coins size={20} /></span><span className="min-w-0"><b className="block truncate text-sm text-white">إيداعات الكريبتو</b><small className="block truncate text-[10px] text-zinc-500">المراجعة وحالات الدفع</small></span></Link>
          <Link href="/admin/asiacell" className="luxe-link flex items-center gap-3 rounded-2xl glass-card p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]"><Smartphone size={20} /></span><span className="min-w-0"><b className="block truncate text-sm text-white">إعدادات آسياسيل</b><small className="block truncate text-[10px] text-zinc-500">الحساب والتحويلات</small></span></Link>
          <Link href="/admin/gift-codes" className="luxe-link flex items-center gap-3 rounded-2xl glass-card p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]"><Gift size={20} /></span><span className="min-w-0"><b className="block truncate text-sm text-white">أكواد الهدايا</b><small className="block truncate text-[10px] text-zinc-500">إنشاء وتحديد الاستخدامات والانتهاء</small></span></Link>
        </section>

        <section className="glass-card rounded-2xl p-4"><h2 className="mb-4 flex items-center gap-2 text-base font-black text-white"><Wallet size={18} className="text-[var(--color-gold)]" />تعديل رصيد مستخدم</h2><form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1.2fr_1fr_auto_auto_auto] sm:items-end"><label className="block"><span className="mb-1 block text-[10px] font-bold text-zinc-500">اسم المستخدم</span><input type="text" value={username} onChange={(event) => setUsername(event.target.value)} className="input-luxe w-full rounded-xl px-3 py-2.5 text-sm text-white" required /></label><label className="block"><span className="mb-1 block text-[10px] font-bold text-zinc-500">المبلغ</span><input type="number" step="0.0001" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className="input-luxe w-full rounded-xl px-3 py-2.5 text-sm text-white" required /></label><button type="button" onClick={() => setType("add")} className={`flex items-center justify-center gap-1 rounded-xl px-4 py-2.5 text-xs font-bold ${type === "add" ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : "bg-[var(--color-surface)] text-zinc-500"}`}><Plus size={15} />إضافة</button><button type="button" onClick={() => setType("subtract")} className={`flex items-center justify-center gap-1 rounded-xl px-4 py-2.5 text-xs font-bold ${type === "subtract" ? "border border-red-500/30 bg-red-500/15 text-red-300" : "bg-[var(--color-surface)] text-zinc-500"}`}><Minus size={15} />خصم</button><button type="submit" disabled={loading} className="btn-gold rounded-xl px-5 py-2.5 text-xs font-black text-black disabled:opacity-50">{loading ? "جاري..." : "تنفيذ"}</button></form>{result && <div className={`mt-3 rounded-xl p-3 text-xs font-bold ${result.error ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>{result.error || result.message}</div>}</section>

        <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-5"><Link href="/admin/settings" className="flex items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] p-2.5 text-zinc-400 hover:text-white"><Settings2 size={13} />الإعدادات</Link><Link href="/admin/tickets" className="flex items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] p-2.5 text-zinc-400 hover:text-white"><MessageSquare size={13} />الدعم</Link><Link href="/admin/users" className="flex items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] p-2.5 text-zinc-400 hover:text-white"><Users size={13} />المستخدمون</Link><Link href="/admin/theme" className="flex items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] p-2.5 text-zinc-400 hover:text-white"><Palette size={13} />الثيم</Link><span className="flex items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] p-2.5 text-zinc-600"><Eye size={13} />قراءة مباشرة من Turso</span></div>
      </div>
    </DashboardLayout>
  );
}
