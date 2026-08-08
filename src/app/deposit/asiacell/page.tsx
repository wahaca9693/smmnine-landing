"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import Image from "next/image";
import { CreditCard, ArrowRightLeft, ArrowLeft, Smartphone, Gift, Check, Loader2, RefreshCw } from "lucide-react";

export default function AsiacellDepositPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const method = (searchParams.get("method") as "transfer" | "card") || "transfer";

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [transferOtp, setTransferOtp] = useState("");
  const [voucher, setVoucher] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [credited, setCredited] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMessage(data.error);
    } else {
      setSessionId(data.sessionId);
      setStep(2);
      setMessage(data.message);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !sessionId) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-otp", sessionId, otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMessage(data.error);
    } else if (data.success) {
      setStep(3);
      setMessage("");
    } else {
      setMessage(data.message || "فشل التحقق");
    }
  };

  const startTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountIQD = parseInt(transferAmount, 10);
    if (!amountIQD || amountIQD < 250) {
      setMessage("الحد الأدنى للتحويل 250 د.ع");
      return;
    }
    if (!sessionId) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "transfer", sessionId, amount: amountIQD }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMessage(data.error);
    } else if (data.success) {
      setStep(4);
      setMessage("");
    } else {
      setMessage(data.message || "فشل بدء التحويل");
    }
  };

  const confirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !transferOtp) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", sessionId, otp: transferOtp }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMessage(data.error);
    } else if (data.success) {
      setCredited(data.credited);
      setStep(5);
    } else {
      setMessage(data.message || "فشل تأكيد التحويل");
    }
  };

  const resendTransferOtp = async () => {
    if (!sessionId) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend", sessionId }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMessage(data.error);
    } else if (data.success) {
      setMessage("تم إعادة إرسال الرمز - تحقق من رسائلك");
    } else {
      setMessage(data.message || "فشل إعادة الإرسال");
    }
  };

  const topupCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucher || !sessionId) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/payments/asiacell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "topup", sessionId, voucher }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMessage(data.error);
    } else if (data.success) {
      setCredited(data.credited);
      setStep(5);
    } else {
      setMessage(data.message || "فشل شحن الكرت");
    }
  };

  const renderStepper = () => {
    const steps = method === "transfer" ? [1, 2, 3, 4] : [1, 2];
    return (
      <div className="flex items-center justify-between">
        {steps.map((s, idx) => (
          <div key={s} className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step > s ? "bg-green-500 text-white" : step >= s ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-zinc-500"}`}>
              {step > s ? <Check size={14} /> : s}
            </div>
            {idx !== steps.length - 1 && <div className={`h-1 w-6 ${step > s ? "bg-green-500" : "bg-[var(--color-surface)]"}`} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <button onClick={() => router.push("/deposit")} className="flex items-center gap-2 text-sm text-zinc-400">
          <ArrowLeft size={18} /> رجوع لطرق الدفع
        </button>

        <div className="rounded-3xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] p-6 text-white text-center">
          <div className="flex items-center justify-center gap-3">
            <Image src="/asiacell-logo.png" alt="Asiacell" width={40} height={40} className="h-10 w-10 object-contain" />
            <h1 className="text-2xl font-black">إيداع عبر آسياسيل</h1>
          </div>
          <p className="mt-2 text-sm opacity-90">{method === "transfer" ? "تحويل رصيد" : "شحن كرت"}</p>
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("فشل") || message.includes("غير") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {message}
          </div>
        )}

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
          {renderStepper()}

          {method === "card" ? (
            <>
              {step === 1 && (
                <form onSubmit={login} className="space-y-4">
                  <h3 className="font-black text-white">رقم آسياسيل الخاص بك</h3>
                  <p className="text-xs text-zinc-400">سنرسل رمز تحقق إلى رقمك أولاً.</p>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXXX"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><Smartphone size={18} /> إرسال OTP</>}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={verifyOtp} className="space-y-4">
                  <h3 className="font-black text-white">رمز التحقق</h3>
                  <p className="text-xs text-zinc-400">أدخل الرمز الذي وصلك على رقم {phone}</p>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="رمز OTP"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : "تحقق"}
                  </button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={topupCard} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-[var(--color-primary)]" size={24} />
                    <h3 className="font-black text-white">شحن عبر كرت آسياسيل</h3>
                  </div>
                  <p className="text-xs text-zinc-400">أدخل رقم كرت التعبئة وسيتم تحديد المبلغ تلقائياً وإضافته لحسابك.</p>
                  <input
                    type="text"
                    value={voucher}
                    onChange={(e) => setVoucher(e.target.value)}
                    placeholder="رقم كرت التعبئة"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><RefreshCw size={18} /> شحن الكرت</>}
                  </button>
                </form>
              )}

              {step === 5 && (
                <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
                  <Check size={48} className="mx-auto mb-3 text-green-400" />
                  <h3 className="text-xl font-black text-white">تم الشحن بنجاح</h3>
                  <p className="mt-2 text-green-400">تم إضافة {credited.toLocaleString()} رصيد لحسابك</p>
                  <button onClick={() => router.push("/services")} className="mt-4 w-full rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3 font-bold text-white">
                    تصفح الخدمات
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {step === 1 && (
                <form onSubmit={login} className="space-y-4">
                  <h3 className="font-black text-white">رقم آسياسيل الخاص بك</h3>
                  <p className="text-xs text-zinc-400">سنرسل رمز تحقق إلى رقمك أولاً.</p>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXXX"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><Smartphone size={18} /> إرسال OTP</>}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={verifyOtp} className="space-y-4">
                  <h3 className="font-black text-white">رمز التحقق</h3>
                  <p className="text-xs text-zinc-400">أدخل الرمز الذي وصلك على رقم {phone}</p>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="رمز OTP"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : "تحقق"}
                  </button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={startTransfer} className="space-y-4">
                  <h3 className="font-black text-white">اختر مبلغ التحويل</h3>
                  <p className="text-xs text-zinc-400">المبلغ سيتم تحويله من رقمك إلى رقم المتجر، ثم يُضاف لرصيدك.</p>
                  <div className="flex overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <span className="flex items-center justify-center bg-[var(--color-primary)]/10 px-4 font-black text-[var(--color-primary)]">IQD</span>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="1000"
                      className="flex-1 bg-transparent px-4 py-3 text-white outline-none"
                      required
                    />
                  </div>
                  {parseInt(transferAmount || "0", 10) > 0 && (
                    <div className="rounded-xl bg-[var(--color-primary)]/10 p-3 text-center">
                      <div className="text-sm text-zinc-400">سيتم إضافة لرصيدك:</div>
                      <div className="text-xl font-black text-[var(--color-primary)]">{parseInt(transferAmount, 10).toLocaleString()} رصيد</div>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><ArrowRightLeft size={18} /> إرسال رمز تأكيد التحويل</>}
                  </button>
                </form>
              )}

              {step === 4 && (
                <form onSubmit={confirmTransfer} className="space-y-4">
                  <h3 className="font-black text-white">تأكيد التحويل</h3>
                  <p className="text-xs text-zinc-400">أدخل رمز التأكيد الذي وصلك من آسياسيل لإتمام التحويل إلى رقم المتجر.</p>
                  <input
                    type="text"
                    value={transferOtp}
                    onChange={(e) => setTransferOtp(e.target.value)}
                    placeholder="رمز تأكيد التحويل"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : "تأكيد التحويل"}
                  </button>
                  <button
                    type="button"
                    onClick={resendTransferOtp}
                    disabled={loading}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 text-sm font-bold text-zinc-300 transition hover:border-[var(--color-primary)]"
                  >
                    إعادة إرسال رمز التأكيد
                  </button>
                </form>
              )}

              {step === 5 && (
                <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
                  <Check size={48} className="mx-auto mb-3 text-green-400" />
                  <h3 className="text-xl font-black text-white">تم التحويل بنجاح</h3>
                  <p className="mt-2 text-green-400">تم إضافة {credited.toLocaleString()} رصيد لحسابك</p>
                  <button onClick={() => router.push("/services")} className="mt-4 w-full rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3 font-bold text-white">
                    تصفح الخدمات
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
