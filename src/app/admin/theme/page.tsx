"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import { broadcastBrandingUpdate, useTheme } from "../../components/ThemeProvider";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowRight, Image as ImageIcon, Palette, RefreshCcw, Save } from "lucide-react";

const fields = [
  { key: "primaryColor", label: "اللون الرئيسي", description: "الأزرار والعناوين المهمة." },
  { key: "secondaryColor", label: "الذهبي الثانوي", description: "اللمسات الملكية والشارات." },
  { key: "primaryLight", label: "الذهبي الفاتح", description: "الإبراز والتدرجات المضيئة." },
  { key: "backgroundColor", label: "الخلفية العامة", description: "خلفية الصفحات الرئيسية." },
  { key: "cardColor", label: "لون البطاقات", description: "البطاقات الخارجية والمحتوى." },
  { key: "surfaceColor", label: "السطوح الداخلية", description: "الحقول والقوائم الداخلية." },
  { key: "borderColor", label: "لون الحدود", description: "الفواصل والإطارات الهادئة." },
] as const;

type SettingsMap = Record<string, string>;

function FieldLabel({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-black text-zinc-200">
      <span>{label}</span>
      <span className="mt-1 block text-[10px] font-normal leading-4 text-zinc-500">{description}</span>
      {children}
    </label>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs font-bold leading-5 text-red-200"><AlertCircle size={15} className="mt-0.5 shrink-0" />{children}</div>;
}

export default function AdminThemePage() {
  const router = useRouter();
  const { update: updateBranding } = useTheme();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // Uploading and mediaInputRef are disabled to protect official brand logo

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const userResponse = await fetch("/api/user", { cache: "no-store", credentials: "include" });
        const userData = await userResponse.json() as { user?: { role?: string } };
        if (!active) return;
        if (userData.user?.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        setAuthorized(true);
        const settingsResponse = await fetch("/api/settings", { cache: "no-store", credentials: "include" });
        const settingsData = await settingsResponse.json() as { settings?: SettingsMap; error?: string };
        if (!settingsResponse.ok) throw new Error(settingsData.error || "تعذر تحميل إعدادات الهوية");
        if (active) setSettings(settingsData.settings || {});
      } catch (value: unknown) {
        if (active) setError(value instanceof Error ? value.message : "تعذر تحميل إعدادات الهوية");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [router]);

  const set = (key: string, value: string) => setSettings((current) => ({ ...current, [key]: value }));

  // Uploading and media changes are intentionally disabled to protect the official brand logo.

  const save = async () => {
    const siteName = (settings.siteName || "").trim();
    if (!siteName) {
      setError("اكتب اسم المنصة قبل الحفظ.");
      return;
    }
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...settings, siteName }),
      });
      const data = await response.json() as { settings?: SettingsMap; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الهوية");
      const savedSettings = data.settings || { ...settings, siteName };
      setSettings(savedSettings);
      updateBranding(savedSettings);
      broadcastBrandingUpdate();
      setMessage("تم حفظ الهوية وتطبيق الاسم والشعار والألوان فورًا في الواجهة.");
      window.setTimeout(() => window.location.reload(), 250);
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : "تعذر حفظ الهوية");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !authorized) return <DashboardLayout><div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div></DashboardLayout>;

  const previewPrimary = settings.primaryColor || "#f97316";
  const previewGold = settings.secondaryColor || "#fbbf24";
  const hasMedia = Boolean(settings.brandMediaUrl);

  return (
    <DashboardLayout>
      <main className="admin-page space-y-4">
        <header className="admin-card overflow-hidden p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]"><Palette size={22} /></span>
            <div className="min-w-0"><p className="mb-1 text-[10px] font-black tracking-[0.14em] text-[var(--color-primary)]">هوية موحّدة للمنصة</p><h1 className="text-xl font-black text-white sm:text-2xl">الهوية والمظهر</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">غيّر الاسم والوصف والألوان والوسيط من مكان واحد. بعد الحفظ تنتشر الهوية في الهيدر والعنوان والصفحات دون إعادة إدخالها.</p></div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <section className="admin-card p-4 sm:p-5">
            <div className="mb-4 border-b border-[var(--color-border)] pb-3"><h2 className="text-lg font-black text-white">بيانات المنصة</h2><p className="mt-1 text-[10px] leading-5 text-zinc-500">هذه البيانات تظهر للمستخدمين وفي عنوان المتصفح ووسوم المشاركة.</p></div>
            <div className="space-y-3">
              <FieldLabel label="اسم المنصة" description="اسم قصير وواضح، وسيتم تطبيقه في كل الأماكن."><input value={settings.siteName || ""} onChange={(event) => set("siteName", event.target.value)} maxLength={80} required className="input-premium mt-2 w-full" placeholder="اكتب اسم المنصة" /></FieldLabel>
              <FieldLabel label="وصف المنصة" description="جملة تعريفية قصيرة تظهر في الوصف العام ومحركات المشاركة."><textarea value={settings.siteDescription || ""} onChange={(event) => set("siteDescription", event.target.value)} maxLength={240} rows={3} className="input-premium mt-2 w-full resize-none" placeholder="منصة خدمات تسويق اجتماعي احترافية" /></FieldLabel>
            </div>
          </section>

          <section className="admin-card p-4 sm:p-5">
            <div className="mb-4 border-b border-[var(--color-border)] pb-3"><h2 className="text-lg font-black text-white">معاينة الهوية</h2><p className="mt-1 text-[10px] leading-5 text-zinc-500">تتغير المعاينة أثناء الكتابة قبل الحفظ.</p></div>
            <div className="rounded-2xl border p-4" style={{ background: settings.cardColor || "#111111", borderColor: settings.borderColor || "#27272a" }}>
              <div className="flex min-w-0 items-center gap-3">
                {hasMedia ? (settings.brandMediaType === "video" ? <video src={settings.brandMediaUrl} className="h-11 w-11 shrink-0 rounded-xl object-cover" muted autoPlay loop playsInline /> : <Image src={settings.brandMediaUrl} alt="معاينة الهوية" width={44} height={44} unoptimized className="h-11 w-11 shrink-0 rounded-xl object-cover" />) : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black text-black" style={{ background: `linear-gradient(135deg, ${previewGold}, ${previewPrimary})` }}>{(settings.siteName || "s").slice(0, 1).toUpperCase()}</div>}
                <div className="min-w-0"><div className="truncate text-lg font-black" style={{ color: previewGold }}>{settings.siteName || "اسم المنصة"}</div><div className="truncate text-[10px] text-zinc-500">{settings.siteDescription || "وصف المنصة"}</div></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2"><div className="h-16 rounded-xl" style={{ background: `linear-gradient(135deg, ${previewGold}, ${previewPrimary})` }} /><div className="h-16 rounded-xl" style={{ background: settings.surfaceColor || "#1a1a1a", border: `1px solid ${settings.borderColor || "#27272a"}` }} /></div>
              <button type="button" className="mt-3 w-full rounded-xl py-2.5 text-xs font-black text-black" style={{ background: previewGold }}>زر رئيسي تجريبي</button>
            </div>
          </section>
        </div>

        <section className="admin-card p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-white">الشعار والوسائط</h2><p className="mt-1 text-[10px] leading-5 text-zinc-500">الشعار الرسمي للمنصة ثابت ولا يمكن تغييره لضمان استقرار الهوية.</p></div><span className="rounded-xl bg-zinc-500/10 p-2 text-zinc-500"><ImageIcon size={17} /></span></div>
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-black/15 p-3 opacity-75">
            {hasMedia ? (settings.brandMediaType === "video" ? <video src={settings.brandMediaUrl} className="h-16 w-16 shrink-0 rounded-xl object-cover" muted autoPlay loop playsInline /> : <Image src={settings.brandMediaUrl} alt="الشعار الرسمي" width={64} height={64} unoptimized className="h-16 w-16 shrink-0 rounded-xl object-cover" />) : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><ImageIcon size={22} /></div>}
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-zinc-200">الشعار الرسمي (ثابت)</p><p className="mt-1 truncate text-[10px] text-zinc-500">{settings.brandMediaUrl || "/logo.gif"}</p></div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-3 text-[10px] font-bold text-zinc-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>تغيير الشعار متوقف حاليًا للحفاظ على هوية المنصة الرسمية.</span>
          </div>
        </section>

        <section className="admin-card p-4 sm:p-5">
          <div className="mb-4 border-b border-[var(--color-border)] pb-3"><h2 className="text-lg font-black text-white">ألوان المنصة</h2><p className="mt-1 text-[10px] leading-5 text-zinc-500">كل لون موضح بوظيفته، ويمكن معاينته قبل الحفظ.</p></div>
          <div className="grid gap-2 sm:grid-cols-2">{fields.map((field) => <div key={field.key} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-black/10 p-3"><div className="min-w-0"><b className="block truncate text-xs text-zinc-200">{field.label}</b><small className="block text-[10px] leading-4 text-zinc-500">{field.description}</small></div><div className="flex shrink-0 items-center gap-2"><input type="color" value={settings[field.key] || "#000000"} onChange={(event) => set(field.key, event.target.value)} className="h-9 w-10 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent" aria-label={field.label} /><input value={settings[field.key] || ""} onChange={(event) => set(field.key, event.target.value)} className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-white outline-none focus:border-[var(--color-gold)]" dir="ltr" aria-label={`${field.label} بصيغة hex`} /></div></div>)}</div>
        </section>

        {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs font-bold leading-5 text-emerald-200">{message}</div>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="sticky bottom-2 z-20 flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[rgba(13,10,5,0.94)] p-2 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="px-2 text-[10px] leading-4 text-zinc-500">الحفظ يحدّث الهوية المركزية والعنوان والواجهة فورًا.</p><button type="button" onClick={save} disabled={saving} className="btn-gold flex w-full items-center justify-center gap-2 sm:w-auto sm:min-w-48">{saving ? <RefreshCcw className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "جارٍ الحفظ..." : "حفظ الهوية والتطبيق"}</button></div>
        <Link href="/admin/settings" className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5"><ArrowRight size={14} />العودة إلى مركز الإعدادات</Link>
      </main>
    </DashboardLayout>
  );
}
