"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "../../components/DashboardLayout";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  CreditCard,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Ticket,
  Wallet,
  Zap,
} from "lucide-react";

type Mode = "transfer" | "card";
type GatewayStatus = { connected?: boolean; admin_connected?: boolean; exchange_rate?: number };

type GatewayResponse = {
  success?: boolean;
  sessionId?: string;
  credited?: number;
  amountIQD?: number;
  feeIQD?: number;
  totalIQD?: number;
  exchangeRate?: number;
  message?: string;
  error?: string;
};

const SESSION_STORAGE_KEY = "smmnine-asiacell-session";
const TRANSFER_FEE_IQD = 500;

function normalizePhone(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, 11);
}

function isErrorText(text: string) {
  return /فشل|خطأ|غير|تعذر|منتهية|مطلوب|رد غير|غير صحيح/i.test(text);
}

export default function AsiacellDepositPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMode: Mode = searchParams.get("method") === "card" ? "card" : "transfer";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [transferOtp, setTransferOtp] = useState("");
  const [voucher, setVoucher] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [credited, setCredited] = useState(0);
  const [creditedIqd, setCreditedIqd] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1666);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({});

  const amount = Number.parseInt(transferAmount || "0", 10);
  const dollarAmount = useMemo(() => {
    if (!amount || !exchangeRate || exchangeRate <= 0) return "0.00";
    return (amount / exchangeRate).toFixed(2);
  }, [amount, exchangeRate]);
  const totalTransferIQD = amount > 0 ? amount + TRANSFER_FEE_IQD : TRANSFER_FEE_IQD;
  const totalTransferDollarAmount = useMemo(() => {
    if (!totalTransferIQD || !exchangeRate || exchangeRate <= 0) return "0.00";
    return (totalTransferIQD / exchangeRate).toFixed(2);
  }, [totalTransferIQD, exchangeRate]);

  const persistFlow = (nextStep: number, nextMode = mode, nextSessionId = sessionId) => {
    if (!nextSessionId) return;
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ sessionId: nextSessionId, phone, mode: nextMode, step: nextStep, transferAmount })
    );
  };

  const clearFlow = () => {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionId("");
  };

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const restoreTimer = window.setTimeout(() => {
      // وضع البطاقة مستقل تمامًا عن جلسة الهاتف؛ لا نستعيد جلسة تحويل محفوظة هنا.
      if (initialMode === "card") {
        setMode("card");
        setStep(1);
        setSessionId("");
        setPhone("");
        setOtp("");
        setTransferOtp("");
        setTransferAmount("");
      } else if (stored) {
        try {
          const saved = JSON.parse(stored) as { sessionId?: string; phone?: string; mode?: Mode; step?: number; transferAmount?: string };
          if (saved.sessionId && saved.step && saved.step >= 2 && saved.step <= 4) {
            setSessionId(saved.sessionId);
            setPhone(saved.phone || "");
            setMode("transfer");
            setStep(saved.step);
            setTransferAmount(saved.transferAmount || "");
          }
        } catch {
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }, 0);

    fetch("/api/payments/asiacell", { cache: "no-store", credentials: "include" })
      .then((response) => response.json())
      .then((data: GatewayStatus) => {
        setGatewayStatus(data);
        if (data.exchange_rate) setExchangeRate(Number(data.exchange_rate));
      })
      .catch(() => setGatewayStatus({}));

    return () => window.clearTimeout(restoreTimer);
  }, [initialMode]);

  const callGateway = async (action: string, payload: Record<string, string | number>) => {
    const response = await fetch("/api/payments/asiacell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, ...payload }),
    });
    const data = (await response.json()) as GatewayResponse;
    if (!response.ok) throw new Error(data.error || data.message || "تعذر تنفيذ العملية");
    return data;
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!/^07\d{9}$/.test(normalized)) {
      setMessage("أدخل رقم آسياسيل بصيغة 07XXXXXXXXX");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const data = await callGateway("login", { phone: normalized });
      if (!data.success || !data.sessionId) throw new Error(data.error || data.message || "لم يتم إرسال رمز التحقق");
      setPhone(normalized);
      setSessionId(data.sessionId);
      setStep(2);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ sessionId: data.sessionId, phone: normalized, mode, step: 2, transferAmount }));
      setMessage(data.message || "تم إرسال رمز التحقق إلى هاتفك");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر الاتصال بآسياسيل");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otp.trim() || !sessionId) {
      setMessage("أدخل رمز التحقق المرسل إلى هاتفك");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const data = await callGateway("verify-otp", { sessionId, otp: otp.trim() });
      if (!data.success) throw new Error(data.error || data.message || "رمز التحقق غير صحيح");
      setOtp("");
      setStep(3);
      persistFlow(3);
      setMessage("تم التحقق بنجاح. أكمل عملية الشحن الآن");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر التحقق");
    } finally {
      setLoading(false);
    }
  };

  const startTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isInteger(amount) || amount < 250) {
      setMessage("الحد الأدنى للتحويل 250 د.ع ويجب أن يكون المبلغ رقمًا صحيحًا");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const data = await callGateway("transfer", { sessionId, amount });
      if (!data.success) throw new Error(data.error || data.message || "فشل بدء التحويل");
      setStep(4);
      persistFlow(4);
      setMessage(data.message || `تم بدء التحويل بقيمة ${totalTransferIQD.toLocaleString("ar-IQ")} د.ع شامل رسم التحويل. أدخل رمز التأكيد الذي وصلك من آسياسيل`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر بدء التحويل");
    } finally {
      setLoading(false);
    }
  };

  const confirmTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferOtp.trim()) {
      setMessage("أدخل رمز تأكيد التحويل");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const data = await callGateway("confirm", { sessionId, otp: transferOtp.trim() });
      if (!data.success) throw new Error(data.error || data.message || "فشل تأكيد التحويل");
      setCredited(Number(data.credited || 0));
      setCreditedIqd(Number(data.amountIQD || amount));
      if (data.exchangeRate) setExchangeRate(Number(data.exchangeRate));
      setTransferOtp("");
      setStep(5);
      clearFlow();
      setMessage(data.message || "تم التحويل بنجاح وتحديث رصيدك");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تأكيد التحويل");
    } finally {
      setLoading(false);
    }
  };

  const topupCard = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedVoucher = voucher.replace(/[^0-9]/g, "").slice(0, 16);
    if (!/^\d{14,16}$/.test(normalizedVoucher)) {
      setMessage("أدخل رقم بطاقة آسياسيل المكوّن من 14 إلى 16 رقمًا");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const payload: Record<string, string> = { voucher: normalizedVoucher };
      if (sessionId) payload.sessionId = sessionId;
      const data = await callGateway("topup", payload);
      if (!data.success) throw new Error(data.error || data.message || "فشل شحن الكرت");
      setCredited(Number(data.credited || 0));
      setCreditedIqd(Number(data.amountIQD || 0));
      if (data.exchangeRate) setExchangeRate(Number(data.exchangeRate));
      setStep(5);
      clearFlow();
      setMessage(data.message || "تم شحن الكرت وتحديث رصيدك");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر شحن الكرت");
    } finally {
      setLoading(false);
    }
  };

  const resendTransferOtp = async () => {
    if (!sessionId) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await callGateway("resend", { sessionId });
      if (!data.success) throw new Error(data.error || data.message || "فشل إعادة الإرسال");
      setMessage(data.message || "تم إعادة إرسال رمز التأكيد");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إعادة الإرسال");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    clearFlow();
    setStep(1);
    setPhone("");
    setOtp("");
    setTransferOtp("");
    setVoucher("");
    setTransferAmount("");
    setCredited(0);
    setCreditedIqd(0);
    setMessage("");
  };

  const switchMode = (nextMode: Mode) => {
    if (step > 1 && step < 5) return;
    resetFlow();
    setMode(nextMode);
    router.replace(`/deposit/asiacell?method=${nextMode}`);
  };

  const renderStepper = () => {
    const labels = mode === "transfer" ? ["الرقم", "التحقق", "المبلغ", "التأكيد"] : ["القسيمة", "التحقق", "الاعتماد"];
    const visibleStep = mode === "card" ? (step === 5 ? 3 : loading ? 2 : 1) : step === 5 ? labels.length : Math.min(step, labels.length);
    return <div className="flex items-start gap-1 px-1" dir="rtl">{labels.map((label, index) => { const itemStep = index + 1; const complete = visibleStep > itemStep; const active = visibleStep === itemStep; return <div key={label} className="flex min-w-0 flex-1 items-start"><div className="flex min-w-0 flex-1 flex-col items-center gap-1"><div className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-black transition ${complete ? "border-emerald-400 bg-emerald-500 text-white" : active ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-black shadow-[0_0_18px_-4px_rgba(212,175,55,0.9)]" : "border-[var(--color-border)] bg-[var(--color-surface)] text-zinc-500"}`}>{complete ? <Check size={15} strokeWidth={3} /> : itemStep}</div><span className={`truncate text-[9px] font-bold ${active ? "text-[var(--color-primary)]" : "text-zinc-500"}`}>{label}</span></div>{index < labels.length - 1 && <span className={`mt-[18px] h-0.5 flex-1 rounded-full ${complete ? "bg-emerald-500/70" : "bg-[var(--color-border)]"}`} />}</div>; })}</div>;
  };

  const inputClass = "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)]";
  const actionClass = "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3 text-sm font-black text-black shadow-lg shadow-[var(--color-primary)]/10 disabled:cursor-not-allowed disabled:opacity-50";
  const gatewayAvailable = Boolean(gatewayStatus.connected || gatewayStatus.admin_connected);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-4 pb-8">
        <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] shadow-lg shadow-[var(--color-primary)]/15"><Image src="/asiacell-logo.png" alt="Asiacell" width={30} height={30} className="h-7 w-7 object-contain" /></div><div className="min-w-0"><h1 className="truncate text-xl font-black text-white sm:text-2xl">شحن عبر آسياسيل</h1><p className="truncate text-[10px] text-zinc-500 sm:text-xs">تحويل مباشر أو قسيمة شحن من رقمك العراقي</p></div></div><Link href="/deposit" className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[10px] font-bold text-zinc-300 sm:text-xs"><ArrowLeft size={13} />طرق الشحن</Link></div>

        {!gatewayAvailable && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200"><div className="mb-1 flex items-center gap-2 font-black"><Clock3 size={14} />البوابة قيد التفعيل</div><p className="text-amber-100/70">لا يمكن بدء الشحن حتى يكتمل ربط حساب المتجر بآسياسيل من الإعدادات.</p></div>}

        <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-black/20 p-4 shadow-2xl sm:p-6"><div className="mb-4 flex items-center gap-2"><ShieldCheck size={17} className="text-[var(--color-primary)]" /><p className="text-xs font-bold text-zinc-300">{mode === "transfer" ? "تحويل آمن عبر OTP، ولا يُضاف الرصيد قبل نجاح العملية" : "تحقق مباشر من القسيمة عبر آسياسيل، ولا يُضاف الرصيد قبل نجاح العملية"}</p></div><div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border)] bg-black/15 p-1.5"><button type="button" onClick={() => switchMode("transfer")} disabled={step > 1 && step < 5} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-black transition disabled:cursor-not-allowed ${mode === "transfer" ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-black" : "text-zinc-400 hover:text-white"}`}><ArrowRightLeft size={14} />تحويل</button><button type="button" onClick={() => switchMode("card")} disabled={step > 1 && step < 5} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-black transition disabled:cursor-not-allowed ${mode === "card" ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-black" : "text-zinc-400 hover:text-white"}`}><Ticket size={14} />كرت</button></div></div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xl sm:p-6">{renderStepper()}
          {message && <div className={`mt-4 rounded-xl p-3 text-center text-xs font-bold ${isErrorText(message) ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{message}</div>}

          {step === 1 && mode === "transfer" && <form onSubmit={login} className="mt-5 space-y-4"><div><h2 className="text-lg font-black text-white">رقم آسياسيل الخاص بك</h2><p className="mt-1 text-xs text-zinc-500">سنرسل رمز تحقق لمرة واحدة إلى رقمك قبل أي عملية شحن.</p></div><label className="block"><span className="mb-1.5 block text-xs font-bold text-zinc-400">رقم الهاتف</span><div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3"><span className="font-mono text-xs font-black text-[var(--color-primary)]">+964</span><input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={(event) => setPhone(normalizePhone(event.target.value))} placeholder="07XXXXXXXXX" className="w-full bg-transparent py-3 text-left font-mono text-sm text-white outline-none placeholder:text-zinc-700" dir="ltr" /></div></label><button type="submit" disabled={loading || !gatewayAvailable} className={actionClass}>{loading ? <Loader2 size={17} className="animate-spin" /> : <Smartphone size={17} />}إرسال رمز التحقق</button></form>}

          {step === 2 && <form onSubmit={verifyOtp} className="mt-5 space-y-4"><div><h2 className="text-lg font-black text-white">تحقق من رقم الهاتف</h2><p className="mt-1 text-xs text-zinc-500">أدخل الرمز الذي وصلك على الرقم المنتهي بـ {phone.slice(-4)}.</p></div><input type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} placeholder="رمز OTP" className={`${inputClass} text-center font-mono text-lg tracking-[0.45em]`} dir="ltr" /><button type="submit" disabled={loading} className={actionClass}>{loading ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}تأكيد الرقم</button><div className="flex items-center justify-between text-[10px]"><button type="button" onClick={resetFlow} className="text-zinc-500 hover:text-white">تغيير الرقم</button><button type="button" onClick={async () => { setLoading(true); setMessage(""); try { const data = await callGateway("resend", { sessionId }); setMessage(data.message || "تم إعادة إرسال الرمز"); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر إعادة الإرسال"); } finally { setLoading(false); } }} disabled={loading} className="flex items-center gap-1 text-[var(--color-primary)] disabled:opacity-50"><RefreshCw size={12} />إعادة إرسال الرمز</button></div></form>}

          {step === 1 && mode === "card" && <form onSubmit={topupCard} className="mt-5 space-y-4"><div><h2 className="flex items-center gap-2 text-lg font-black text-white"><CreditCard size={19} className="text-[var(--color-primary)]" />بطاقة الشحن</h2><p className="mt-1 text-xs text-zinc-500">أدخل رقم البطاقة المكوّن من 14 إلى 16 رقمًا. تتحقق آسياسيل من البطاقة وتحدد قيمتها تلقائيًا دون رسوم من المنصة.</p></div><div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-3 text-center text-[10px] leading-relaxed text-zinc-400">لا نضيف رسوم استقطاع من المنصة. بعد نجاح التحقق يُحوّل مبلغ البطاقة من الدينار العراقي إلى رصيدك بالدولار حسب سعر الصرف الحالي.</div><input type="text" inputMode="numeric" autoComplete="off" maxLength={16} value={voucher} onChange={(event) => setVoucher(event.target.value.replace(/[^0-9]/g, "").slice(0, 16))} placeholder="0000 0000 0000 0000" className={`${inputClass} text-center font-mono tracking-[0.22em]`} dir="ltr" /><div className="flex items-center justify-between text-[10px] text-zinc-600"><span>14–16 رقمًا</span><span>{voucher.length}/16</span></div><button type="submit" disabled={loading || !gatewayAvailable} className={actionClass}>{loading ? <Loader2 size={17} className="animate-spin" /> : <Zap size={17} />}التحقق وشحن البطاقة</button></form>}

          {step === 3 && mode === "transfer" && <form onSubmit={startTransfer} className="mt-5 space-y-4"><div><h2 className="flex items-center gap-2 text-lg font-black text-white"><Wallet size={19} className="text-[var(--color-primary)]" />حدد مبلغ التحويل</h2><p className="mt-1 text-xs text-zinc-500">سيتم تحويل المبلغ من رقمك إلى حساب المتجر بعد تأكيدك. يضاف رسم ثابت قدره 500 د.ع على التحويل فقط.</p></div><div className="flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"><span className="flex items-center bg-[var(--color-primary)]/10 px-3 text-xs font-black text-[var(--color-primary)]">IQD</span><input type="number" inputMode="numeric" min="250" step="1" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} placeholder="5000" className="w-full bg-transparent px-3 py-3 text-center font-mono text-lg text-white outline-none" dir="ltr" /></div>{amount > 0 && <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-3 text-xs"><div><span className="block text-zinc-500">سيُضاف إلى رصيدك</span><strong className="mt-1 block text-base text-[var(--color-primary)]">{amount.toLocaleString("ar-IQ")} د.ع</strong><span className="text-[10px] text-zinc-500">≈ ${dollarAmount}</span></div><div className="text-left"><span className="block text-zinc-500">رسم التحويل</span><strong className="mt-1 block text-base text-amber-300">{TRANSFER_FEE_IQD.toLocaleString("ar-IQ")} د.ع</strong><span className="text-[10px] text-zinc-500">بدون رسوم للقسيمة</span></div><div className="col-span-2 flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-xs"><span className="text-zinc-500">الإجمالي المطلوب من الهاتف</span><strong className="text-white">{totalTransferIQD.toLocaleString("ar-IQ")} د.ع ≈ ${totalTransferDollarAmount}</strong></div><div className="col-span-2 text-[10px] text-zinc-600">سعر الصرف: 1$ = {exchangeRate.toLocaleString("ar-IQ")} د.ع · الحد الأدنى للمبلغ الصافي 250 د.ع</div></div>}<button type="submit" disabled={loading} className={actionClass}>{loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRightLeft size={17} />}بدء التحويل وإرسال رمز التأكيد</button></form>}

          {step === 4 && <form onSubmit={confirmTransfer} className="mt-5 space-y-4"><div><h2 className="text-lg font-black text-white">تأكيد التحويل</h2><p className="mt-1 text-xs text-zinc-500">أدخل الرمز الثاني الذي وصلك من آسياسيل لإتمام التحويل.</p></div><div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-center"><div className="grid grid-cols-3 gap-2 text-[10px]"><div><span className="block text-zinc-500">الصافي</span><strong className="mt-1 block text-sm text-[var(--color-primary)]">{amount.toLocaleString("ar-IQ")}</strong><span className="text-zinc-500">د.ع</span></div><div><span className="block text-zinc-500">الرسم</span><strong className="mt-1 block text-sm text-amber-300">{TRANSFER_FEE_IQD.toLocaleString("ar-IQ")}</strong><span className="text-zinc-500">د.ع</span></div><div><span className="block text-zinc-500">الإجمالي</span><strong className="mt-1 block text-sm text-white">{totalTransferIQD.toLocaleString("ar-IQ")}</strong><span className="text-zinc-500">د.ع</span></div></div><p className="mt-3 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-primary)]">سيُضاف إلى رصيدك ≈ ${dollarAmount} بعد نجاح التحويل</p></div><input type="text" inputMode="numeric" autoComplete="one-time-code" value={transferOtp} onChange={(event) => setTransferOtp(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} placeholder="رمز تأكيد التحويل" className={`${inputClass} text-center font-mono text-lg tracking-[0.45em]`} dir="ltr" /><button type="submit" disabled={loading} className={actionClass}>{loading ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}تأكيد التحويل وإضافة الرصيد</button><button type="button" onClick={resendTransferOtp} disabled={loading} className="flex w-full items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 text-xs font-bold text-zinc-300 disabled:opacity-50"><RefreshCw size={13} />إعادة إرسال رمز التأكيد</button></form>}

          {step === 5 && <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center"><Check size={46} className="mx-auto mb-3 text-emerald-300" /><h2 className="text-xl font-black text-white">تم الشحن بنجاح</h2><p className="mt-2 text-sm font-bold text-emerald-300">تمت إضافة {credited.toFixed(4)} دولار إلى محفظتك</p>{creditedIqd > 0 && <p className="mt-1 text-xs text-zinc-400">قيمة العملية: {creditedIqd.toLocaleString("ar-IQ")} د.ع · سعر الصرف: {exchangeRate.toLocaleString("ar-IQ")} د.ع/دولار</p>}<Link href="/services" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3 text-sm font-black text-black">تصفح الخدمات <ArrowLeft size={16} /></Link><button type="button" onClick={resetFlow} className="mt-3 text-xs text-zinc-500 hover:text-white">تنفيذ شحن جديد</button></div>}
        </div>

        <div className="grid grid-cols-3 gap-2"><div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center"><Smartphone size={16} className="mx-auto mb-1 text-[var(--color-primary)]" /><div className="text-[10px] font-black text-white">{mode === "transfer" ? "تحقق الرقم" : "تحقق القسيمة"}</div><div className="mt-1 text-[9px] text-zinc-600">{mode === "transfer" ? "OTP آمن" : "فحص مباشر"}</div></div><div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center"><ShieldCheck size={16} className="mx-auto mb-1 text-[var(--color-primary)]" /><div className="text-[10px] font-black text-white">حماية مزدوجة</div><div className="mt-1 text-[9px] text-zinc-600">لا اعتماد قبل النجاح</div></div><div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center"><Wallet size={16} className="mx-auto mb-1 text-[var(--color-primary)]" /><div className="text-[10px] font-black text-white">شحن فوري</div><div className="mt-1 text-[9px] text-zinc-600">بعد التأكيد</div></div></div>
      </div>
    </DashboardLayout>
  );
}
