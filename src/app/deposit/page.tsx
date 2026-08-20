"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import { useLiveRefresh } from "../components/useLiveRefresh";
import Link from "next/link";
import { Wallet, Copy, Check, ArrowLeft, QrCode, Zap, ShieldCheck, Coins, Clock, AlertTriangle, Smartphone, ArrowUpRight, Gift, Loader2, CreditCard } from "lucide-react";

interface DepositMethod {
  id: number;
  name: string;
  name_en: string;
  icon: string;
  is_active: number;
  is_auto: number;
  min_amount: number;
  config?: string;
}

const DEPOSIT_METHODS_CACHE_KEY = "smmnine:deposit-methods:v1";

const coinMeta: Record<string, { color: string; label: string; logo: string }> = {
  usdt: { color: "#26a17b", label: "USDT", logo: "/coins/coin-usdt.png" },
  bnb: { color: "#f0b90b", label: "BNB", logo: "/coins/coin-bnb.png" },
  btc: { color: "#f7931a", label: "BTC", logo: "/coins/coin-btc.png" },
};

const networkOf = (cfg: { coin?: string; network?: string } | null): string => {
  if (!cfg?.network) return "";
  const map: Record<string, string> = {
    bep20: "BSC (BEP20)",
    trc20: "Tron (TRC20)",
    erc20: "Ethereum (ERC20)",
    polygon: "Polygon",
    xlayer: "X Layer",
    segwit: "Bitcoin (SegWit)",
    bitcoin: "Bitcoin (SegWit)",
  };
  const key = String(cfg.network).toLowerCase();
  if (key === "erc20" || key === "ethereum") return "Ethereum (ERC20)";
  if (key === "trc20" || key === "tron") return "Tron (TRC20)";
  if (key === "bep20" || key === "bsc") return "BSC (BEP20)";
  return map[key] || cfg.network;
};

