"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "../../../../components/DashboardLayout";
import Link from "next/link";
import { ArrowRight, Package, RefreshCw, Eye, X } from "lucide-react";

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

const statusColors: Record<string, string> = {
  Pending: "text-amber-400 bg-amber-400/10",
  "In progress": "text-blue-400 bg-blue-400/10",
  Processing: "text-blue-400 bg-blue-400/10",
  Partial: "text-orange-400 bg-orange-400/10",
  Completed: "text-green-400 bg-green-400/10",
  Canceled: "text-red-400 bg-red-400/10",
  Cancelled: "text-red-400 bg-red-400/10",
  Fail: "text-red-500 bg-red-500/10",
  Failed: "text-red-500 bg-red-500/10",
  Refunded: "text-zinc-400 bg-zinc-400/10",
};

export default function UserOrdersAdminPage() {
  const params = useParams();
  const userId = params.id;
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/admin/orders?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
        if (data.orders?.length) {
          setUser({ username: data.orders[0].username });
        }
      });
  }, [userId]);

  const checkStatus = async (order: any) => {
    setSelectedOrder(order);
    const res = await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    const data = await res.json();
    setOrderStatus(data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/users" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface)] text-white">
            <ArrowRight size={20} />
          </Link>
          <h1 className="text-2xl font-black text-white">طلبات {user?.username || "المستخدم"}</h1>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] text-zinc-500">
            <Package size={48} className="mb-3 opacity-30" />
            <p>لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
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
                  <span className="font-bold text-[var(--color-primary)]">${order.charge.toFixed(4)}</span>
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
              <button onClick={() => { setSelectedOrder(null); setOrderStatus(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-zinc-400">
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
                <div className="font-bold text-white">{statusAr[selectedOrder.status] || selectedOrder.status}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface)] p-3">
                <div className="text-xs text-zinc-500">الكمية</div>
                <div className="font-bold text-white">{selectedOrder.quantity}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface)] p-3">
                <div className="text-xs text-zinc-500">المبلغ</div>
                <div className="font-bold text-[var(--color-primary)]">${selectedOrder.charge.toFixed(4)}</div>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-[var(--color-surface)] p-3">
              <div className="text-xs text-zinc-500">الرابط</div>
              <a href={selectedOrder.link} target="_blank" rel="noreferrer" className="break-all text-sm text-[var(--color-primary)]">{selectedOrder.link}</a>
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
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3 font-bold text-white"
            >
              <RefreshCw size={18} /> تحديث الحالة
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
