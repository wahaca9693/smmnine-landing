"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Pencil, Plus, Power, Trash2, Zap } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { NAVIGATION_BADGE_COLORS, NAVIGATION_ICONS, type NavigationItem } from "@/lib/navigation";

type FormState = {
  id?: number;
  label_ar: string;
  label_en: string;
  description_ar: string;
  description_en: string;
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
  description_ar: "",
  description_en: "",
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

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <label className="block text-xs font-black text-zinc-200"><span>{label}</span><span className="mt-1 block text-[10px] font-normal leading-4 text-zinc-500">{hint}</span>{children}</label>;
}

export default function AdminNavigationPage() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/navigation", { cache: "no-store", credentials: "include" });
      const data = await response.json() as { items?: NavigationItem[]; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الأزرار");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (value: unknown) {
      setError(errorText(value));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadItems(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadItems]);

  const updateField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => setForm({ ...initialForm });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الزر");
      setMessage(form.id ? "تم تحديث الزر والوصف بنجاح." : "تم إنشاء الزر وإضافته إلى الواجهة.");
      resetForm();
      await loadItems();
    } catch (value: unknown) {
      setError(errorText(value));
    } finally {
      setSaving(false);
    }
  };

  const action = async (id: number, type: "toggle" | "delete") => {
    if (type === "delete" && !window.confirm("هل تريد حذف هذا الزر نهائيًا؟")) return;
    setWorkingId(id); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: type, id }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ العملية");
      setMessage(type === "delete" ? "تم حذف الزر." : "تم تحديث حالة الزر.");
      await loadItems();
    } catch (value: unknown) {
      setError(errorText(value));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <DashboardLayout>
      <main className="admin-page space-y-5 overflow-x-hidden">
        <header className="glass-strong rounded-3xl border border-[var(--color-border)] p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]"><Zap size={22} /></span>
            <div className="min-w-0"><p className="mb-1 text-[10px] font-black tracking-[0.16em] text-[var(--color-primary)]">تخصيص آمن للواجهة</p><h1 className="text-xl font-black text-white sm:text-2xl">الأزرار والروابط المخصصة</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-zinc-400">أنشئ زرًا واضحًا، أضف وصفًا قصيرًا يشرح فائدته، وحدد مكان ظهوره. يقبل النظام مسارات داخلية فقط وأيقونات من القائمة الآمنة.</p></div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--color-border)] bg-black/10 p-3"><b className="block text-xs text-white">وصف مختصر</b><span className="mt-1 block text-[10px] leading-4 text-zinc-500">يظهر تحت الزر ولا يخرج عن المساحة.</span></div><div className="rounded-2xl border border-[var(--color-border)] bg-black/10 p-3"><b className="block text-xs text-white">تحكم كامل</b><span className="mt-1 block text-[10px] leading-4 text-zinc-500">تعديل، تعطيل، أو حذف في أي وقت.</span></div><div className="rounded-2xl border border-[var(--color-border)] bg-black/10 p-3"><b className="block text-xs text-white">تحديث مباشر</b><span className="mt-1 block text-[10px] leading-4 text-zinc-500">يُعاد تحميل القائمة بعد كل عملية.</span></div></div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form onSubmit={submit} className="admin-card p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-white">{form.id ? "تعديل الزر" : "إنشاء زر جديد"}</h2><p className="mt-1 text-[10px] leading-5 text-zinc-500">املأ العنوان والوصف والمسار، ثم احفظ ليظهر العنصر حسب الجمهور.</p></div>{form.id && <button type="button" onClick={resetForm} className="rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/5 hover:text-white">إلغاء التعديل</button>}</div>
            <div className="space-y-3">
              <Field label="العنوان العربي" hint="اسم قصير وواضح يظهر للمستخدم."><input value={form.label_ar} onChange={(event) => updateField("label_ar", event.target.value)} maxLength={80} required className="input-premium mt-2 w-full" placeholder="مثال: عروض اليوم" /></Field>
              <Field label="العنوان الإنجليزي" hint="اختياري؛ يستخدم عند اختيار اللغة الإنجليزية."><input value={form.label_en} onChange={(event) => updateField("label_en", event.target.value)} maxLength={80} className="input-premium mt-2 w-full" placeholder="Daily offers" /></Field>
              <Field label="وصف الزر بالعربية" hint="جملة قصيرة تشرح الفائدة، بحد أقصى 120 حرفًا."><textarea value={form.description_ar} onChange={(event) => updateField("description_ar", event.target.value)} maxLength={120} rows={2} className="input-premium mt-2 w-full resize-none" placeholder="تصفح أحدث العروض والخدمات المتاحة." /></Field>
              <Field label="وصف الزر بالإنجليزية" hint="اختياري ويظهر مع اللغة الإنجليزية."><textarea value={form.description_en} onChange={(event) => updateField("description_en", event.target.value)} maxLength={120} rows={2} className="input-premium mt-2 w-full resize-none" placeholder="Browse the latest available offers." /></Field>
              <Field label="المسار الداخلي" hint="يجب أن يبدأ بـ / ولا يقبل روابط خارجية أو أكوادًا."><input value={form.href} onChange={(event) => updateField("href", event.target.value)} maxLength={160} required className="input-premium mt-2 w-full text-left" dir="ltr" placeholder="/updates" /></Field>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="الأيقونة" hint="أيقونة آمنة من القائمة المسموحة."><select value={form.icon} onChange={(event) => updateField("icon", event.target.value)} className="input-premium mt-2 w-full">{NAVIGATION_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></Field><Field label="مكان العرض" hint="حدد الجمهور الذي يرى الزر."><select value={form.audience} onChange={(event) => updateField("audience", event.target.value)} className="input-premium mt-2 w-full"><option value="user">المستخدمون</option><option value="admin">الإدارة</option><option value="both">المستخدمون والإدارة</option></select></Field></div>
              <div className="grid gap-3 sm:grid-cols-3"><Field label="الوسم" hint="اختياري مثل جديد."><input value={form.badge} onChange={(event) => updateField("badge", event.target.value)} maxLength={24} className="input-premium mt-2 w-full" placeholder="جديد" /></Field><Field label="لون الوسم" hint="لون شارة صغيرة."><select value={form.badge_color} onChange={(event) => updateField("badge_color", event.target.value)} className="input-premium mt-2 w-full">{NAVIGATION_BADGE_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select></Field><Field label="الترتيب" hint="رقم أصغر يظهر أولًا."><input value={form.sort_order} onChange={(event) => updateField("sort_order", event.target.value)} type="number" className="input-premium mt-2 w-full" /></Field></div>
            </div>
            <button disabled={saving} className="btn-gold mt-4 flex w-full items-center justify-center gap-2 disabled:opacity-50"><Plus size={17} />{saving ? "جارٍ الحفظ..." : form.id ? "حفظ التعديل" : "إنشاء الزر"}</button>
            {(message || error) && <div className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs font-bold ${error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><span>{error || message}</span></div>}
          </form>

          <section className="admin-card p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-white">الأزرار الحالية</h2><p className="mt-1 text-[10px] text-zinc-500">راجع ما يظهر حاليًا وعدّل أي عنصر من هنا.</p></div><span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[10px] font-black text-[var(--color-primary)]">{items.length} عنصر</span></div>{loading ? <p className="py-12 text-center text-xs text-zinc-500">جارٍ التحميل...</p> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-xs leading-6 text-zinc-500">لا توجد أزرار مخصصة بعد.<br />أنشئ أول زر من النموذج.</div> : <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-black/20 p-3.5"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Zap size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-black text-white">{item.label_ar}</span>{item.label_en && <span className="text-[10px] text-zinc-500">({item.label_en})</span>}{item.badge && <span className="badge-new rounded-full px-2 py-0.5 text-[10px]">{item.badge}</span>}</div>{(item.description_ar || item.description_en) && <p className="mt-1 text-xs leading-5 text-zinc-400">{item.description_ar || item.description_en}</p>}<p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-600" dir="ltr"><ExternalLink size={11} />{item.href} · {item.audience}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => setForm({ id: item.id, label_ar: item.label_ar, label_en: item.label_en || "", description_ar: item.description_ar || "", description_en: item.description_en || "", href: item.href, icon: item.icon, badge: item.badge || "", badge_color: item.badge_color, audience: item.audience, sort_order: String(item.sort_order) })} className="admin-action-button text-zinc-400" aria-label="تعديل الزر" title="تعديل الزر"><Pencil size={16} /></button><button type="button" disabled={workingId === item.id} onClick={() => void action(item.id, "toggle")} className={`admin-action-button ${item.is_active ? "text-green-400" : "text-zinc-600"}`} aria-label="تفعيل أو تعطيل الزر" title={item.is_active ? "تعطيل الزر" : "تفعيل الزر"}><Power size={16} /></button><button type="button" disabled={workingId === item.id} onClick={() => void action(item.id, "delete")} className="admin-action-button text-red-400 hover:border-red-400/20 hover:bg-red-500/10" aria-label="حذف الزر" title="حذف الزر"><Trash2 size={16} /></button></div></div><div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-2 text-[10px] font-bold"><span className={item.is_active ? "text-green-400" : "text-zinc-500"}>{item.is_active ? "نشط ويظهر حسب الجمهور" : "معطل ولا يظهر"}</span><span className="text-zinc-700">•</span><span className="text-zinc-500">ترتيب {item.sort_order}</span></div></article>)}</div>}</section>
        </section>
        <div className="flex flex-wrap gap-2"><a href="/admin/settings" className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5"><ArrowRight size={14} />إعدادات الإدارة</a></div>
      </main>
    </DashboardLayout>
  );
}
