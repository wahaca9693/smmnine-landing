"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { History, ArrowDownLeft, ArrowUpRight, ShoppingCart, AlertCircle, type LucideIcon } from "lucide-react";

type TransactionItem = {
  id: number;
  type: string;
  status: string;
  amount: number;
  description?: string | null;
  created_at: string;
};
type TransactionsResponse = { transactions?: TransactionItem[] };

const typeLabels: Record<string, string> = {
  deposit: "إيداع",
  order: "طلب",
  refund: "استرداد",
  admin_add: "إضافة رصيد",
  admin_subtract: "خصم رصيد",
};

const typeIcons: Record<string, LucideIcon> = {
  deposit: ArrowDownLeft,
  order: ShoppingCart,
  refund: ArrowUpRight,
  admin_add: ArrowDownLeft,
  admin_subtract: ArrowUpRight,
};

const statusColors: Record<string, string> = {
  completed: "text-green-400 bg-green-500/10",
  pending: "text-amber-400 bg-amber-500/10",
  failed: "text-red-400 bg-red-500/10",
};

const statusAr: Record<string, string> = {
  completed: "مكتمل",
  pending: "معلق",
  failed: "فاشل",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions")
      .then((res) => res.json())
      .then((data: TransactionsResponse) => {
        setTransactions(data.transactions || []);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <History className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">سجل المعاملات</h1>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] text-zinc-500">
            <AlertCircle size={48} className="mb-3 opacity-30" />
            <p>لا توجد معاملات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const Icon = typeIcons[tx.type] || History;
              return (
                <div key={tx.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
                        <Icon size={20} />
                      </span>
                      <div>
                        <div className="font-bold text-white">{typeLabels[tx.type] || tx.type}</div>
                        <div className="text-xs text-zinc-500">{new Date(tx.created_at).toLocaleString("ar-IQ")}</div>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusColors[tx.status] || "text-zinc-400 bg-zinc-500/10"}`}>
                      {statusAr[tx.status] || tx.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                    <span className="text-sm text-zinc-400">{tx.description || "—"}</span>
                    <span className={`font-black ${tx.type === "order" || tx.type === "admin_subtract" ? "text-red-400" : "text-green-400"}`}>
                      {tx.type === "order" || tx.type === "admin_subtract" ? "-" : "+"}${Number(tx.amount).toFixed(4)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
