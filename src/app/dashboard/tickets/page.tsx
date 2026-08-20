"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { ArrowLeft, MessageSquare, Clock3, CheckCircle2, CircleDot, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../components/LanguageProvider";

type TicketRow = {
  id: number | string;
  subject: string;
  type: string;
  status: string;
  description: string;
  orderId?: number | string | null;
  adminReply?: string | null;
  createdAt: string | number;
};

type TicketsResponse = {
  tickets?: TicketRow[];
};

const STATUS_STYLES: Record<string, string> = {
  open: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  resolved: "text-green-400 bg-green-400/10 border-green-400/30",
  closed: "text-zinc-400 bg-zinc-400/10 border-zinc-400/30",
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "open":
      return (
        <span className="relative inline-flex">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/30" style={{ animationDuration: "2.5s" }} />
          <CircleDot className="relative text-amber-400" size={13} />
        </span>
      );
    case "resolved":
      return <CheckCircle2 className="text-green-400" size={13} />;
    default:
      return <X className="text-zinc-400" size={13} />;
  }
}

export default function UserTicketsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets")
      .then(async (response) => (await response.json()) as TicketsResponse)
      .then((data) => {
        setTickets(data.tickets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24">
        <button
          onClick={() => router.push("/dashboard")}
          className="group flex items-center gap-1.5 rounded-full border border-[var(--color-gold)]/40 bg-gradient-to-r from-[#2a1f0a] to-[#1a1205] px-3 py-1.5 text-[11px] font-black text-[var(--color-gold-bright)] transition hover:border-[var(--color-gold)]"
        >
          <ArrowLeft size={13} className="transition group-hover:-translate-x-0.5 rtl:rotate-180" />
          {t("ticket.back")}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-luxe shadow-[0_0_28px_-6px_rgba(255,215,0,0.5)]">
            <MessageSquare size={24} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-white">{t("ticket.myTickets")}</h1>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-gold)]/20 border-t-[var(--color-gold)]" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-3xl border border-[var(--color-gold)]/20 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-8 text-center text-zinc-500">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-black text-white">{t("ticket.noTickets")}</p>
            <p className="mt-2 text-sm">{t("ticket.noTicketsDesc")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-4 shadow-[0_0_32px_-16px_rgba(255,215,0,0.25)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-white">{ticket.subject}</div>
                    <div className="mt-1 text-xs text-[var(--color-gold-pale)]/70">
                      {t(`ticket.type.${ticket.type}`) || ticket.type}
                    </div>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold ${STATUS_STYLES[ticket.status] || STATUS_STYLES.open}`}>
                    <StatusIcon status={ticket.status} />
                    {ticket.status === "resolved" ? t("ticket.status.replied") : t(`ticket.status.${ticket.status}`) || ticket.status}
                  </span>
                </div>
                <p className="mt-3 rounded-2xl bg-[#1a1204]/60 p-3 text-sm leading-relaxed text-zinc-300">{ticket.description}</p>
                {ticket.orderId && (
                  <div className="mt-2 text-xs text-zinc-500">
                    {t("ticket.orderNumber")}: <span className="font-black text-[var(--color-gold-pale)]">{ticket.orderId}</span>
                  </div>
                )}
                {ticket.adminReply && (
                  <div className="mt-3 rounded-2xl border border-green-400/25 bg-green-400/8 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-black text-green-400">
                      <CheckCircle2 size={13} /> {t("ticket.adminReply")}
                    </div>
                    <p className="text-sm text-white">{ticket.adminReply}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
                  <Clock3 size={12} />
                  {new Date(ticket.createdAt).toLocaleString(localeOf(t))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function localeOf(t: (k: string) => string): string {
  try {
    // detect locale from a key translation — fallback to ar
    const sample = t("order.all");
    return sample === "الكل" ? "ar-IQ" : "en-US";
  } catch {
    return "ar-IQ";
  }
}
