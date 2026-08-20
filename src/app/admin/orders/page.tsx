"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { ClipboardList, RefreshCw, Search, X } from "lucide-react";

interface AdminOrder {
  id: number;
  user_id: number;
  username: string;
  smmnine_order_id: number;
  service_id: number;
  service_name: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  created_at?: unknown;
}

interface OrdersResponse {
  orders?: AdminOrder[];
  error?: string;
}

interface OrderStatusPayload {
  status?: string;
  remains?: number | null;
  start_count?: number | null;
  error?: string;
}

const statusLabels: Record<string, string> = {
  Pending: "معلق",
  "In progress": "قيد التنفيذ",
  Processing: "قيد التنفيذ",
  Partial: "جزئي",
  Completed: "مكتمل",
  Canceled: "ملغي",
  Cancelled: "ملغي",
  Fail: "فاشل",
  Failed: "فاشل",
  Refunded: "مسترد",
};

const statusColors: Record<string, string> = {
  Pending: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  "In progress": "text-blue-300 bg-blue-400/10 border-blue-400/20",
  Processing: "text-blue-300 bg-blue-400/10 border-blue-400/20",
  Partial: "text-orange-300 bg-orange-400/10 border-orange-400/20",
  Completed: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  Canceled: "text-red-300 bg-red-400/10 border-red-400/20",
  Cancelled: "text-red-300 bg-red-400/10 border-red-400/20",
  Fail: "text-red-300 bg-red-400/10 border-red-400/20",
  Failed: "text-red-300 bg-red-400/10 border-red-400/20",
  Refunded: "text-zinc-300 bg-zinc-400/10 border-zinc-400/20",
};

