"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { AlertCircle, ArrowRight, Palette, RefreshCcw, Save } from "lucide-react";

const fields = [
  { key: "primaryColor", label: "اللون الرئيسي", description: "الأزرار والعناوين" },
  { key: "secondaryColor", label: "الذهبي الثانوي", description: "اللمسات الملكية" },
  { key: "primaryLight", label: "الذهبي الفاتح", description: "التدرجات والإبراز" },
  { key: "backgroundColor", label: "الخلفية العامة", description: "خلفية الصفحات" },
  { key: "cardColor", label: "لون البطاقات", description: "البطاقات الخارجية" },
  { key: "surfaceColor", label: "السطوح الداخلية", description: "الحقول والقوائم" },
  { key: "borderColor", label: "لون الحدود", description: "الفواصل والإطارات" },
] as const;

export default function AdminThemePage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحميل الثيم");
      setSettings(data.settings || {});
    }).catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل الثيم")).finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(settings) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حفظ الثيم");
      setSettings(data.settings || settings);
      setMessage("تم حفظ الهوية المرئية وتطبيقها على المنصة.");
    } catch (err) { setError(err instanceof Error ? err.message : "تعذر حفظ الثيم"); }
    finally { setSaving(false); }
  };

  if (loading) return <DashboardLayout><div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div></DashboardLayout>;

  const previewPrimary = settings.primaryColor || "#f97316";
  const previewGold = settings.secondaryColor || "#fbbf24";
  return (
    <DashboardLayout>
      <div className="space-y-4 pb-6">
        <header className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(16,16,16,0.95))] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-gold)]/15 text-[var(--color-gold)]"><Palette size={25} /></span><div className="min-w-0"><h1 className="text-xl font-black text-white sm:text-2xl">هوية Royal Gold</h1><p className="mt-1 text-xs leading-6 text-zinc-400">عدّل اسم الموقع والألوان مع معاينة فورية، ثم احفظ التغييرات لتصل إلى الواجهة العامة.</p></div></div></header>
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <section className="glass-card rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"><h2 className="mb-4 text-base font-black text-white">بيانات الموقع</h2><label className="mb-3 block text-xs font-bold text-zinc-300">اسم الموقع<input value={settings.siteName || ""} onChange={(e) => set("siteName", e.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-gold)]" /></label><label className="mb-4 block text-xs font-bold text-zinc-300">الوصف<textarea value={settings.siteDescription || ""} onChange={(e) => set("siteDescription", e.target.value)} maxLength={240} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-[var(--color-gold)]" /></label><h2 className="mb-3 text-base font-black text-white">ألوان المنصة</h2><div className="space-y-2">{fields.map((field) => <div key={field.key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-black/10 p-3"><div className="min-w-0"><b className="block text-xs text-zinc-200">{field.label}</b><small className="text-[10px] text-zinc-600">{field.description}</small></div><div className="flex shrink-0 items-center gap-2"><input type="color" value={settings[field.key] || "#000000"} onChange={(e) => set(field.key, e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent" /><input value={settings[field.key] || ""} onChange={(e) => set(field.key, e.target.value)} className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-white outline-none focus:border-[var(--color-gold)]" /></div></div>)}</div>{message && <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">{message}</div>}{error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300"><AlertCircle size={15} />{error}</div>}<button type="button" onClick={save} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-deep)] py-3 text-sm font-black text-black disabled:opacity-50">{saving ? <RefreshCcw className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "جاري الحفظ..." : "حفظ الهوية"}</button></section>

          <section className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5" style={{ background: settings.backgroundColor || "#090909" }}><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-black text-white">معاينة فورية</h2><span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ background: `${previewGold}22`, color: previewGold }}>Royal Gold</span></div><div className="rounded-2xl border p-4" style={{ background: settings.cardColor || "#111111", borderColor: settings.borderColor || "#27272a" }}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black text-black" style={{ background: `linear-gradient(135deg, ${previewGold}, ${previewPrimary})` }}>{(settings.siteName || "F").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><div className="truncate text-lg font-black" style={{ color: previewGold }}>{settings.siteName || "Follower"}</div><div className="truncate text-[10px] text-zinc-500">{settings.siteDescription || "منصة خدمات تسويق اجتماعي احترافية"}</div></div></div><div className="mt-6 grid grid-cols-2 gap-2"><div className="h-20 rounded-xl" style={{ background: `linear-gradient(135deg, ${previewGold}, ${previewPrimary})` }} /><div className="h-20 rounded-xl" style={{ background: settings.surfaceColor || "#1a1a1a", border: `1px solid ${settings.borderColor || "#27272a"}` }} /></div><button className="mt-4 w-full rounded-xl py-3 text-xs font-black text-black" style={{ background: previewGold }}>زر رئيسي تجريبي</button></div><div className="mt-3 flex items-center gap-2 text-[10px] leading-5 text-zinc-500"><ArrowRight size={14} className="text-[var(--color-gold)]" />احفظ التغييرات لتظهر الهوية في الهيدر والعنوان العام.</div></section>
        </div>
        <Link href="/admin/settings" className="inline-flex rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-zinc-300">العودة إلى مركز الإعدادات</Link>
      </div>
    </DashboardLayout>
  );
}
