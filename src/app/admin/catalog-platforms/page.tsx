"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Edit3, ExternalLink, Image as ImageIcon, Plus, Power, Search, Trash2, X } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";

type Service = {
  service?: string | number;
  name?: unknown;
  category?: unknown;
  serviceType?: unknown;
  rate?: unknown;
  min?: unknown;
  max?: unknown;
};

type Platform = {
  id: string;
  label_ar: string;
  label_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  service_ids: string[];
  is_active: boolean;
  sort_order: number;
};

type FormState = {
  id: string;
  label_ar: string;
  label_en: string;
  description_ar: string;
  description_en: string;
  logo_url: string;
  sort_order: string;
  service_ids: string[];
};

const emptyForm: FormState = {
  id: "",
  label_ar: "",
  label_en: "",
  description_ar: "",
  description_en: "",
  logo_url: "",
  sort_order: "0",
  service_ids: [],
};

function serviceText(value: unknown): string {
  return String(value ?? "").trim();
}

function serviceLabel(service: Service): string {
  return serviceText(service.name) || `الخدمة ${serviceText(service.service)}`;
}

export default function CatalogPlatformsAdminPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [platformResponse, serviceResponse] = await Promise.all([
        fetch("/api/admin/catalog-platforms", { credentials: "include", cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
      ]);
      const platformData = await platformResponse.json();
      const serviceData = await serviceResponse.json();
      if (!platformResponse.ok) throw new Error(platformData.error || "تعذر تحميل المنصات");
      if (!serviceResponse.ok) throw new Error(serviceData.error || "تعذر تحميل الخدمات");
      setPlatforms(Array.isArray(platformData.platforms) ? platformData.platforms : []);
      setServices(Array.isArray(serviceData.services) ? serviceData.services : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleServices = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const filtered = services.filter((service) => {
      if (!normalized) return true;
      return [serviceLabel(service), serviceText(service.service), serviceText(service.category), serviceText(service.serviceType)]
        .join(" ").toLocaleLowerCase().includes(normalized);
    });
    return filtered.slice(0, 240);
  }, [services, query]);

  const selectedServices = useMemo(() => {
    const selected = new Set(form.service_ids);
    return services.filter((service) => selected.has(serviceText(service.service)));
  }, [form.service_ids, services]);

  const updateForm = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const toggleService = (id: string) => {
    setForm((current) => ({
      ...current,
      service_ids: current.service_ids.includes(id)
        ? current.service_ids.filter((serviceId) => serviceId !== id)
        : [...current.service_ids, id],
    }));
  };

  const editPlatform = (platform: Platform) => {
    setForm({
      id: platform.id,
      label_ar: platform.label_ar,
      label_en: platform.label_en || "",
      description_ar: platform.description_ar || "",
      description_en: platform.description_en || "",
      logo_url: platform.logo_url || "",
      sort_order: String(platform.sort_order),
      service_ids: platform.service_ids,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/catalog-platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "save", ...form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الزر");
      setPlatforms(Array.isArray(data.platforms) ? data.platforms : []);
      setForm(emptyForm);
      setMessage("تم حفظ الزر المخصص. لن تظهر أي منصة أخرى تلقائيًا.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ الزر");
    } finally {
      setSaving(false);
    }
  };

  const action = async (actionName: "toggle" | "delete", platform: Platform) => {
    const promptText = actionName === "delete" ? `حذف زر «${platform.label_ar}» نهائيًا؟` : `${platform.is_active ? "إخفاء" : "إظهار"} زر «${platform.label_ar}»؟`;
    if (!window.confirm(promptText)) return;
    setError("");
    try {
      const response = await fetch("/api/admin/catalog-platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: actionName, id: platform.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ العملية");
      setPlatforms(Array.isArray(data.platforms) ? data.platforms : []);
      if (form.id === platform.id) setForm(emptyForm);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "تعذر تنفيذ العملية");
    }
  };

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-[var(--color-bg)] px-4 py-5 pb-12">
        <div className="mx-auto max-w-6xl space-y-5">
          <header className="card-luxe rounded-3xl border border-[var(--color-primary)]/20 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[var(--color-primary-light)]">كتالوج follower</p>
                <h1 className="mt-1 text-2xl font-black text-white">منصات وأزرار مخصصة</h1>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">أنشئ الأزرار بنفسك. لن يتم إنشاء زر من اسم الخدمة أو اسم الخادم تلقائيًا. كل زر هنا يملك اسمًا وشعارًا وقائمة خدمات تختارها أنت.</p>
              </div>
              <Link href="/services" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white"><ExternalLink size={14} />معاينة الكتالوج</Link>
            </div>
          </header>

          {(message || error) && <div className={`rounded-2xl border p-4 text-sm font-bold ${error ? "border-red-400/20 bg-red-400/10 text-red-300" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"}`}>{error || message}</div>}

          <form onSubmit={submit} className="card-luxe rounded-3xl border border-[var(--color-border)] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-black text-white">{form.id ? "تعديل الزر" : "إنشاء زر جديد"}</h2><p className="mt-1 text-xs text-zinc-500">الخدمات المختارة: {form.service_ids.length.toLocaleString("ar-AE")}</p></div>
              {form.id && <button type="button" onClick={() => setForm(emptyForm)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-zinc-400 hover:text-white"><X size={14} />إلغاء التعديل</button>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-zinc-300">اسم الزر بالعربية<input required minLength={2} maxLength={80} value={form.label_ar} onChange={(event) => updateForm("label_ar", event.target.value)} className="input-luxe mt-2 w-full rounded-xl px-3 py-3 text-sm text-white" placeholder="مثال: خدمات تيك توك" /></label>
              <label className="text-xs font-bold text-zinc-300">اسم الزر بالإنجليزية<input maxLength={80} value={form.label_en} onChange={(event) => updateForm("label_en", event.target.value)} className="input-luxe mt-2 w-full rounded-xl px-3 py-3 text-sm text-white" placeholder="TikTok Services" /></label>
              <label className="text-xs font-bold text-zinc-300">وصف مختصر بالعربية<input maxLength={160} value={form.description_ar} onChange={(event) => updateForm("description_ar", event.target.value)} className="input-luxe mt-2 w-full rounded-xl px-3 py-3 text-sm text-white" placeholder="متابعون وإعجابات ومشاهدات" /></label>
              <label className="text-xs font-bold text-zinc-300">وصف مختصر بالإنجليزية<input maxLength={160} value={form.description_en} onChange={(event) => updateForm("description_en", event.target.value)} className="input-luxe mt-2 w-full rounded-xl px-3 py-3 text-sm text-white" placeholder="Followers, likes and views" /></label>
              <label className="text-xs font-bold text-zinc-300 md:col-span-2">رابط الشعار (HTTPS أو مسار داخل المنصة)<div className="relative"><ImageIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input maxLength={500} value={form.logo_url} onChange={(event) => updateForm("logo_url", event.target.value)} className="input-luxe mt-2 w-full rounded-xl py-3 pr-10 pl-3 text-sm text-white" placeholder="https://.../logo.png أو /logo.gif" /></div></label>
              <label className="text-xs font-bold text-zinc-300">ترتيب الظهور<input type="number" min={-10000} max={10000} value={form.sort_order} onChange={(event) => updateForm("sort_order", event.target.value)} className="input-luxe mt-2 w-full rounded-xl px-3 py-3 text-sm text-white" /></label>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-black/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black text-white">اختر خدمات هذا الزر</h3><p className="mt-1 text-[11px] text-zinc-500">لا يتم عرض اسم المزوّد. ابحث بالاسم أو رقم الخدمة العام.</p></div><div className="relative w-full sm:w-80"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="input-luxe w-full rounded-xl py-2.5 pr-9 pl-3 text-xs text-white" placeholder="بحث في الخدمات..." /></div></div>
              {selectedServices.length > 0 && <div className="mt-3 flex max-h-24 flex-wrap gap-1 overflow-auto">{selectedServices.slice(0, 30).map((service) => <button type="button" key={serviceText(service.service)} onClick={() => toggleService(serviceText(service.service))} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-primary)]/15 px-2 py-1 text-[10px] font-bold text-[var(--color-primary-light)]"><span className="truncate">{serviceLabel(service)}</span><X size={11} /></button>)}{selectedServices.length > 30 && <span className="px-2 py-1 text-[10px] text-zinc-500">+{selectedServices.length - 30} أخرى</span>}</div>}
              <div className="mt-3 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">{visibleServices.map((service) => { const id = serviceText(service.service); const checked = form.service_ids.includes(id); return <label key={id} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${checked ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10" : "border-[var(--color-border)] bg-black/10 hover:bg-white/5"}`}><input type="checkbox" checked={checked} onChange={() => toggleService(id)} className="mt-0.5 accent-[var(--color-primary)]" /><span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{serviceLabel(service)}</span><span className="mt-1 block truncate text-[10px] text-zinc-500">{serviceText(service.category) || "عام"} · {serviceText(service.serviceType) || "خدمة"} · {serviceText(service.rate)}</span></span></label>; })}</div>
              <p className="mt-2 text-[10px] text-zinc-600">{query ? `يعرض أول ${visibleServices.length} نتيجة من البحث.` : `يعرض أول ${visibleServices.length} خدمة. استخدم البحث للوصول إلى أي خدمة.`}</p>
            </div>
            <button disabled={saving || loading || form.service_ids.length === 0} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-deep)] py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"><Check size={17} />{saving ? "جاري الحفظ..." : form.id ? "حفظ التعديلات" : "إنشاء الزر"}</button>
          </form>

          <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-white">الأزرار التي أنشأتها</h2><span className="text-xs text-zinc-500">{platforms.length.toLocaleString("ar-AE")} زر</span></div>{loading ? <div className="card-luxe rounded-2xl p-6 text-center text-sm text-zinc-400">جاري تحميل البيانات...</div> : platforms.length === 0 ? <div className="card-luxe rounded-2xl p-8 text-center"><Plus size={30} className="mx-auto mb-2 text-[var(--color-primary)]" /><p className="font-black text-white">لا توجد أزرار مخصصة بعد</p><p className="mt-1 text-xs text-zinc-500">أنشئ أول زر من النموذج أعلاه.</p></div> : <div className="grid gap-3 md:grid-cols-2">{platforms.map((platform) => <article key={platform.id} className={`card-luxe rounded-2xl border p-4 ${platform.is_active ? "border-[var(--color-border)]" : "border-red-400/20 opacity-60"}`}><div className="flex items-start gap-3">{platform.logo_url ? <img src={platform.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><ImageIcon size={22} /></div>}<div className="min-w-0 flex-1"><h3 className="truncate font-black text-white">{platform.label_ar}</h3><p className="mt-1 line-clamp-2 text-xs text-zinc-500">{platform.description_ar || "بدون وصف"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${platform.is_active ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>{platform.is_active ? "ظاهر" : "مخفي"}</span></div><div className="mt-3 text-xs text-zinc-400">{platform.service_ids.length.toLocaleString("ar-AE")} خدمة مرتبطة</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => editPlatform(platform)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white"><Edit3 size={13} />تعديل</button><button type="button" onClick={() => void action("toggle", platform)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white"><Power size={13} />{platform.is_active ? "إخفاء" : "إظهار"}</button><button type="button" onClick={() => void action("delete", platform)} className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-400/10"><Trash2 size={13} />حذف</button></div></article>)}</div>}</section>
        </div>
      </main>
    </DashboardLayout>
  );
}
