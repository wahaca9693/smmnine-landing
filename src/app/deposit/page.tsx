"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Wallet, CreditCard, DollarSign, Check, ArrowLeft, ArrowRightLeft, Gift } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const iconMap: Record<string, any> = {
  dollar: DollarSign,
  bolt: Wallet,
  wallet: CreditCard,
  diamond: Wallet,
  coin: Wallet,
  star: Check,
  signal: Wallet,
  phone: Wallet,
};

export default function DepositPage() {
  const [methods, setMethods] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [asiacellConnected, setAsiacellConnected] = useState(false);

  useEffect(() => {
    fetch("/api/deposit")
      .then((res) => res.json())
      .then((data) => setMethods(data.methods || []));
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => setBalance(Number(data.user?.balance || 0)));
  }, []);

  useEffect(() => {
    if (selectedMethod?.icon === "asiacell") {
      fetch("/api/payments/asiacell")
        .then((res) => res.json())
        .then((data) => setAsiacellConnected(data.connected))
        .catch(() => setAsiacellConnected(false));
    }
  }, [selectedMethod]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod || !amount) return;
    setLoading(true);
    const res = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId: selectedMethod.id, amount, notes }),
    });
    const data = await res.json();
    setMessage(data.error || data.message);
    setLoading(false);
    if (!data.error) {
      setAmount("");
      setNotes("");
    }
  };

  const renderIcon = (m: any) => {
    if (m.icon === "asiacell") {
      return <Image src="/asiacell-logo.png" alt="Asiacell" width={56} height={56} className="h-14 w-14 object-contain" />;
    }
    const Icon = iconMap[m.icon] || Wallet;
    return <Icon size={28} />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-white">شحن الرصيد</h1>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <div className="text-sm text-zinc-500">رصيدك الحالي:</div>
          <div className="mt-1 text-3xl font-black text-[var(--color-primary)]">$ {balance.toFixed(4)}</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] p-4 text-white text-center">
          <h2 className="text-lg font-black">اختر طريقة الدفع 💳</h2>
        </div>

        <div className="space-y-3">
          {methods.map((m) => {
            const active = selectedMethod?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { setSelectedMethod(m); setMessage(""); }}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-right transition ${
                  active ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/30"
                }`}
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${m.icon === "asiacell" ? "bg-white" : "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white"}`}>
                  {renderIcon(m)}
                </span>
                <div className="flex-1">
                  <div className="font-bold text-white">{m.name}</div>
                  <div className="mt-1 text-sm text-zinc-500">{m.instructions}</div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedMethod?.icon === "asiacell" ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Image src="/asiacell-logo.png" alt="Asiacell" width={40} height={40} className="h-10 w-10 object-contain" />
              <h3 className="text-lg font-black text-white">الدفع عبر آسياسيل</h3>
            </div>
            {!asiacellConnected ? (
              <div className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-400">
                بوابة آسياسيل غير متصلة حالياً. تواصل مع الإدارة لتفعيلها.
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-400">اختر طريقة الإيداع:</p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/deposit/asiacell?method=transfer"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white"
                  >
                    <ArrowRightLeft size={18} /> تحويل
                  </Link>
                  <Link
                    href="/deposit/asiacell?method=card"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3.5 font-black text-white"
                  >
                    <Gift size={18} /> كرت
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : selectedMethod ? (
          <form onSubmit={submit} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-zinc-400">المبلغ</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-zinc-400">ملاحظات / رقم العملية</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            {message && (
              <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("فشل") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
            >
              {loading ? "جاري..." : "إرسال طلب الشحن"}
            </button>
          </form>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