export default function DepositPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [selected, setSelected] = useState<DepositMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ pay_address?: string; pay_amount?: number; pay_currency?: string; payment_id?: string } | null>(null);
  const [asiacell, setAsiacell] = useState<{ connected: boolean; store_phone?: string; exchange_rate?: number }>({ connected: false });
  const [asiacellOpen, setAsiacellOpen] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [redeemingGift, setRedeemingGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const refreshingRef = useRef(false);

  const refreshData = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const methodsRequest = fetch("/api/deposit", { cache: "no-store", credentials: "include" })
        .then((response) => response.json())
        .then((data) => {
          if (Array.isArray(data.methods)) {
            setMethods(data.methods);
            setMethodsLoading(false);
            try {
              window.localStorage.setItem(DEPOSIT_METHODS_CACHE_KEY, JSON.stringify(data.methods));
            } catch {
              // Local storage may be disabled; the live response remains usable.
            }
          }
        })
        .catch(() => setMethodsLoading(false));

      const userRequest = fetch("/api/user", { cache: "no-store", credentials: "include" })
        .then((response) => response.json())
        .then((data) => {
          if (data?.user) setBalance(Number(data.user.balance || 0));
        })
        .catch(() => undefined);

      const asiacellRequest = fetch("/api/payments/asiacell", { cache: "no-store", credentials: "include" })
        .then((response) => response.json())
        .then((data) => {
          setAsiacell({
            connected: Boolean(data.connected),
            store_phone: data.store_phone,
            exchange_rate: Number(data.exchange_rate || 1666),
          });
        })
        .catch(() => undefined);

      await Promise.allSettled([methodsRequest, userRequest, asiacellRequest]);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const cacheTimer = window.setTimeout(() => {
      try {
        const cached = window.localStorage.getItem(DEPOSIT_METHODS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setMethods(parsed);
            setMethodsLoading(false);
          }
        }
      } catch {
        // Ignore malformed or unavailable local cache.
      }
    }, 0);

    const refreshTimer = window.setTimeout(() => {
      void refreshData();
    }, 0);
    return () => {
      window.clearTimeout(cacheTimer);
      window.clearTimeout(refreshTimer);
    };
  }, [refreshData]);

  useLiveRefresh(refreshData, { intervalMs: 30000 });

  const cryptoMethods = methods.filter((m) => ["usdt", "bnb", "btc"].includes(String(m.icon).toLowerCase()));
  const asiacellConfigured = Boolean(asiacell.connected);
  const cfg = selected ? (JSON.parse(selected.config || "{}") as { coin?: string; network?: string; address?: string }) : null;
  const selectedIsCrypto = Boolean(selected && ["usdt", "bnb", "btc"].includes(String(selected.icon).toLowerCase()));
  const selectedMinimum = selectedIsCrypto ? 1 : Number(selected?.min_amount || 0);
  const activeAddress = paymentInfo?.pay_address || cfg?.address;

  const copyAddress = async () => {
    if (!activeAddress) return;
    await navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const redeemGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCode.trim() || redeemingGift) return;
    setRedeemingGift(true); setGiftMessage(null);
    try {
      const res = await fetch("/api/gift-codes/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: giftCode }) });
      const data = await res.json();
      if (res.ok) { setGiftMessage({ text: `تمت إضافة $${Number(data.credited).toFixed(6)} إلى محفظتك` }); setGiftCode(""); setBalance(Number(data.balance || 0)); }
      else setGiftMessage({ text: data.error || "تعذر استرداد الكود", error: true });
    } catch { setGiftMessage({ text: "تعذر الاتصال بالخادم", error: true }); }
    finally { setRedeemingGift(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !amount) return;
    const num = Number(amount);
    if (isNaN(num) || num < selectedMinimum) {
      setMessage({ text: `الحد الأدنى للشحن ${selectedMinimum.toFixed(2)} دولار`, error: true });
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        methodId: selected.id,
        amount,
        notes: JSON.stringify({ coin: cfg?.coin, network: cfg?.network, address: cfg?.address, type: "crypto" }),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    await refreshData();
    if (data.error) setMessage({ text: data.error, error: true });
    else {
      if (data.payment) setPaymentInfo(data.payment);
      setMessage({ text: data.message || (Number(selected.is_auto) === 1 ? "تم إنشاء طلب الشحن — سيُحدّث الرصيد بعد تأكيد بوابة الدفع" : "تم تسجيل طلب الشحن — سيبقى معلقًا حتى مراجعة الإيداع من الإدارة"), error: false });
      setSubmitted(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-deep)] shadow-lg shadow-[var(--color-gold)]/20">
              <Coins size={24} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">شحن الرصيد</h1>
              <p className="text-xs text-zinc-500">شحن بالعملات الرقمية مع تحقق واضح حسب الشبكة</p>
            </div>
          </div>
          <button type="button" onClick={() => router.back()} className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-zinc-300">
            <ArrowLeft size={14} className="inline ml-1" />رجوع
          </button>
        </div>

        <div className="glass-card flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Wallet size={20} className="text-[var(--color-gold)]" />
            <span className="text-sm text-zinc-400">رصيدك الحالي</span>
          </div>
          <span className="text-lg font-black text-gradient-luxe">${balance.toFixed(4)}</span>
        </div>

        <form onSubmit={redeemGift} className="glass-card rounded-2xl border border-[var(--color-gold)]/25 bg-gradient-to-l from-[var(--color-gold)]/10 to-transparent p-4">
          <div className="mb-2 flex items-center gap-2"><Gift size={17} className="text-[var(--color-gold)]" /><div><h2 className="text-sm font-black text-white">لديك كود هدية؟</h2><p className="text-[10px] text-zinc-500">أدخل الكود لإضافة رصيده إلى محفظتك مباشرة</p></div></div>
          <div className="flex gap-2"><input value={giftCode} onChange={(e) => setGiftCode(e.target.value.toUpperCase())} placeholder="مثال: GOLD9X" className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-center font-mono text-sm font-black tracking-widest text-white outline-none focus:border-[var(--color-gold)]" /><button disabled={redeemingGift || !giftCode.trim()} className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold-deep)] px-3 text-[11px] font-black text-black disabled:opacity-50">{redeemingGift ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />} استرداد</button></div>
          {giftMessage && <div className={`mt-2 text-[10px] font-bold ${giftMessage.error ? "text-red-300" : "text-green-300"}`}>{giftMessage.text}</div>}
        </form>

        {/* اختيار العملة */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
            <Zap size={16} className="text-[var(--color-gold)]" /> اختر العملة والشبكة
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {methodsLoading && cryptoMethods.length === 0 && Object.entries(coinMeta).map(([icon, meta]) => (
              <div key={`loading-${icon}`} aria-busy="true" className="glass-card flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] p-3 text-center animate-fadeIn">
                {/* Dynamic payment-method logo; source is selected from the server catalog. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={meta.logo} alt={meta.label} className="h-10 w-10 rounded-full object-cover opacity-70 grayscale" />
                <span className="text-sm font-black" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-[10px] font-bold text-zinc-500">جارٍ تجهيز البوابة...</span>
              </div>
            ))}
            {!methodsLoading && cryptoMethods.length === 0 && (
              <div className="col-span-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-center text-xs font-bold text-amber-200 sm:col-span-3">
                لا توجد بوابة عملات رقمية مفعلة حاليًا. ستظهر البوابات فور تفعيلها من لوحة الإدارة.
              </div>
            )}
            {cryptoMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelected(m); setPaymentInfo(null); setSubmitted(false); setMessage(null); }}
                className={`relative flex flex-col items-center gap-1 rounded-2xl border p-3 transition ${
                  selected?.id === m.id
                    ? "border-[var(--color-gold)]/60 bg-[var(--color-gold)]/10 shadow-[0_0_24px_-8px_rgba(255,215,0,0.5)]"
                    : "glass-card"
                }`}
              >
                {selected?.id === m.id && (
                  <span className="absolute -top-1.5 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] text-black shadow-[0_0_10px_-3px_rgba(255,215,0,0.7)]">
                    <Check size={12} strokeWidth={4} />
                  </span>
                )}
                {/* Dynamic payment-method logo; source is selected from the server catalog. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coinMeta[m.icon]?.logo || "/logo-icon.png"}
                  alt={coinMeta[m.icon]?.label || m.name_en}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--color-gold)]/25 shadow-[0_4px_18px_-4px_rgba(212,175,55,0.45)]"
                  loading="eager"
                />
                <span className="text-sm font-black tracking-wide" style={{ color: coinMeta[m.icon]?.color || "var(--color-gold)" }}>
                  {coinMeta[m.icon]?.label || m.name_en.toUpperCase()}
                </span>
                <span className="text-[9px] font-bold text-zinc-400">
                  {networkOf(JSON.parse(m.config || "{}")) || m.name_en}
                </span>
                <span className={`text-[9px] font-bold ${Number(m.is_auto) === 1 ? "text-green-400" : "text-amber-300"}`}>
                  {Number(m.is_auto) === 1 ? "تحقق آلي" : "مراجعة قبل الشحن"}
                </span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[8px] font-bold text-zinc-500">
                  من {String(m.icon).toLowerCase() === "usdt" || String(m.icon).toLowerCase() === "bnb" || String(m.icon).toLowerCase() === "btc" ? "1.00" : m.min_amount} {coinMeta[m.icon]?.label || ""}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setAsiacellOpen((open) => !open); setSelected(null); setPaymentInfo(null); setMessage(null); setSubmitted(false); }}
              className={`relative flex min-h-[148px] flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition sm:min-h-[164px] ${asiacellOpen ? "border-[var(--color-gold)]/70 bg-[var(--color-gold)]/12 shadow-[0_0_24px_-8px_rgba(255,215,0,0.55)]" : "glass-card hover:border-[var(--color-gold)]/45"}`}
            >
              {asiacellOpen && <span className="absolute -top-1.5 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] text-black"><Check size={12} strokeWidth={4} /></span>}
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-gold)]/15 ring-2 ring-[var(--color-gold)]/25"><Smartphone size={22} className="text-[var(--color-gold)]" /></span>
              <span className="text-sm font-black text-[var(--color-gold)]">Asiacell</span>
              <span className="text-[10px] font-bold text-zinc-300">شحن بالعراقي</span>
              <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${asiacellConfigured ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-500"}`}>{asiacellConfigured ? "متاح الآن" : "قيد التفعيل"}</span>
            </button>
          </div>

          {asiacellOpen && (
            <section className="glass-card mt-3 overflow-hidden rounded-2xl border border-[var(--color-gold)]/35 animate-slideUp">
              <div className="flex items-start gap-3 border-b border-[var(--color-border)] bg-gradient-to-l from-[var(--color-gold)]/12 to-transparent p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/15 text-[var(--color-gold)]"><Smartphone size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-black text-white">اختر طريقة الشحن عبر Asiacell</h2><span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${asiacellConfigured ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-500"}`}>{asiacellConfigured ? "متاح الآن" : "غير متاح مؤقتًا"}</span></div>
                  <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">اختر التحويل من رقم الهاتف أو أدخل بطاقة شحن Asiacell. التحويل عليه رسم ثابت 500 د.ع، أما بطاقة الشحن فبدون رسوم.</p>
                </div>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                <Link href={asiacellConfigured ? "/deposit/asiacell?method=transfer" : "/deposit"} className={`group flex min-h-[72px] items-center justify-between rounded-2xl border px-4 py-3 transition ${asiacellConfigured ? "border-[var(--color-gold)]/55 bg-gradient-to-l from-[var(--color-gold)]/12 to-transparent hover:border-[var(--color-gold)]" : "pointer-events-none border-[var(--color-border)] opacity-50"}`}>
                  <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-gold)]/15 text-[var(--color-gold)]"><ArrowUpRight size={19} /></span><span><b className="block text-sm font-black text-white">تحويل</b><small className="mt-1 block text-[9px] text-zinc-400">من رقم الهاتف · OTP · رسم 500 د.ع</small></span></span><ArrowLeft size={17} className="text-[var(--color-gold)] transition group-hover:-translate-x-1" />
                </Link>
                <Link href={asiacellConfigured ? "/deposit/asiacell?method=card" : "/deposit"} className={`group flex min-h-[72px] items-center justify-between rounded-2xl border px-4 py-3 transition ${asiacellConfigured ? "border-[var(--color-border)] bg-black/15 hover:border-[var(--color-gold)]/60" : "pointer-events-none border-[var(--color-border)] opacity-50"}`}>
                  <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]"><CreditCard size={19} /></span><span><b className="block text-sm font-black text-white">كرت</b><small className="mt-1 block text-[9px] text-zinc-400">14–16 رقمًا · بلا رسوم</small></span></span><ArrowLeft size={17} className="text-zinc-400 transition group-hover:-translate-x-1" />
                </Link>
              </div>
              <div className="px-3 pb-3 text-[9px] text-zinc-600">السعر المخصص للمنصة: {Number(asiacell.exchange_rate || 1666).toLocaleString("ar-IQ")} د.ع لكل دولار. السعر الرسمي/السوقي قد يختلف.</div>
            </section>
          )}
        </div>

        {selected && activeAddress && (
          <div className="glass-card space-y-4 p-5 animate-slideUp">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <QrCode size={16} className="text-[var(--color-gold)]" /> عنوان الإيداع — {selected.name}
            </div>

            <div className="relative mx-auto w-fit overflow-hidden rounded-2xl bg-white p-2">
              {/* QR is generated by an external URL and must remain a plain image element. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeAddress)}`}
                alt="QR"
                width={200}
                height={200}
                className="h-44 w-44"
              />
            </div>

            <div className="rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 p-3">
              <div className="mb-1 text-[10px] font-black text-[var(--color-gold-pale)]">العنوان (انسخه بدقة كاملة)</div>
              <div className="break-all font-mono text-xs leading-relaxed text-white">{activeAddress}</div>
              <button
                onClick={copyAddress}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-deep)] px-4 py-2 text-xs font-black text-black shadow-[0_0_16px_-6px_rgba(255,215,0,0.5)]"
              >
                {copied ? <Check size={14} strokeWidth={4} /> : <Copy size={14} />} {copied ? "تم النسخ" : "نسخ العنوان"}
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-400">المبلغ (بالدولار)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`الحد الأدنى ${selectedMinimum.toFixed(2)} دولار` + (paymentInfo?.pay_amount ? ` · المطلوب ${paymentInfo.pay_amount} ${paymentInfo.pay_currency || ""}` : "")}
                  className="input-luxe w-full rounded-xl px-4 py-3 text-white"
                />
              </div>
              {message && (
                <div className={`rounded-xl p-3 text-xs font-bold ${message.error ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                  {message.text}
                </div>
              )}
              {!submitted && (
                <button type="submit" disabled={submitting} className="btn-gold w-full rounded-xl py-3.5 disabled:opacity-50">
                  {submitting ? "جاري إنشاء الطلب..." : "تأكيد واستلام العنوان"}
                </button>
              )}
            </form>

            <div className="rounded-xl border border-[var(--color-gold)]/15 bg-[var(--color-gold)]/5 p-3 text-[11px] leading-relaxed text-zinc-400">
              <div className="mb-1.5 flex items-center gap-1.5 font-black text-[var(--color-gold-pale)]">
                <ShieldCheck size={14} /> كيف يعمل الشحن؟
              </div>
              <ul className="list-disc space-y-1 pr-4">
                <li>العنوان المعروض مرتبط بالعملة والشبكة المختارتين من إعدادات المنصة.</li>
                <li>أرسل العملة نفسها على الشبكة نفسها فقط، ثم احتفظ برقم المعاملة إن احتجت للدعم.</li>
                <li>{Number(selected.is_auto) === 1 ? "سيتم تحديث الرصيد بعد تأكيد بوابة الدفع." : "سيبقى الطلب معلقًا حتى مراجعة الإيداع من الإدارة؛ لا يوجد اعتماد آلي مفعّل لهذه الطريقة حاليًا."}</li>
              </ul>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-red-500/8 p-3 text-[10px] leading-relaxed text-red-300/90">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                أرسل العملة الصحيحة على الشبكة الصحيحة فقط. إرسال USDT على شبكة خاطئة أو عملات أخرى للعنوان قد يؤدي لفقدان الأموال نهائيًا.
                الحد الأدنى: {selectedMinimum.toFixed(2)} دولار. {paymentInfo?.pay_amount ? `أرسل ${paymentInfo.pay_amount} ${paymentInfo.pay_currency || ""} إلى العنوان أعلاه.` : "وقت التأكيد: 1–10 دقائق حسب الشبكة."}
              </span>
            </div>
          </div>
        )}

        {submitted && selected && (
          <div className="glass-card flex items-center gap-3 p-4 text-sm text-green-400">
            <Clock size={18} />
            <span>
              طلبك مسجل — انتظر حتى تصل المعاملة للعنوان ثم تُعالج حسب حالة طريقة الدفع. تابع من صفحة{" "}
              <Link href="/orders" className="font-black text-[var(--color-gold)] underline">
                الطلبات
              </Link>
              .
            </span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
