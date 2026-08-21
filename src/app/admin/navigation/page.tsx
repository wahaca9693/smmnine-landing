"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Power, Trash2, Zap } from "lucide-react";
import { NAVIGATION_BADGE_COLORS, NAVIGATION_ICONS, type NavigationItem } from "@/lib/navigation";

type FormState = {
  id?: number;
  label_ar: string;
  label_en: string;
  href: string;
  icon: string;
  badge: string;
  badge_color: string;
  audience: string;
  sort_order: string;
};

const initialForm: FormState = {
  label_ar: "",
  label_en: "",
  href: "/",
  icon: "Zap",
  badge: "",
  badge_color: "gold",
  audience: "user",
  sort_order: "0",
};

function errorText(value: unknown): string {
  return value instanceof Error ? value.message : "حدث خطأ غير متوقع";
}

export default function AdminNavigationPage() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/navigation", { cache: "no-store" });
      const data = await response.json() as { items?: NavigationItem[]; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الأزرار");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error: unknown) {
      setMessage(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadItems(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadItems]);

  const updateField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => setForm(initialForm);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الزر");
      setMessage(form.id ? "تم تحديث الزر" : "تم إنشاء الزر");
      resetForm();
      await loadItems();
    } catch (error: unknown) {
      setMessage(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const action = async (id: number, type: "toggle" | "delete") => {
    if (type === "delete" && !window.confirm("هل تريد حذف هذا الزر؟")) return;
    setMessage("");
    try {
      const response = await fetch("/api/admin/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type, id }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ العملية");
      await loadItems();
    } catch (error: unknown) {
      setMessage(errorText(error));
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <section className="glass-strong rounded-3xl border border-[var(--color-border)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-primary)]">واجهة قابلة للتخصيص</p>
            <h1 className="text-2xl font-black text-white">الأزرار والروابط المخصصة</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">أنشئ روابط داخلية تظهر في الشريط الجانبي للمستخدمين أو الإدارة. لأسباب أمنية، يقبل النظام مسارات داخلية وأيقونات من القائمة المسموحة فقط، ولا ينفذ HTML أو JavaScript أو روابط خارجية.</p>
          </div>
          <div className="hidden rounded-2xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)] sm:block"><Zap size={24} /></div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <form onSubmit={submit} className="glass-strong space-y-4 rounded-3xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black text-white">{form.id ? "تعديل الزر" : "إنشاء زر جديد"}</h2>{form.id && <button type="button" onClick={resetForm} className="text-xs font-bold text-zinc-400 hover:text-white">إلغاء التعديل</button>}</div>
          <label className="block text-sm font-bold text-zinc-300">العنوان العربي<input value={form.label_ar} onChange={(event) => updateField("label_ar", event.target.value)} maxLength={80} required className="input-premium mt-2 w-full" placeholder="مثال: عروض اليوم" /></label>
          <label className="block text-sm font-bold text-zinc-300">العنوان الإنجليزي<input value={form.label_en} onChange={(event) => updateField("label_en", event.target.value)} maxLength={80} className="input-premium mt-2 w-full" placeholder="Daily offers" /></label>
          <label className="block text-sm font-bold text-zinc-300">المسار الداخلي<input value={form.href} onChange={(event) => updateField("href", event.target.value)} maxLength={160} required className="input-premium mt-2 w-full text-left" dir="ltr" placeholder="/updates" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-zinc-300">الأيقونة<select value={form.icon} onChange={(event) => updateField("icon", event.target.value)} className="input-premium mt-2 w-full">{NAVIGATION_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></label>
            <label className="block text-sm font-bold text-zinc-300">مكان العرض<select value={form.audience} onChange={(event) => updateField("audience", event.target.value)} className="input-premium mt-2 w-full"><option value="user">المستخدمون</option><option value="admin">الإدارة</option><option value="both">المستخدمون والإدارة</option></select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-bold text-zinc-300">الوسم<input value={form.badge} onChange={(event) => updateField("badge", event.target.value)} maxLength={24} className="input-premium mt-2 w-full" placeholder="جديد" /></label>
            <label className="block text-sm font-bold text-zinc-300">لون الوسم<select value={form.badge_color} onChange={(event) => updateField("badge_color", event.target.value)} className="input-premium mt-2 w-full">{NAVIGATION_BADGE_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select></label>
            <label className="block text-sm font-bold text-zinc-300">الترتيب<input value={form.sort_order} onChange={(event) => updateField("sort_order", event.target.value)} type="number" className="input-premium mt-2 w-full" /></label>
          </div>
          <button disabled={saving} className="btn-gold flex w-full items-center justify-center gap-2 disabled:opacity-50"><Plus size={17} />{saving ? "جارٍ الحفظ..." : form.id ? "حفظ التعديل" : "إنشاء الزر"}</button>
          {message && <p className="rounded-xl bg-[var(--color-surface)] p-3 text-sm font-bold text-[var(--color-primary)]">{message}</p>}
        </form>

        <section className="glass-strong rounded-3xl border border-[var(--color-border)] p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-white">الأزرار الحالية</h2><span className="text-xs font-bold text-zinc-500">{items.length} عنصر</span></div>
          {loading ? <p className="py-12 text-center text-sm text-zinc-500">جارٍ التحميل...</p> : items.length === 0 ? <p className="py-12 text-center text-sm text-zinc-500">لا توجد أزرار مخصصة بعد.</p> : <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-black text-white">{item.label_ar}</span>{item.badge && <span className="badge-new rounded-full px-2 py-0.5 text-[10px]">{item.badge}</span>}</div><p className="mt-1 text-xs text-zinc-500" dir="ltr">{item.href} · {item.icon} · {item.audience}</p></div><div className="flex gap-1"><button onClick={() => setForm({ id: item.id, label_ar: item.label_ar, label_en: item.label_en || "", href: item.href, icon: item.icon, badge: item.badge || "", badge_color: item.badge_color, audience: item.audience, sort_order: String(item.sort_order) })} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="تعديل"><Pencil size={16} /></button><button onClick={() => void action(item.id, "toggle")} className={`rounded-lg p-2 ${item.is_active ? "text-green-400" : "text-zinc-600"}`} aria-label="تفعيل أو تعطيل"><Power size={16} /></button><button onClick={() => void action(item.id, "delete")} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10" aria-label="حذف"><Trash2 size={16} /></button></div></div><p className={`mt-3 text-xs font-bold ${item.is_active ? "text-green-400" : "text-zinc-500"}`}>{item.is_active ? "نشط ويظهر حسب الجمهور" : "معطل ولا يظهر"}</p></article>)}</div>}
        </section>
      </section>
    </main>
  );
}
