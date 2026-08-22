"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Search, RefreshCw, X, Link2, Package, Zap, Clock3, CheckCircle2, XCircle, AlertTriangle, Eye, Ban, CircleDollarSign } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import { useLiveRefresh } from "../components/useLiveRefresh";

type OrderItem = Record<string, unknown> & {
  id: number;
  status?: string | null;
  status_key?: string | null;
  service_name?: string | null;
  smmnine_order_id?: number | string | null;
  quantity?: number | string | null;
  charge?: number | string | null;
  remains?: number | string | null;
  can_cancel?: boolean;
  refunded_at?: string | null;
  link?: string | null;
  updated_at?: string | null;
};
type OrderPatch = Partial<OrderItem> & { id?: number };

const statusColors: Record<string, string> = {
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  reviewing: "text-violet-300 bg-violet-400/10 border-violet-400/30",
  in_progress: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  processing: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  partial: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  completed: "text-green-400 bg-green-400/10 border-green-400/30",
  canceled: "text-red-400 bg-red-400/10 border-red-400/30",
  failed: "text-red-500 bg-red-500/10 border-red-500/30",
  refunded: "text-zinc-400 bg-zinc-400/10 border-zinc-400/30",
  stopped: "text-rose-300 bg-rose-400/10 border-rose-400/30",
  paused: "text-yellow-300 bg-yellow-400/10 border-yellow-400/30",
};

const statusTranslationKeys: Record<string, string> = {
  pending: "order.pending",
  reviewing: "order.reviewing",
  processing: "order.inProgress",
  in_progress: "order.inProgress",
  partial: "order.partial",
  completed: "order.completed",
  canceled: "order.canceled",
  failed: "order.failed",
  refunded: "order.refunded",
  stopped: "order.stopped",
  paused: "order.paused",
};

