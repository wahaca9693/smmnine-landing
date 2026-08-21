"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../../components/DashboardLayout";
import { Activity, ArrowUpRight, Bell, Coins, FileSearch, Gift, Palette, Save, Settings2, ShieldCheck, Smartphone, Users, Wallet } from "lucide-react";

type Check = { label: string; value: string; tone: string };
type SiteForm = { siteName: string; siteDescription: string; defaultCurrency: string; cryptoMinAmount: string; asiacellMinAmount: string; apiV2Enabled: boolean; registrationEnabled: boolean };

const items = [
  { href: "/admin/providers", title: "الأرباح والتسعير", description: "النسب، السعر اليدوي، الدقة العشرية، والمزامنة", icon: Wallet, tone: "text-emerald-300 bg-emerald-500/10" },
  { href: "/admin/crypto", title: "المدفوعات الرقمية", description: "الإيداعات، حالات IPN، والمراجعة الآلية", icon: Coins, tone: "text-cyan-300 bg-cyan-500/10" },
  { href: "/admin/asiacell", title: "إعدادات Asiacell", description: "حساب المتجر، التحويل، البطاقات وسعر الصرف", icon: Smartphone, tone: "text-amber-300 bg-amber-500/10" },
  { href: "/admin/users", title: "مركز المستخدمين", description: "الحظر، فك الحظر، الرصيد، التفاصيل وسجل التدقيق", icon: Users, tone: "text-blue-300 bg-blue-500/10" },
  { href: "/admin/gift-codes", title: "أكواد الهدايا", description: "القيمة، الاستخدامات، الانتهاء والتعطيل", icon: Gift, tone: "text-fuchsia-300 bg-fuchsia-500/10" },
  { href: "/admin/theme", title: "المظهر العام", description: "الألوان، الاسم، والهوية المرئية Royal Gold", icon: Palette, tone: "text-violet-300 bg-violet-500/10" },
  { href: "/admin/notifications", title: "مركز الإشعارات", description: "إرسال جماعي أو فردي ومراجعة السجل", icon: Bell, tone: "text-amber-300 bg-amber-500/10" },
  { href: "/admin/audit-log", title: "سجل التدقيق", description: "بحث وفلاتر لكل إجراءات الإدارة الحساسة", icon: FileSearch, tone: "text-rose-300 bg-rose-500/10" },
];

