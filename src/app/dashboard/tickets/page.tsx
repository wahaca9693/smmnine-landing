"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { ArrowLeft, MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  speed_up: "تسريع طلب",
  refill: "تعويض طلب",
  recharge_issue: "مشكلة في الشحن",
  cancel_order: "إلغاء طلب",
  other: "مشكلة أخرى",
  inquiry: "استفسار عام",
};

const STATUS_STYLES: Record<string, { text: string; icon: any; color: string }> = {
  open: { text: "مفتوحة", icon: AlertCircle, color: "text-yellow-400 bg-yellow-400/10" },
  resolved: { text: "تم الرد", icon: CheckCircle, color: "text-green-400 bg-green-400/10" },
  closed: { text: "مغلقة", icon: CheckCircle, color: "text-zinc-400 bg-zinc-400/10" },
};

export default function UserTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => {
        setTickets(data.tickets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-sm text-zinc-400">
          <ArrowLeft size={18} /> رجوع لمركز الدعم
        </button>

        <div className="flex items-center gap-3">
          <MessageSquare className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">تذاكري</h1>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center text-zinc-500">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-bold">لا توجد تذاكر بعد</p>
            <p className="mt-2 text-sm">يمكنك إنشاء تذكرة جديدة من مركز الدعم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const status = STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
              const StatusIcon = status.icon;
              return (
                <div key={ticket.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{ticket.subject}</div>
                      <div className="mt-1 text-xs text-zinc-400">{TYPE_LABELS[ticket.type] || ticket.type}</div>
                    </div>
                    <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${status.color}`}>
                      <StatusIcon size={14} /> {status.text}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">{ticket.description}</p>
                  {ticket.orderId && (
                    <div className="text-xs text-zinc-500">رقم الطلب: <span className="text-zinc-300">{ticket.orderId}</span></div>
                  )}
                  {ticket.adminReply && (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold text-green-400">
                        <CheckCircle size={14} /> رد الإدارة
                      </div>
                      <p className="text-sm text-white">{ticket.adminReply}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock size={14} />
                    {new Date(ticket.createdAt).toLocaleString("ar-IQ")}
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
