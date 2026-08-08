"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Search, ShoppingCart, RefreshCw, Eye, X, Link2, Package } from "lucide-react";

const filters = [
  { id: "all", label: "الكل" },
  { id: "Pending", label: "معلق" },
  { id: "In progress", label: "قيد التنفيذ" },
  { id: "Partial", label: "جزئي" },
  { id: "Completed", label: "مكتمل" },
  { id: "Canceled", label: "ملغي" },
];

const statusColors: Record<string, string> = {
  Pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "In progress": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Processing: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Partial: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Completed: "text-green-400 bg-green-400/10 border-green-400/20",
  Canceled: "text-red-400 bg-red-400/10 border-red-400/20",
  Cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
  Fail: "text-red-500 bg-red-500/10 border-red-500/20",
  Failed: "text-red-500 bg-red-500/10 border-red-500/20",
  Refunded: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
};

const statusAr: Record<string, string> = {
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetch(`/api/orders?status=${filter}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  const refreshActiveOrders = async () => {
    const activeOrders = orders.filter(
      (o) => !["Completed", "Canceled", "Cancelled", "Fail", "Failed", "Refunded"].includes(o.status)
    );
    for (const order of activeOrders) {
      try {
        await fetch("/api/orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });
      } catch (e) {}
    }
    if (activeOrders.length > 0) fetchOrders();
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  useEffect(() => {
    if (orders.length === 0) return;
    refreshActiveOrders();
    const interval = setInterval(refreshActiveOrders, 30000);
    return () => clearInterval(interval);
  }, [orders.length, filter]);

  const checkStatus = async (order: any) => {
    setSelectedOrder(order);
    setChecking(true);
    setOrderStatus(null);
    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      setOrderStatus(data);
      fetchOrders();
    } catch (e) {}
    setChecking(false);
  };

  const filteredOrders = orders.filter((o) =>
    String(o.service_name).includes(search) ||
    String(o.smmnine_order_id).includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white">طلباتي</h1>
          <span className="text-sm text-zinc-500">إجمالي: {orders.length}</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="ابحث برقم الطلب أو اسم الخدمة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-2.5 pr-10 pl-4 text-sm text-white outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                filter === f.id
                  ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white"
                  : "bg-[var(--color-card)] text-zinc-400 border border-[var(--color-border)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] text-zinc-500">
            <Package size={40} className="mb-2 opacity-30" />
            <p>لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => checkStatus(order)}
                className="cursor-pointer rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition hover:border-[var(--color-primary)]/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white">#{order.smmnine_order_id}</div>
                    <div className="mt-1 line-clamp-1 text-sm text-zinc-400">{order.service_name}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusColors[order.status] || "text-zinc-400 bg-zinc-400/10"}`}>
                    {statusAr[order.status] || order.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{order.quantity} وحدة</span>
                  <span className="font-bold text-[var(--color-primary)]">${Number(order.charge).toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-4 sm:items-center animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 animate-slideUp">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-lg font-black text-white">تفاصيل الطلب</h3>
              <button onClick={() => setSelectedOrder(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-zinc-400">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--color-surface)] p-3">
                <div className="text-xs text-zinc-500">رقم الطلب</div>
                <div className="font-bold text-white">#{selectedOrder.smmnine_order_id}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface)] p-3">
                <div className="text-xs text-zinc-500">الحالة</div>
                <div className={`font-bold ${orderStatus?.status ? (statusColors[orderStatus.status] || "").split(" ")[0] : "text-white"}`}>
                  {orderStatus ? statusAr[orderStatus.status] || orderStatus.status : statusAr[selectedOrder.status] || selectedOrder.status}
                </div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface)] p-3">
                <div className="text-xs text-zinc-500">الكمية</div>
                <div className="font-bold text-white">{selectedOrder.quantity}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface)] p-3">
                <div className="text-xs text-zinc-500">المبلغ</div>
                <div className="font-bold text-[var(--color-primary)]">${Number(selectedOrder.charge).toFixed(4)}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-[var(--color-surface)] p-3">
              <div className="text-xs text-zinc-500">الخدمة</div>
              <div className="text-sm text-white">{selectedOrder.service_name}</div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--color-surface)] p-3">
              <Link2 size={16} className="text-[var(--color-primary)]" />
              <a href={selectedOrder.link} target="_blank" rel="noreferrer" className="truncate text-sm text-[var(--color-primary)]">
                {selectedOrder.link}
              </a>
            </div>

            {orderStatus && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-zinc-500">المتبقي</div>
                  <div className="font-bold text-white">{orderStatus.remains ?? "—"}</div>
                </div>
                <div className="rounded-xl bg-[var(--color-surface)] p-3">
                  <div className="text-xs text-zinc-500">عند البداية</div>
                  <div className="font-bold text-white">{orderStatus.start_count ?? "—"}</div>
                </div>
              </div>
            )}

            <button
              onClick={() => checkStatus(selectedOrder)}
              disabled={checking}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3 font-bold text-white disabled:opacity-50"
            >
              {checking ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
              تتبع حالة الطلب
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
