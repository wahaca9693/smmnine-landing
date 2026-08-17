"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useLiveRefresh } from "../components/useLiveRefresh";
import Link from "next/link";
import { Wallet, Copy, Check, ArrowLeft, QrCode, Zap, ShieldCheck, Coins, Clock, AlertTriangle } from "lucide-react";

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
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [selected, setSelected] = useState<DepositMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [methodsRes, userRes] = await Promise.all([
        fetch("/api/deposit", { cache: "no-store" }),
        fetch("/api/user", { cache: "no-store" }),
      ]);
      const [methodsData, userData] = await Promise.all([methodsRes.json(), userRes.json()]);
      setMethods((methodsData.methods || []).filter((m: any) => ["usdt", "bnb", "btc"].includes(m.icon)));
      setBalance(Number(userData.user?.balance || 0));
    } catch {
      // Preserve the last known wallet state if the refresh is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshData]);

  useLiveRefresh(refreshData, { intervalMs: 30000 });

  const cfg = selected ? (JSON.parse(selected.config || "{}") as { coin?: string; network?: string; address?: string }) : null;

  const copyAddress = async () => {
    if (!cfg?.address) return;
    await navigator.clipboard.writeText(cfg.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !amount) return;
    const num = Number(amount);
    if (isNaN(num) || num < selected.min_amount) {
      setMessage({ text: `الحد الأدنى للشحن ${selected.min_amount} ${selected.name_en}`, error: true });
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
      setMessage({ text: Number(selected.is_auto) === 1 ? "تم إنشاء طلب الشحن — سيُحدّث الرصيد بعد تأكيد بوابة الدفع" : "تم تسجيل طلب الشحن — سيبقى معلقًا حتى مراجعة الإيداع من الإدارة", error: false });
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
          <Link href="/" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-zinc-300">
            <ArrowLeft size={14} className="inline ml-1" />رجوع
          </Link>
        </div>

        <div className="glass-card flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Wallet size={20} className="text-[var(--color-gold)]" />
            <span className="text-sm text-zinc-400">رصيدك الحالي</span>
          </div>
          <span className="text-lg font-black text-gradient-luxe">${balance.toFixed(4)}</span>
        </div>

        {/* اختيار العملة */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
            <Zap size={16} className="text-[var(--color-gold)]" /> اختر العملة والشبكة
          </div>
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelected(m); setSubmitted(false); setMessage(null); }}
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
                  من {m.min_amount} {coinMeta[m.icon]?.label || ""}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selected && cfg?.address && (
          <div className="glass-card space-y-4 p-5 animate-slideUp">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <QrCode size={16} className="text-[var(--color-gold)]" /> عنوان الإيداع — {selected.name}
            </div>

            <div className="relative mx-auto w-fit overflow-hidden rounded-2xl bg-white p-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cfg.address)}`}
                alt="QR"
                width={200}
                height={200}
                className="h-44 w-44"
              />
            </div>

            <div className="rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 p-3">
              <div className="mb-1 text-[10px] font-black text-[var(--color-gold-pale)]">العنوان (انسخه بدقة كاملة)</div>
              <div className="break-all font-mono text-xs leading-relaxed text-white">{cfg.address}</div>
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
                  placeholder={`الحد الأدنى ${selected.min_amount} ${selected.name_en}`}
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
                الحد الأدنى: {selected.min_amount} {selected.name_en}. وقت التأكيد: 1–10 دقائق حسب الشبكة.
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
