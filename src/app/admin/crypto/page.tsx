"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { Coins, ArrowLeft, CheckCircle2, XCircle, Wallet, Hourglass, BadgeCheck } from "lucide-react";

interface CryptoDeposit {
  id: number;
  user_id: number;
  username: string;
  coin: string;
  network: string;
  amount: string;
  address: string;
  status: string;
  note: string | null;
  created_at: string;
}

export default function AdminCryptoPage() {
  const [deposits, setDeposits] = useState<CryptoDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crypto-deposits");
      const data = await res.json();
      if (data.deposits) setDeposits(data.deposits);
    } catch {
      /* لا شيء */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const act = async (id: number, action: "approve" | "reject") => {
    const res = await fetch("/api/admin/crypto-deposits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    setMessage(data.error || data.message || null);
    refresh();
  };

  const pending = deposits.filter((d) => d.status === "pending").length;
  const completed = deposits.filter((d) => d.status === "completed").length;

  const coinColor: Record<string, string> = { usdt: "#26a17b", bnb: "#f0b90b", btc: "#f7931a" };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-deep)] shadow-lg shadow-[var(--color-gold)]/20">
              <Coins size={24} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">إيداعات الكريبتو</h1>
              <p className="text-xs text-zinc-500">مراقبة الشحن التلقائي USDT / BNB / BTC</p>
            </div>
          </div>
          <Link href="/admin" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-zinc-300">
            <ArrowLeft size={14} className="inline ml-1" />لوحة الأدمن
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Hourglass size={13} className="text-yellow-400" /> معلقة
            </div>
            <div className="mt-1 text-2xl font-black text-white">{pending}</div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <BadgeCheck size={13} className="text-green-400" /> مكتملة
            </div>
            <div className="mt-1 text-2xl font-black text-gradient-luxe">{completed}</div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Coins size={13} className="text-[var(--color-gold)]" /> الإجمالي
            </div>
            <div className="mt-1 text-2xl font-black text-white">{deposits.length}</div>
          </div>
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-xs font-bold ${message.includes("تم") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}

        <div className="glass-card divide-y divide-[var(--color-border)]/50 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-sm text-zinc-500">جاري التحميل...</div>
          ) : deposits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <Wallet size={28} className="text-zinc-600" />
              <p className="text-sm text-zinc-500">لا توجد إيداعات كريبتو حتى الآن</p>
            </div>
          ) : (
            deposits.map((d) => (
              <div key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-black text-white"
                        style={{ backgroundColor: coinColor[d.coin] || "#a1a1aa" }}
                      >
                        {d.coin.toUpperCase()}
                      </span>
                      <span className="font-bold text-white">{d.username || `مستخدم #${d.user_id}`}</span>
                      {d.status === "pending" ? (
                        <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[9px] font-black text-yellow-400">معلقة</span>
                      ) : d.status === "completed" ? (
                        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[9px] font-black text-green-400">مشحونة</span>
                      ) : (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-black text-red-400">مرفوضة</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-xs text-zinc-400">
                      <span className="font-black text-white">${Number(d.amount).toFixed(2)}</span>
                      <span className="mx-1">·</span>
                      <span className="font-mono text-[10px] text-zinc-500">{d.network}</span>
                      <span className="mx-1">·</span>
                      <span className="font-mono text-[10px] text-zinc-500">{d.address?.slice(0, 8)}...{d.address?.slice(-6)}</span>
                    </div>
                  </div>
                  {d.status === "pending" && (
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        onClick={() => act(d.id, "approve")}
                        className="flex items-center gap-1 rounded-lg bg-green-500/15 px-2.5 py-1.5 text-[10px] font-black text-green-400"
                      >
                        <CheckCircle2 size={11} /> شحن الرصيد
                      </button>
                      <button
                        onClick={() => act(d.id, "reject")}
                        className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[10px] font-black text-red-400"
                      >
                        <XCircle size={11} /> رفض
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