export default function AdminSettingsPage() {
  const [checks, setChecks] = useState<Check[]>([
    { label: "قاعدة البيانات", value: "جارٍ الفحص", tone: "text-amber-300" },
    { label: "إعدادات الموقع", value: "جارٍ القراءة", tone: "text-amber-300" },
    { label: "حماية لوحة الإدارة", value: "جلسة مطلوبة", tone: "text-emerald-300" },
  ]);
  const [form, setForm] = useState<SiteForm>({ siteName: "", siteDescription: "", defaultCurrency: "USD", cryptoMinAmount: "1", asiacellMinAmount: "0", apiV2Enabled: true, registrationEnabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const [health, settings] = await Promise.allSettled([
        fetch("/api/health", { cache: "no-store" }).then((r) => r.ok),
        fetch("/api/settings", { cache: "no-store", credentials: "include" }).then(async (r) => ({ ok: r.ok, data: await r.json() })),
      ]);
      if (!active) return;
      const settingsData = settings.status === "fulfilled" ? settings.value.data?.settings || {} : {};
      setForm({
        siteName: String(settingsData.siteName || "smmnine"),
        siteDescription: String(settingsData.siteDescription || ""),
        defaultCurrency: String(settingsData.defaultCurrency || "USD"),
        cryptoMinAmount: String(settingsData.cryptoMinAmount ?? 1),
        asiacellMinAmount: String(settingsData.asiacellMinAmount ?? 0),
        apiV2Enabled: Boolean(settingsData.apiV2Enabled ?? true),
        registrationEnabled: Boolean(settingsData.registrationEnabled ?? true),
      });
      setChecks([
        { label: "قاعدة البيانات", value: health.status === "fulfilled" && health.value ? "متصلة" : "تحتاج مراجعة", tone: health.status === "fulfilled" && health.value ? "text-emerald-300" : "text-red-300" },
        { label: "إعدادات الموقع", value: settings.status === "fulfilled" && settings.value.ok ? "محمّلة بثبات" : "تحتاج مراجعة", tone: settings.status === "fulfilled" && settings.value.ok ? "text-emerald-300" : "text-red-300" },
        { label: "حماية لوحة الإدارة", value: "مفعّلة", tone: "text-emerald-300" },
      ]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ defaultCurrency: form.defaultCurrency, cryptoMinAmount: form.cryptoMinAmount, asiacellMinAmount: form.asiacellMinAmount, apiV2Enabled: form.apiV2Enabled, registrationEnabled: form.registrationEnabled }) });
      const data = await res.json() as { settings?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(data.error || "تعذر حفظ الإعدادات");
      const saved = data.settings || form;
      setForm((current) => ({ ...current, defaultCurrency: String(saved.defaultCurrency ?? current.defaultCurrency), cryptoMinAmount: String(saved.cryptoMinAmount ?? current.cryptoMinAmount), asiacellMinAmount: String(saved.asiacellMinAmount ?? current.asiacellMinAmount), apiV2Enabled: Boolean(saved.apiV2Enabled ?? current.apiV2Enabled), registrationEnabled: Boolean(saved.registrationEnabled ?? current.registrationEnabled) }));
      setMessage("تم حفظ إعدادات التشغيل وتطبيقها فورًا. لتغيير الاسم أو الوصف استخدم صفحة الهوية المركزية.");
    } catch (err) { setError(err instanceof Error ? err.message : "تعذر حفظ الإعدادات"); }
    finally { setSaving(false); }
  };

  const set = (key: keyof SiteForm, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-6">
        <header className="glass-card rounded-3xl border border-[var(--color-border)] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-gold)]/15 text-[var(--color-gold)]"><Settings2 size={25} /></span><div className="min-w-0"><h1 className="text-2xl font-black text-white">مركز إعدادات الإدارة</h1><p className="mt-1 text-xs leading-6 text-zinc-400">مكان موحد للتحكم في الأرباح، الشحن، المستخدمين، الأكواد، والمظهر. القراءة هنا لا تُنقص الأرصدة ولا تغيّر الإعدادات قبل الضغط على الحفظ.</p></div></div><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">{checks.map((check) => <div key={check.label} className="rounded-2xl border border-[var(--color-border)] bg-black/10 p-3"><div className="flex items-center gap-2 text-[10px] text-zinc-500"><Activity size={13} />{check.label}</div><div className={`mt-1 text-sm font-black ${check.tone}`}>{check.value}</div></div>)}</div></header>

        <form onSubmit={save} className="glass-card rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><Settings2 size={17} className="text-[var(--color-gold)]" /><h2 className="text-base font-black text-white">إعدادات الموقع والتشغيل</h2></div>{loading ? <div className="py-8 text-center text-xs text-zinc-500">جارٍ تحميل الإعدادات...</div> : <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-zinc-300">اسم الموقع<input value={form.siteName} readOnly aria-readonly="true" className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-white/80 outline-none" maxLength={80} required /><small className="mt-1.5 block text-[10px] font-normal leading-5 text-zinc-500">هذا العرض للقراءة فقط لمنع تعارض النماذج. عدّل الاسم والوصف من <Link href="/admin/theme" className="font-bold text-[var(--color-gold)] hover:underline">صفحة الهوية المركزية</Link> ثم احفظ هناك.</small></label><label className="text-xs font-bold text-zinc-300">العملة الافتراضية<input value={form.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value.toUpperCase())} className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm uppercase text-white outline-none focus:border-[var(--color-gold)]" maxLength={3} required /></label><label className="text-xs font-bold text-zinc-300 md:col-span-2">وصف الموقع<textarea value={form.siteDescription} readOnly aria-readonly="true" rows={2} maxLength={240} className="mt-1.5 w-full cursor-not-allowed resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 text-white/80 outline-none" /><small className="mt-1.5 block text-[10px] font-normal text-zinc-500">وصف قصير يظهر في الهوية والصفحات العامة، ويُحدّث مع الاسم عند الحفظ.</small></label><label className="text-xs font-bold text-zinc-300">الحد الأدنى للكريبتو (USD)<input type="number" min="0" step="0.01" value={form.cryptoMinAmount} onChange={(e) => set("cryptoMinAmount", e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-gold)]" /></label><label className="text-xs font-bold text-zinc-300">الحد الأدنى لـ Asiacell (USD)<input type="number" min="0" step="0.01" value={form.asiacellMinAmount} onChange={(e) => set("asiacellMinAmount", e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-gold)]" /></label><label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-black/10 p-3 text-xs font-bold text-zinc-300 md:col-span-2"><span><b className="block text-white">API v2 للمستخدمين</b><small className="mt-1 block text-[10px] font-normal text-zinc-500">تفعيل أو إيقاف استدعاء الخدمات من مفاتيح المستخدمين.</small></span><button type="button" onClick={() => set("apiV2Enabled", !form.apiV2Enabled)} className={`relative h-7 w-12 rounded-full transition ${form.apiV2Enabled ? "bg-[var(--color-gold)]" : "bg-zinc-700"}`} aria-label="تفعيل API v2"><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${form.apiV2Enabled ? "right-1" : "right-6"}`} /></button></label><label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-black/10 p-3 text-xs font-bold text-zinc-300 md:col-span-2"><span><b className="block text-white">السماح بالتسجيل الجديد</b><small className="mt-1 block text-[10px] font-normal text-zinc-500">عند الإيقاف لن يتمكن الزوار من إنشاء حسابات جديدة، مع بقاء الحسابات الحالية دون تغيير.</small></span><button type="button" onClick={() => set("registrationEnabled", !form.registrationEnabled)} className={`relative h-7 w-12 rounded-full transition ${form.registrationEnabled ? "bg-[var(--color-gold)]" : "bg-zinc-700"}`} aria-label="السماح بالتسجيل"><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${form.registrationEnabled ? "right-1" : "right-6"}`} /></button></label></div>}{message && <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">{message}</div>}{error && <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}<button disabled={saving || loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-deep)] py-3 text-sm font-black text-black disabled:opacity-50"><Save size={16} />{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</button></form>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(({ href, title, description, icon: Icon, tone }) => <Link key={href} href={href} className="glass-card group rounded-2xl border border-[var(--color-border)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-gold)]/50"><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span><span className="min-w-0"><b className="block text-sm font-black text-white">{title}</b><small className="mt-1 block text-[10px] leading-5 text-zinc-500">{description}</small></span><ArrowUpRight size={15} className="mr-auto shrink-0 text-zinc-600 transition group-hover:text-[var(--color-gold)]" /></div></Link>)}</section>

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-6 text-amber-100"><div className="flex items-start gap-2"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-300" /><p><b>ضابط أمان الحسابات:</b> كلمات مرور المستخدمين لا تظهر للأدمن ولا تُحفظ كنص مكشوف. عند الحاجة، استخدم إعادة التعيين الآمنة من مركز المستخدمين؛ وسيُسجل الإجراء في سجل التدقيق الإداري.</p></div></section>
        <div className="flex flex-wrap gap-2"><Link href="/admin" className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-zinc-300">العودة إلى لوحة المؤشرات</Link><Link href="/admin/users" className="rounded-xl bg-[var(--color-gold)] px-4 py-2 text-xs font-black text-black">فتح مركز المستخدمين</Link></div>
      </div>
    </DashboardLayout>
  );
}