const statuses = [
  { value: "all", label: "كل الحالات" },
  { value: "Pending", label: "معلق" },
  { value: "Processing", label: "قيد التنفيذ" },
  { value: "Completed", label: "مكتمل" },
  { value: "Partial", label: "جزئي" },
  { value: "Canceled", label: "ملغي" },
  { value: "Failed", label: "فاشل" },
];

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ar-IQ");
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(4)}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatusPayload | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  const loadOrders = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const query = statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const response = await fetch(`/api/admin/orders${query}`, {
        credentials: "include",
        cache: "no-store",
        signal,
      });
      const data = await response.json() as OrdersResponse;
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الطلبات");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setOrders([]);
      setError(caught instanceof Error ? caught.message : "تعذر تحميل الطلبات");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadOrders(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadOrders]);

  const checkStatus = async (order: AdminOrder) => {
    setSelectedOrder(order);
    setOrderStatus(null);
    setRefreshingId(order.id);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await response.json() as OrderStatusPayload;
      if (!response.ok) {
        setOrderStatus({ error: data.error || "تعذر تحديث حالة الطلب" });
        return;
      }
      setOrderStatus(data);
      const nextStatus = String(data.status || order.status);
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: nextStatus } : item));
      setSelectedOrder((current) => current ? { ...current, status: nextStatus } : current);
    } catch (caught) {
      setOrderStatus({ error: caught instanceof Error ? caught.message : "تعذر تحديث حالة الطلب" });
    } finally {
      setRefreshingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [order.id, order.smmnine_order_id, order.username, order.service_name, order.link]
      .some((value) => String(value || "").toLowerCase().includes(needle));
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[var(--color-gold)]"><ClipboardList size={18} /><span className="text-xs font-bold">مركز التشغيل</span></div>
            <h1 className="mt-1 text-2xl font-black text-white">مراجعة جميع الطلبات</h1>
            <p className="mt-1 text-xs text-zinc-500">عرض آخر 200 طلب مع تحديث الحالة من المزود عند الحاجة.</p>
          </div>
          <button onClick={() => void loadOrders()} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-[var(--color-gold)]/50 disabled:opacity-50">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> تحديث القائمة
          </button>
        </div>

        <div className="glass-card grid gap-2 rounded-2xl p-3 sm:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 px-3 text-zinc-400">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالرقم أو المستخدم أو الخدمة أو الرابط" className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-white outline-none placeholder:text-zinc-600" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs font-bold text-white outline-none">
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>

        {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</div>}
        <div className="flex items-center justify-between text-xs text-zinc-500"><span>{filteredOrders.length} طلب معروض</span><Link href="/admin/users" className="font-bold text-[var(--color-gold)]">إدارة المستخدمين</Link></div>

        {loading ? <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-gold)]" /></div> : filteredOrders.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] text-zinc-500"><ClipboardList size={42} className="mb-3 opacity-30" /><p className="text-sm">لا توجد طلبات مطابقة</p></div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => <button key={order.id} type="button" onClick={() => void checkStatus(order)} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-right transition hover:border-[var(--color-gold)]/40 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-[1.1fr_1.5fr_auto_auto] sm:items-center">
                <div className="min-w-0"><div className="truncate text-sm font-black text-white">#{order.smmnine_order_id} · {order.username}</div><div className="mt-1 text-[10px] text-zinc-600">سجل #{order.id} · {formatDate(order.created_at)}</div></div>
                <div className="min-w-0 truncate text-xs text-zinc-300">{order.service_name || "خدمة غير مسماة"}<div className="mt-1 truncate text-[10px] text-zinc-600">{order.link}</div></div>
                <div className="text-xs text-zinc-500">×{order.quantity}</div>
                <div className="flex items-center justify-between gap-2 sm:block sm:text-left"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusColors[order.status] || "border-zinc-400/20 bg-zinc-400/10 text-zinc-300"}`}>{statusLabels[order.status] || order.status}</span><div className="mt-1 text-xs font-black text-[var(--color-gold)]">{formatMoney(order.charge)}</div></div>
              </div>
            </button>)}
          </div>
        )}
      </div>

      {selectedOrder && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-4 sm:items-center" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3"><h2 className="text-lg font-black text-white">تفاصيل الطلب #{selectedOrder.smmnine_order_id}</h2><button onClick={() => { setSelectedOrder(null); setOrderStatus(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-zinc-400" aria-label="إغلاق"><X size={18} /></button></div>
          <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-zinc-500">المستخدم</div><div className="mt-1 font-bold text-white">{selectedOrder.username}</div></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-zinc-500">الحالة</div><div className="mt-1 font-bold text-white">{statusLabels[selectedOrder.status] || selectedOrder.status}</div></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-zinc-500">الكمية</div><div className="mt-1 font-bold text-white">{selectedOrder.quantity}</div></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-zinc-500">المبلغ</div><div className="mt-1 font-bold text-[var(--color-gold)]">{formatMoney(selectedOrder.charge)}</div></div></div>
          <div className="mt-2 rounded-xl bg-[var(--color-surface)] p-3 text-xs"><div className="text-zinc-500">الرابط</div><a href={selectedOrder.link} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[var(--color-gold)]">{selectedOrder.link}</a></div>
          {orderStatus?.error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{orderStatus.error}</div>}
          {orderStatus && !orderStatus.error && <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-zinc-500">المتبقي</div><div className="mt-1 font-bold text-white">{orderStatus.remains ?? "—"}</div></div><div className="rounded-xl bg-[var(--color-surface)] p-3"><div className="text-zinc-500">عند البداية</div><div className="mt-1 font-bold text-white">{orderStatus.start_count ?? "—"}</div></div></div>}
          <button onClick={() => void checkStatus(selectedOrder)} disabled={refreshingId === selectedOrder.id} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3 text-sm font-bold text-white disabled:opacity-60"><RefreshCw size={17} className={refreshingId === selectedOrder.id ? "animate-spin" : ""} /> تحديث الحالة من المزود</button>
        </div>
      </div>}
    </DashboardLayout>
  );
}
