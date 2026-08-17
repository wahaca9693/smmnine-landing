"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Search, RefreshCw, X, Link2, Package, Zap, Clock3, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

const statusColors: Record<string, string> = {
  Pending: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  "In progress": "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Processing: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Partial: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  Completed: "text-green-400 bg-green-400/10 border-green-400/30",
  Canceled: "text-red-400 bg-red-400/10 border-red-400/30",
  Cancelled: "text-red-400 bg-red-400/10 border-red-400/30",
  Fail: "text-red-500 bg-red-500/10 border-red-500/30",
  Failed: "text-red-500 bg-red-500/10 border-red-500/30",
  Refunded: "text-zinc-400 bg-zinc-400/10 border-zinc-400/30",
};

const statusAr: Record<string, string> = {
  Pending: "order.pending",
  "In progress": "order.inProgress",
  Processing: "order.inProgress",
  Partial: "order.partial",
  Completed: "order.completed",
  Canceled: "order.canceled",
  Cancelled: "order.canceled",
  Fail: "order.failed",
  Failed: "order.failed",
  Refunded: "order.refunded",
};

/** أيقونة حالة متحركة احترافية: نبض للمعلق، دوران للتنفيذ، فحص للمكتمل */
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "Pending":
      return (
        <span className="relative inline-flex">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/30" style={{ animationDuration: "2s" }} />
          <Clock3 className="relative text-amber-400" size={13} />
        </span>
      );
    case "In progress":
    case "Processing":
      return <RefreshCw className="text-blue-400 animate-spin" size={13} style={{ animationDuration: "1.2s" }} />;
    case "Completed":
      return <CheckCircle2 className="text-green-400" size={13} />;
    case "Canceled":
    case "Cancelled":
    case "Fail":
    case "Failed":
      return <XCircle className="text-red-400" size={13} />;
    case "Partial":
      return <AlertTriangle className="text-orange-400" size={13} />;
    default:
      return <Zap className="text-zinc-400" size={13} />;
  }
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?status=${filter}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const filteredOrders = orders.filter((o) =>
    String(o.service_name).toLowerCase().includes(search.toLowerCase()) ||
    String(o.smmnine_order_id).includes(search)
  );

  const filterButtons = [
    { id: "all", label: t("order.all") },
    { id: "Pending", label: t("order.pending") },
    { id: "In progress", label: t("order.inProgress") },
    { id: "Partial", label: t("order.partial") },
    { id: "Completed", label: t("order.completed") },
    { id: "Canceled", label: t("order.canceled") },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white">طلباتي</h1>
          <span className="rounded-full border border-[var(--color-gold)]/30 bg-[#2a1f0a] px-3 py-1 text-[11px] font-black text-[var(--color-gold-bright)]">
            {t("order.total")}: {orders.length}
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder={t("order.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-gold)]/20 bg-[#2a1f0a]/80 py-2.5 pr-10 pl-4 text-sm text-white outline-none focus:border-[var(--color-gold)]/50"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterButtons.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                filter === f.id
                  ? "gradient-luxe border-transparent text-black shadow-[0_0_16px_-4px_rgba(255,215,0,0.55)]"
                  : "border-[var(--color-gold)]/25 bg-[#2a1f0a]/60 text-zinc-400 hover:border-[var(--color-gold)]/50 hover:text-[var(--color-gold-pale)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-gold)]/20 border-t-[var(--color-gold)]" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-[var(--color-gold)]/20 bg-[#2a1f0a]/40 text-zinc-500">
            <Package size={40} className="mb-2 opacity-30" />
            <p>{t("order.noOrders")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="cursor-pointer rounded-2xl border border-[var(--color-gold)]/20 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-4 transition hover:border-[var(--color-gold)]/40 hover:shadow-[0_0_24px_-12px_rgba(255,215,0,0.4)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-black text-white">#{order.smmnine_order_id ?? order.id}</div>
                    <div className="mt-1 line-clamp-1 text-sm text-zinc-400">{order.service_name}</div>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusColors[order.status] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/30"}`}>
                    <StatusIcon status={order.status} />
                    {t(statusAr[order.status]) || order.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{order.quantity} {t("order.units")}</span>
                  <span className="font-black text-gradient-luxe">${Number(order.charge).toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/85 p-4 sm:items-center animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#33260c] via-[#241a08] to-[#171004] p-5 shadow-[0_0_50px_-16px_rgba(255,215,0,0.4)] animate-slideUp">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-gold)]/20 pb-3">
              <h3 className="text-lg font-black text-white">{t("order.details")}</h3>
              <button onClick={() => setSelectedOrder(null)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-gold)]/40 bg-[#2a1f0a] text-[var(--color-gold-pale)] transition hover:text-[var(--color-gold-bright)]">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3">
                <div className="text-xs text-zinc-500">{t("order.number")}</div>
                <div className="font-black text-white">#{selectedOrder.smmnine_order_id ?? selectedOrder.id}</div>
              </div>
              <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3">
                <div className="text-xs text-zinc-500">{t("common.status")}</div>
                <div className={`flex items-center gap-1 font-bold ${statusColors[selectedOrder.status] || "text-zinc-400"}`}>
                  <StatusIcon status={selectedOrder.status} />
                  {t(statusAr[selectedOrder.status]) || selectedOrder.status}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3">
                <div className="text-xs text-zinc-500">{t("order.quantity")}</div>
                <div className="font-black text-white">{selectedOrder.quantity}</div>
              </div>
              <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3">
                <div className="text-xs text-zinc-500">{t("order.amount")}</div>
                <div className="font-black text-gradient-luxe">${Number(selectedOrder.charge).toFixed(4)}</div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3">
              <div className="text-xs text-zinc-500">{t("order.service")}</div>
              <div className="text-sm text-white">{selectedOrder.service_name}</div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3">
              <Link2 size={14} className="shrink-0 text-[var(--color-gold)]" />
              <a href={selectedOrder.link} target="_blank" rel="noreferrer" dir="ltr" className="truncate text-xs text-[var(--color-gold-pale)] hover:text-[var(--color-gold-bright)]">
                {selectedOrder.link}
              </a>
            </div>

            <p className="mt-3 text-center text-[10px] text-zinc-500">اضغط على أي طلب لاحق لتحديث تفاصيله من الخادم</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
