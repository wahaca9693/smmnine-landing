"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Gift, Loader2, RefreshCw, Sparkles } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

type FreeOffer = {
  id: number;
  serviceId: string;
  serviceName: string;
  source: string;
  minQuantity: number;
  maxQuantity: number;
  cooldownHours: number;
  available: boolean;
  cooldownUntil: string | null;
  remainingSeconds: number;
  lastQuantity: number | null;
};

type Message = { text: string; error?: boolean } | null;

function formatCooldown(hours: number) {
  if (hours >= 24 && hours % 24 === 0) return `كل ${hours / 24} يوم${hours / 24 === 1 ? "" : "ًا"}`;
  return `كل ${hours} ساعة`;
}

function formatRemaining(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (days > 0) return `${days} يوم و${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة و${minutes} دقيقة`;
  if (minutes > 0) return `${minutes} دقيقة و${secs} ثانية`;
  return `${secs} ثانية`;
}

export default function FreeServicesPage() {
  const [offers, setOffers] = useState<FreeOffer[]>([]);
  const [links, setLinks] = useState<Record<number, string>>({});
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadOffers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/free-services", { cache: "no-store" });
      const data = await response.json() as { offers?: FreeOffer[]; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تحميل العروض المجانية");
      setOffers(data.offers || []);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "تعذر تحميل العروض المجانية", error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOffers(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleOffers = useMemo(() => offers.map((offer) => {
    const until = offer.cooldownUntil ? new Date(offer.cooldownUntil).getTime() : 0;
    const remainingSeconds = until > now ? Math.ceil((until - now) / 1000) : 0;
    return { ...offer, remainingSeconds, available: remainingSeconds <= 0 };
  }), [offers, now]);

  const redeem = async (offer: FreeOffer) => {
    const link = String(links[offer.id] || "").trim();
    const quantity = Number(quantities[offer.id] || offer.minQuantity);
    if (!link) { setMessage({ text: "أدخل رابط المنشور أو الحساب أولًا", error: true }); return; }
    if (!Number.isInteger(quantity) || quantity < offer.minQuantity || quantity > offer.maxQuantity) {
      setMessage({ text: `الكمية يجب أن تكون بين ${offer.minQuantity} و${offer.maxQuantity}`, error: true }); return;
    }
    setSubmitting(offer.id); setMessage(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch("/api/free-services/redeem", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ offerId: offer.id, link, quantity, idempotencyKey }) });
      const data = await response.json() as { error?: string; order?: { id: number } };
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الهدية");
      setMessage({ text: `تم إرسال الهدية بنجاح، رقم الطلب #${data.order?.id || "-"}` });
      setLinks((current) => ({ ...current, [offer.id]: "" }));
      await loadOffers();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "تعذر تنفيذ الهدية", error: true });
      await loadOffers();
    } finally {
      setSubmitting(null);
    }
  };

  return <DashboardLayout>
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#2a1d08] via-[var(--color-surface)] to-[#111] p-5 shadow-[0_20px_70px_-30px_rgba(212,175,55,0.55)] sm:p-7">
        <div className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-[var(--color-gold)]/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold-bright)] to-[var(--color-gold-deep)] text-black shadow-xl"><Gift size={28} /></span><div><p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-gold-bright)]">Royal Rewards</p><h1 className="text-2xl font-black text-white sm:text-3xl">المجاني والهدايا</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">استفد من الخدمات التي يحددها فريق الإدارة مجانًا. لكل عرض فترة انتظار مستقلة، وسيظهر لك العداد حتى يحين موعد الاستخدام التالي.</p></div></div>
          <button onClick={() => void loadOffers()} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)]/30 bg-black/20 px-4 text-xs font-black text-[var(--color-gold-pale)] hover:bg-[var(--color-gold)]/10"><RefreshCw size={15} /> تحديث</button>
        </div>
      </section>

      {message && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${message.error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-green-500/30 bg-green-500/10 text-green-300"}`}>{message.text}</div>}

      {loading ? <div className="flex min-h-40 items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] text-zinc-400"><Loader2 className="animate-spin" /></div> : visibleOffers.length === 0 ? <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center"><Sparkles className="mx-auto mb-3 text-[var(--color-gold)]" size={30} /><h2 className="text-lg font-black text-white">لا توجد هدايا متاحة حاليًا</h2><p className="mt-2 text-sm text-zinc-500">سيظهر هنا كل عرض مجاني يفعّله Admin.</p></div> : <div className="grid gap-4 md:grid-cols-2">{visibleOffers.map((offer) => <article key={offer.id} className="overflow-hidden rounded-3xl border border-[var(--color-gold)]/20 bg-[var(--color-surface)] shadow-lg"><div className="border-b border-[var(--color-border)] bg-gradient-to-l from-[var(--color-gold)]/10 to-transparent p-4"><div className="flex items-start justify-between gap-3"><div><span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-gold)]/10 px-2 py-1 text-[10px] font-black text-[var(--color-gold-bright)]"><Gift size={12} /> مجاني</span><h2 className="text-lg font-black text-white">{offer.serviceName}</h2></div><span className="rounded-xl border border-[var(--color-border)] px-2 py-1 text-[10px] font-bold text-zinc-400">{formatCooldown(offer.cooldownHours)}</span></div><p className="mt-2 text-xs text-zinc-400">الكمية المسموحة: {offer.minQuantity.toLocaleString()} — {offer.maxQuantity.toLocaleString()}</p></div><div className="space-y-3 p-4"><label className="block text-xs font-bold text-zinc-400">الرابط<input value={links[offer.id] || ""} onChange={(event) => setLinks((current) => ({ ...current, [offer.id]: event.target.value }))} placeholder="https://..." dir="ltr" className="mt-1 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm text-white outline-none focus:border-[var(--color-gold)]" /></label><label className="block text-xs font-bold text-zinc-400">الكمية<input type="number" min={offer.minQuantity} max={offer.maxQuantity} value={quantities[offer.id] || offer.minQuantity} onChange={(event) => setQuantities((current) => ({ ...current, [offer.id]: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-black text-white outline-none focus:border-[var(--color-gold)]" /></label>{offer.available ? <button disabled={submitting === offer.id} onClick={() => void redeem(offer)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold-bright)] via-[var(--color-gold)] to-[var(--color-gold-deep)] text-sm font-black text-black disabled:opacity-50">{submitting === offer.id ? <Loader2 size={17} className="animate-spin" /> : <Gift size={17} />} استخدم الهدية مجانًا</button> : <div className="flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-400/10 px-3 py-3 text-xs font-bold text-orange-200"><Clock3 size={16} /><span>متاح بعد {formatRemaining(offer.remainingSeconds)}. لا يمكنك تكرار الاستخدام قبل انتهاء العداد.</span></div>}</div></article>)}</div>}
    </div>
  </DashboardLayout>;
}