function statusKey(status: unknown): string {
  const raw = String(status || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (["in progress", "inprogress", "running", "processing", "working"].includes(raw)) return raw === "processing" || raw === "working" ? "processing" : "in_progress";
  if (["pending", "queued", "waiting"].includes(raw)) return "pending";
  if (["reviewing", "under review"].includes(raw)) return "reviewing";
  if (["partial", "partially completed"].includes(raw)) return "partial";
  if (["completed", "complete", "done", "success"].includes(raw)) return "completed";
  if (["canceled", "cancelled", "cancel"].includes(raw)) return "canceled";
  if (["failed", "fail", "error"].includes(raw)) return "failed";
  if (["refunded", "refund"].includes(raw)) return "refunded";
  if (["stopped", "stop"].includes(raw)) return "stopped";
  if (["paused", "pause"].includes(raw)) return "paused";
  return raw.replace(/\s+/g, "_");
}

function statusLabel(t: (key: string) => string, order: OrderItem) {
  const key = order.status_key || statusKey(order.status);
  return t(statusTranslationKeys[key] || "order.reviewing");
}

function StatusIcon({ status }: { status: string }) {
  switch (statusKey(status)) {
    case "pending":
      return <span className="relative inline-flex"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/30" style={{ animationDuration: "2s" }} /><Clock3 className="relative text-amber-400" size={13} /></span>;
    case "in_progress":
    case "processing":
      return <RefreshCw className="animate-spin text-blue-400" size={13} style={{ animationDuration: "1.2s" }} />;
    case "completed":
      return <CheckCircle2 className="text-green-400" size={13} />;
    case "canceled":
    case "failed":
      return <XCircle className="text-red-400" size={13} />;
    case "partial":
      return <AlertTriangle className="text-orange-400" size={13} />;
    case "reviewing":
    case "stopped":
    case "paused":
      return <Clock3 className="text-violet-300" size={13} />;
    default:
      return <Zap className="text-zinc-400" size={13} />;
  }
}

function Progress({ order, t }: { order: OrderItem; t: (key: string) => string }) {
  const total = Number(order.quantity);
  const remaining = order.remains === null || order.remains === undefined ? null : Number(order.remains);
  if (!Number.isFinite(total) || total <= 0 || remaining === null || !Number.isFinite(remaining)) return null;
  const completed = Math.max(0, Math.min(total, total - remaining));
  const percentage = Math.round((completed / total) * 100);
  return (
    <div className="mt-3 rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-zinc-500">{t("order.progress")}</span>
        <span className="font-black text-[var(--color-gold-bright)]">{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)] transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/orders?status=${filter}`, { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {}
    if (showLoading) setLoading(false);
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchOrders(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOrders]);

  const mergeOrder = (patch: OrderPatch) => {
    setSelectedOrder((current) => current ? { ...current, ...patch } : current);
    setOrders((current) => current.map((item) => item.id === patch.id || item.id === selectedOrder?.id ? { ...item, ...patch } : item));
  };

  const refreshSelectedOrder = async () => {
    if (!selectedOrder || refreshing) return;
    setRefreshing(true);
    setModalMessage("");
    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrder.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحديث الطلب");
      mergeOrder({ ...data, id: selectedOrder.id, updated_at: new Date().toISOString() });
    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : "تعذر تحديث الطلب");
    } finally {
      setRefreshing(false);
    }
  };

  const cancelSelectedOrder = async () => {
    if (!selectedOrder || canceling) return;
    if (!window.confirm(t("order.cancelConfirm"))) return;
    setCanceling(true);
    setModalMessage("");
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrder.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("order.cancelNoRefund"));
      mergeOrder({ status: "Canceled", status_key: "canceled", refunded_at: new Date().toISOString() });
      setModalMessage(t("order.cancelSuccess"));
      await fetchOrders();
    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : t("order.cancelNoRefund"));
    } finally {
      setCanceling(false);
    }
  };

  useLiveRefresh(() => {
    if (selectedOrder) return refreshSelectedOrder();
    return fetchOrders(false);
  }, { intervalMs: 30000 });

  const filteredOrders = orders.filter((o) => String(o.service_name || "").toLowerCase().includes(search.toLowerCase()) || String(o.smmnine_order_id || o.id).includes(search));
  const filterButtons = [
    { id: "all", label: t("order.all") },
    { id: "Pending", label: t("order.pending") },
    { id: "In progress", label: t("order.inProgress") },
    { id: "Partial", label: t("order.partial") },
    { id: "Completed", label: t("order.completed") },
    { id: "Canceled", label: t("order.canceled") },
  ];
  const selectedStatusKey = selectedOrder ? (selectedOrder.status_key || statusKey(selectedOrder.status)) : "unknown";
  const canCancel = Boolean(selectedOrder && (selectedOrder.can_cancel ?? ["pending", "reviewing", "stopped", "paused"].includes(selectedStatusKey)) && !selectedOrder.refunded_at);
  const total = Number(selectedOrder?.quantity || 0);
  const remaining = selectedOrder?.remains === null || selectedOrder?.remains === undefined ? null : Number(selectedOrder.remains);
  const completed = remaining !== null && Number.isFinite(remaining) ? Math.max(0, total - remaining) : null;

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-white">{t("sidebar.orders")}</h1>
          <span className="rounded-full border border-[var(--color-gold)]/30 bg-[#2a1f0a] px-3 py-1 text-[11px] font-black text-[var(--color-gold-bright)]">{t("order.total")}: {orders.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder={t("order.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-[var(--color-gold)]/20 bg-[#2a1f0a]/80 py-2.5 pr-10 pl-4 text-sm text-white outline-none focus:border-[var(--color-gold)]/50" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterButtons.map((f) => <button key={f.id} onClick={() => setFilter(f.id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${filter === f.id ? "gradient-luxe border-transparent text-black shadow-[0_0_16px_-4px_rgba(255,215,0,0.55)]" : "border-[var(--color-gold)]/25 bg-[#2a1f0a]/60 text-zinc-400 hover:border-[var(--color-gold)]/50 hover:text-[var(--color-gold-pale)]"}`}>{f.label}</button>)}
        </div>
        {loading ? <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-gold)]/20 border-t-[var(--color-gold)]" /></div> : filteredOrders.length === 0 ? <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-[var(--color-gold)]/20 bg-[#2a1f0a]/40 text-zinc-500"><Package size={40} className="mb-2 opacity-30" /><p>{t("order.noOrders")}</p></div> : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const key = order.status_key || statusKey(order.status);
              return <div key={order.id} className="rounded-2xl border border-[var(--color-gold)]/20 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-4 transition hover:border-[var(--color-gold)]/40 hover:shadow-[0_0_24px_-12px_rgba(255,215,0,0.4)]">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => { setSelectedOrder(order); setModalMessage(""); }} className="min-w-0 text-right">
                    <div className="font-black text-white">#{order.smmnine_order_id ?? order.id}</div>
                    <div className="mt-1 line-clamp-1 text-sm text-zinc-400">{order.service_name}</div>
                  </button>
                  <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusColors[key] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/30"}`}><StatusIcon status={key} />{t(statusTranslationKeys[key] || "order.reviewing")}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm"><span className="text-zinc-500">{order.quantity} {t("order.units")}</span><span className="font-black text-gradient-luxe">${Number(order.charge).toFixed(4)}</span></div>
                <button onClick={() => { setSelectedOrder(order); setModalMessage(""); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-3 py-2 text-sm font-black text-[var(--color-gold-pale)] transition hover:bg-[var(--color-gold)]/20"><Eye size={15} />{t("order.tracking")}</button>
              </div>;
            })}
          </div>
        )}
      </div>

      {selectedOrder && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/85 p-3 sm:items-center sm:p-4">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#33260c] via-[#241a08] to-[#171004] p-5 shadow-[0_0_50px_-16px_rgba(255,215,0,0.4)]">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--color-gold)]/20 pb-3"><h3 className="text-lg font-black text-white">{t("order.tracking")}</h3><button onClick={() => setSelectedOrder(null)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-gold)]/40 bg-[#2a1f0a] text-[var(--color-gold-pale)]"><X size={16} /></button></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3"><div className="text-xs text-zinc-500">{t("order.number")}</div><div className="font-black text-white">#{selectedOrder.smmnine_order_id ?? selectedOrder.id}</div></div>
            <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3"><div className="text-xs text-zinc-500">{t("common.status")}</div><div className={`flex items-center gap-1 font-bold ${statusColors[selectedStatusKey] || "text-zinc-400"}`}><StatusIcon status={selectedStatusKey} />{statusLabel(t, selectedOrder)}</div></div>
            <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3"><div className="text-xs text-zinc-500">{t("order.quantity")}</div><div className="font-black text-white">{selectedOrder.quantity}</div></div>
            <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3"><div className="text-xs text-zinc-500">{t("order.amount")}</div><div className="font-black text-gradient-luxe">${Number(selectedOrder.charge).toFixed(4)}</div></div>
          </div>
          <Progress order={selectedOrder} t={t} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3"><div className="text-xs text-zinc-500">{t("order.completedQuantity")}</div><div className="font-black text-green-300">{completed === null ? t("order.noData") : completed}</div></div>
            <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3"><div className="text-xs text-zinc-500">{t("order.remaining")}</div><div className="font-black text-amber-300">{remaining === null || !Number.isFinite(remaining) ? t("order.noData") : remaining}</div></div>
          </div>
          <div className="mt-3 rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3"><div className="text-xs text-zinc-500">{t("order.service")}</div><div className="text-sm text-white">{selectedOrder.service_name}</div></div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--color-gold)]/15 bg-[#1a1204]/60 p-3"><Link2 size={14} className="shrink-0 text-[var(--color-gold)]" /><a href={selectedOrder.link ?? undefined} target="_blank" rel="noreferrer" dir="ltr" className="truncate text-xs text-[var(--color-gold-pale)] hover:text-[var(--color-gold-bright)]">{selectedOrder.link}</a></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={refreshSelectedOrder} disabled={refreshing} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-2.5 text-sm font-black text-[var(--color-gold-pale)] disabled:opacity-50"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />{refreshing ? t("order.refreshing") : t("order.refresh")}</button>{canCancel ? <button onClick={cancelSelectedOrder} disabled={canceling} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm font-black text-red-300 disabled:opacity-50"><Ban size={15} />{canceling ? t("order.refreshing") : t("order.cancelRequest")}</button> : <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-500/20 bg-zinc-500/10 px-2 py-2.5 text-center text-[11px] font-bold text-zinc-400"><CircleDollarSign size={14} />{t("order.cancelUnavailable")}</div>}</div>
          <p className="mt-3 text-center text-[10px] leading-5 text-zinc-500">{t("order.cancelRules")} {t("order.trackHint")}</p>
          {modalMessage && <div className="mt-3 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 p-3 text-center text-xs font-bold text-[var(--color-gold-pale)]">{modalMessage}</div>}
        </div>
      </div>}
    </DashboardLayout>
  );
}
