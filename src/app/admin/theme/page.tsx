"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import { useTheme } from "../../components/ThemeProvider";
import Link from "next/link";
import { AlertCircle, ArrowRight, Image as ImageIcon, Palette, RefreshCcw, Save, Trash2, UploadCloud, Video } from "lucide-react";

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
  const router = useRouter();
  const { refresh: refreshBranding } = useTheme();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
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
        const settingsData = await settingsResponse.json() as { settings?: Record<string, string>; error?: string };
        if (!settingsResponse.ok) throw new Error(settingsData.error || "تعذر تحميل الثيم");
        if (active) setSettings(settingsData.settings || {});
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "تعذر تحميل الثيم");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  const set = (key: string, value: string) => setSettings((current) => ({ ...current, [key]: value }));

  const uploadMedia = async (file: File) => {
    setUploading(true); setMessage(""); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/branding/upload", { method: "POST", credentials: "include", body: formData });
      const data = await res.json() as { url?: string; mediaType?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "تعذر رفع الوسيط");
      setSettings((current) => ({ ...current, brandMediaUrl: data.url || "", brandMediaType: data.mediaType === "video" ? "video" : "image" }));
      setMessage("تم رفع الوسيط. اضغط حفظ الهوية لتطبيقه على المنصة.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر رفع الوسيط");
    } finally {
      setUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(settings) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حفظ الثيم");
      setSettings(data.settings || settings);
      await refreshBranding();
      window.localStorage.setItem("smmnine:branding-updated", String(Date.now()));
      window.dispatchEvent(new Event("smmnine:branding-updated"));
      setMessage("تم حفظ الهوية المرئية وتطبيقها على المنصة فورًا.");
    } catch (err) { setError(err instanceof Error ? err.message : "تعذر حفظ الثيم"); }
    finally { setSaving(false); }
  };

  if (loading || !authorized) return <DashboardLayout><div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div></DashboardLayout>;

  const previewPrimary = settings.primaryColor || "#f97316";
  const previewGold = settings.secondaryColor || "#fbbf24";
  return (
    <DashboardLayout>
      <div className="space-y-4 pb-6">
        <header className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(16,16,16,0.95))] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-gold)]/15 text-[var(--color-gold)]"><Palette size={25} /></span><div className="min-w-0"><h1 className="text-xl font-black text-white sm:text-2xl">هوية Royal Gold</h1><p className="mt-1 text-xs leading-6 text-zinc-400">عدّل اسم الموقع والألوان مع معاينة فورية، ثم احفظ التغييرات لتصل إلى الواجهة العامة.</p></div></div></header>
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <section className="glass-card rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"><h2 className="mb-4 text-base font-black text-white">بيانات الموقع</h2><label className="mb-3 block text-xs font-bold text-zinc-300">اسم الموقع<input value={settings.siteName || ""} onChange={(e) => set("siteName", e.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-gold)]" /></label><label className="mb-4 block text-xs font-bold text-zinc-300">الوصف<textarea value={settings.siteDescription || ""} onChange={(e) => set("siteDescription", e.target.value)} maxLength={240} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-[var(--color-gold)]" /></label><div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-black/10 p-3"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-black text-white">الشعار والوسائط</h2><p className="mt-1 text-[10px] leading-5 text-zinc-500">ارفع صورة أو فيديو قصيرًا ليظهر في الهيدر وصفحة الدخول.</p></div><span className="rounded-full bg-[var(--color-gold)]/10 p-2 text-[var(--color-gold)]">{settings.brandMediaType === "video" ? <Video size={16} /> : <ImageIcon size={16} />}</span></div><div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">{settings.brandMediaUrl ? (settings.brandMediaType === "video" ? <video src={settings.brandMediaUrl} className="h-14 w-14 rounded-lg object-cover" muted autoPlay loop playsInline /> : <img src={settings.brandMediaUrl} alt="معاينة الشعار" className="h-14 w-14 rounded-lg object-cover" />) : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)]"><ImageIcon size={20} /></div>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-zinc-200">{settings.brandMediaUrl ? "وسيط مخصص" : "الشعار الافتراضي"}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{settings.brandMediaUrl || "/logo.gif"}</p></div>{settings.brandMediaUrl && <button type="button" onClick={() => { set("brandMediaUrl", ""); set("brandMediaType", "image"); }} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10" title="إزالة الوسيط"><Trash2 size={16} /></button>}</div><input ref={mediaInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadMedia(file); }} /><button type="button" disabled={uploading} onClick={() => mediaInputRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)]/35 bg-[var(--color-gold)]/10 px-3 py-2.5 text-xs font-black text-[var(--color-gold-bright)] disabled:opacity-50"><UploadCloud size={16} />{uploading ? "جاري رفع الوسيط..." : "رفع صورة أو فيديو"}</button><label className="mt-3 block text-[10px] font-bold text-zinc-400">أو أدخل رابطًا عامًا<input value={settings.brandMediaUrl || ""} onChange={(e) => set("brandMediaUrl", e.target.value)} placeholder="https://..." maxLength={2048} dir="ltr" className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-black/20 px-2.5 py-2 text-xs text-white outline-none focus:border-[var(--color-gold)]" /></label><div className="mt-2 flex gap-2"><button type="button" onClick={() => set("brandMediaType", "image")} className={`flex-1 rounded-lg border px-2 py-2 text-[10px] font-bold ${settings.brandMediaType !== "video" ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]" : "border-[var(--color-border)] text-zinc-500"}`}>صورة</button><button type="button" onClick={() => set("brandMediaType", "video")} className={`flex-1 rounded-lg border px-2 py-2 text-[10px] font-bold ${settings.brandMediaType === "video" ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]" : "border-[var(--color-border)] text-zinc-500"}`}>فيديو</button></div></div><h2 className="mb-3 text-base font-black text-white">ألوان المنصة</h2><div className="space-y-2">{fields.map((field) => <div key={field.key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-black/10 p-3"><div className="min-w-0"><b className="block text-xs text-zinc-200">{field.label}</b><small className="text-[10px] text-zinc-600">{field.description}</small></div><div className="flex shrink-0 items-center gap-2"><input type="color" value={settings[field.key] || "#000000"} onChange={(e) => set(field.key, e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent" /><input value={settings[field.key] || ""} onChange={(e) => set(field.key, e.target.value)} className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-white outline-none focus:border-[var(--color-gold)]" /></div></div>)}</div>{message && <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">{message}</div>}{error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300"><AlertCircle size={15} />{error}</div>}<button type="button" onClick={save} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-deep)] py-3 text-sm font-black text-black disabled:opacity-50">{saving ? <RefreshCcw className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "جاري الحفظ..." : "حفظ الهوية"}</button></section>

          <section className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5" style={{ background: settings.backgroundColor || "#090909" }}><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-black text-white">معاينة فورية</h2><span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ background: `${previewGold}22`, color: previewGold }}>Royal Gold</span></div><div className="rounded-2xl border p-4" style={{ background: settings.cardColor || "#111111", borderColor: settings.borderColor || "#27272a" }}><div className="flex items-center gap-3">{settings.brandMediaUrl ? (settings.brandMediaType === "video" ? <video src={settings.brandMediaUrl} className="h-11 w-11 rounded-xl object-cover" muted autoPlay loop playsInline /> : <img src={settings.brandMediaUrl} alt="معاينة الهوية" className="h-11 w-11 rounded-xl object-cover" />) : <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black text-black" style={{ background: `linear-gradient(135deg, ${previewGold}, ${previewPrimary})` }}>{(settings.siteName || "s").slice(0, 1).toUpperCase()}</div>}<div className="min-w-0"><div className="truncate text-lg font-black" style={{ color: previewGold }}>{settings.siteName || "smmnine"}</div><div className="truncate text-[10px] text-zinc-500">{settings.siteDescription || "منصة خدمات تسويق اجتماعي احترافية"}</div></div></div><div className="mt-6 grid grid-cols-2 gap-2"><div className="h-20 rounded-xl" style={{ background: `linear-gradient(135deg, ${previewGold}, ${previewPrimary})` }} /><div className="h-20 rounded-xl" style={{ background: settings.surfaceColor || "#1a1a1a", border: `1px solid ${settings.borderColor || "#27272a"}` }} /></div><button className="mt-4 w-full rounded-xl py-3 text-xs font-black text-black" style={{ background: previewGold }}>زر رئيسي تجريبي</button></div><div className="mt-3 flex items-center gap-2 text-[10px] leading-5 text-zinc-500"><ArrowRight size={14} className="text-[var(--color-gold)]" />احفظ التغييرات لتظهر الهوية في الهيدر والعنوان العام.</div></section>
        </div>
        <Link href="/admin/settings" className="inline-flex rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-zinc-300">العودة إلى مركز الإعدادات</Link>
      </div>
    </DashboardLayout>
  );
}
