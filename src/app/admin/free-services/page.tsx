"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Gift, Loader2, Power, RefreshCw, Save, Trash2, X } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";

type CatalogService = { serviceId: string; name: string; category: string; rate: number; min: number; max: number; source: string };
type Offer = { id: number; service_id: string; service_name: string; source: string; min_quantity: number; max_quantity: number; cooldown_hours: number; is_active: number; updated_at: string };
type Message = { text: string; error?: boolean } | null;

type CooldownUnit = "hours" | "days";
type FormState = { serviceId: string; minQuantity: string; maxQuantity: string; cooldownValue: string; cooldownUnit: CooldownUnit };
const initialForm: FormState = { serviceId: "", minQuantity: "", maxQuantity: "", cooldownValue: "24", cooldownUnit: "hours" };

function numberValue(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function cooldownToHours(value: string, unit: CooldownUnit) { const parsed = numberValue(value); return unit === "days" ? parsed * 24 : parsed; }
function formatCooldown(hours: number) {
  if (hours >= 24 && hours % 24 === 0) return `كل ${hours / 24} يوم${hours / 24 === 1 ? "" : "ًا"}`;
  return `كل ${hours} ساعة`;
}
function formFromHours(hours: number): Pick<FormState, "cooldownValue" | "cooldownUnit"> {
  return hours >= 24 && hours % 24 === 0 ? { cooldownValue: String(hours / 24), cooldownUnit: "days" } : { cooldownValue: String(hours), cooldownUnit: "hours" };
}

export default function AdminFreeServicesPage() {
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/free-services", { cache: "no-store", credentials: "include" });
      const data = await response.json() as { catalog?: CatalogService[]; offers?: Offer[]; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تحميل العروض");
      setCatalog(data.catalog || []); setOffers(data.offers || []);
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : "تعذر تحميل العروض", error: true }); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedService = useMemo(() => catalog.find((service) => service.serviceId === form.serviceId), [catalog, form.serviceId]);

  const selectService = (serviceId: string) => {
    const service = catalog.find((item) => item.serviceId === serviceId);
    setForm({ serviceId, minQuantity: service ? String(service.min) : "", maxQuantity: service ? String(service.max) : "", cooldownValue: "1", cooldownUnit: "days" });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/free-services", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: editingId ? "update" : "create", id: editingId, serviceId: form.serviceId, minQuantity: numberValue(form.minQuantity), maxQuantity: numberValue(form.maxQuantity), cooldownHours: cooldownToHours(form.cooldownValue, form.cooldownUnit) }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ العرض");
      setMessage({ text: editingId ? "تم تحديث العرض المجاني" : "تمت إضافة الخدمة إلى قسم المجاني" });
      setForm(initialForm); setEditingId(null); await load();
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : "تعذر حفظ العرض", error: true }); }
    finally { setSaving(false); }
  };

  const edit = (offer: Offer) => { setEditingId(offer.id); setForm({ serviceId: offer.service_id, minQuantity: String(offer.min_quantity), maxQuantity: String(offer.max_quantity), ...formFromHours(offer.cooldown_hours) }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const action = async (actionName: "toggle" | "delete", id: number) => {
    if (actionName === "delete" && !window.confirm("إزالة العرض من المستخدمين؟ ستتوقف الخدمة المجانية مع الحفاظ على سجلات الاستخدام السابقة.")) return;
    const response = await fetch("/api/admin/free-services", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: actionName, id }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) setMessage({ text: data.error || "تعذر تنفيذ العملية", error: true }); else { setMessage({ text: actionName === "toggle" ? "تم تحديث حالة العرض" : "تمت إزالة العرض مع الحفاظ على السجل" }); await load(); }
  };

  return <DashboardLayout>
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <section className="rounded-[2rem] border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#2a1d08] via-[var(--color-surface)] to-[#111] p-5 sm:p-7"><div className="flex items-start gap-3"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold-bright)] to-[var(--color-gold-deep)] text-black shadow-xl"><Gift size={28} /></span><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-gold-bright)]">Admin Rewards</p><h1 className="mt-1 text-2xl font-black text-white">إدارة المجاني والهدايا</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">اختر أي خدمة نشطة، وحدد الكمية التي تمنحها مجانًا وفترة إعادة الاستخدام لكل مستخدم. لا يُخصم الرصيد من المستخدم عند تنفيذ الطلب المجاني.</p></div></div></section>
      {message && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${message.error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-green-500/30 bg-green-500/10 text-green-300"}`}>{message.text}</div>}

      <form onSubmit={save} className="glass-card space-y-4 rounded-3xl border border-[var(--color-gold)]/25 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-black text-white"><Gift size={18} className="text-[var(--color-gold)]" />{editingId ? "تعديل العرض" : "إضافة خدمة مجانية"}</h2>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }} className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold text-zinc-300"><X size={14} /> إلغاء</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold text-zinc-400 sm:col-span-2 lg:col-span-2">الخدمة المدفوعة<select required value={form.serviceId} onChange={(event) => selectService(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-bold text-white outline-none focus:border-[var(--color-gold)]"><option value="">اختر الخدمة التي تصبح مجانية</option>{catalog.map((service) => <option key={service.serviceId} value={service.serviceId}>{service.name} · {service.serviceId} · حد {service.min}—{service.max}</option>)}</select>{selectedService && <span className="mt-1 block text-[10px] text-zinc-500">السعر الأصلي: ${selectedService.rate.toFixed(6)} · المصدر: {selectedService.source}</span>}</label><label className="text-xs font-bold text-zinc-400">أقل كمية<input required type="number" min="1" value={form.minQuantity} onChange={(event) => setForm({ ...form, minQuantity: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black text-white outline-none focus:border-[var(--color-gold)]" /></label><label className="text-xs font-bold text-zinc-400">أقصى كمية<input required type="number" min="1" value={form.maxQuantity} onChange={(event) => setForm({ ...form, maxQuantity: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black text-white outline-none focus:border-[var(--color-gold)]" /></label><label className="text-xs font-bold text-zinc-400">فترة إعادة الاستخدام<div className="mt-1 grid grid-cols-[1fr_110px] gap-2"><input required type="number" min="1" max={form.cooldownUnit === "days" ? 30 : 720} step="1" value={form.cooldownValue} onChange={(event) => setForm({ ...form, cooldownValue: event.target.value })} className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black text-white outline-none focus:border-[var(--color-gold)]" /><select value={form.cooldownUnit} onChange={(event) => setForm({ ...form, cooldownUnit: event.target.value as CooldownUnit })} className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs font-black text-white outline-none focus:border-[var(--color-gold)]"><option value="hours">ساعة</option><option value="days">يوم</option></select></div><span className="mt-1 block text-[10px] text-zinc-500">من ساعة واحدة حتى 30 يومًا.</span></label></div>
        <button disabled={saving || !catalog.length} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold-bright)] via-[var(--color-gold)] to-[var(--color-gold-deep)] text-sm font-black text-black disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" /> : editingId ? <Save size={17} /> : <Gift size={17} />}{editingId ? "حفظ التعديل" : "إضافة إلى المجاني"}</button>
      </form>

      <section className="glass-card overflow-hidden rounded-3xl border border-[var(--color-border)]"><div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3"><h2 className="text-sm font-black text-white">العروض الحالية ({offers.length})</h2><button onClick={() => void load()} className="rounded-xl border border-[var(--color-border)] p-2 text-zinc-300"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button></div>{offers.length === 0 ? <div className="p-10 text-center text-sm text-zinc-500">لم تضف أي خدمة مجانية بعد.</div> : <div className="divide-y divide-[var(--color-border)]">{offers.map((offer) => <div key={offer.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black text-white">{offer.service_name}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black ${offer.is_active ? "bg-green-500/10 text-green-300" : "bg-zinc-500/10 text-zinc-400"}`}>{offer.is_active ? "فعال" : "متوقف"}</span></div><p className="mt-1 text-[11px] text-zinc-500">{offer.service_id} · الكمية {offer.min_quantity.toLocaleString()}—{offer.max_quantity.toLocaleString()} · {formatCooldown(offer.cooldown_hours)}</p></div><div className="flex gap-2"><button onClick={() => edit(offer)} className="flex h-9 items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 text-[10px] font-black text-zinc-300"><Edit3 size={13} /> تعديل</button><button onClick={() => void action("toggle", offer.id)} className="flex h-9 items-center gap-1 rounded-xl border border-[var(--color-gold)]/30 px-3 text-[10px] font-black text-[var(--color-gold-pale)]"><Power size={13} /> {offer.is_active ? "إيقاف" : "تفعيل"}</button><button onClick={() => void action("delete", offer.id)} className="flex h-9 items-center justify-center rounded-xl border border-red-500/30 px-3 text-red-300"><Trash2 size={13} /></button></div></div>)}</div>}</section>
    </div>
  </DashboardLayout>;
}
