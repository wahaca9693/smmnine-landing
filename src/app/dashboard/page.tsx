"use client";

import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Link from "next/link";
import { Headphones, Bot, MessageCircle, FolderOpen, LifeBuoy, X, Send, Rocket, Gift, CreditCard, Ban, HelpCircle, AlertCircle, Loader2, Check } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const ISSUE_TYPES = [
    { id: "speed_up", label: t("ticket.type.speed_up"), icon: Rocket },
    { id: "refill", label: t("ticket.type.refill"), icon: Gift },
    { id: "recharge_issue", label: t("ticket.type.recharge_issue"), icon: CreditCard },
    { id: "cancel_order", label: t("ticket.type.cancel_order"), icon: Ban },
    { id: "other", label: t("ticket.type.other"), icon: AlertCircle },
    { id: "inquiry", label: t("ticket.type.inquiry"), icon: HelpCircle },
  ];

  const openSupport = () => {
    setShowModal(true);
    setSelectedType("");
    setSubject("");
    setDescription("");
    setOrderId("");
    setMessage("");
  };

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) {
      setMessage(t("ticket.selectFirst"));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, subject, description, orderId }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage("success");
        setTimeout(() => {
          setShowModal(false);
          router.push("/dashboard/tickets");
        }, 1200);
      }
    } catch {
      setLoading(false);
      setMessage(t("ticket.selectFirst"));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24">
        {/* بانر مركز الدعم — تدرج ذهبي لامع */}
        <div className="relative overflow-hidden rounded-3xl gradient-luxe p-5 text-black shadow-[0_0_40px_-12px_rgba(255,215,0,0.6)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black">{t("dashboard.supportCenter")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-black/70">{t("dashboard.supportCenterDesc")}</p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/15">
              <LifeBuoy size={26} />
            </span>
          </div>
        </div>

        {/* بطاقة الدعم الفني */}
        <button
          onClick={openSupport}
          className="block w-full rounded-3xl border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-5 text-center transition hover:border-[var(--color-gold)]/60 hover:shadow-[0_0_36px_-14px_rgba(255,215,0,0.45)]"
        >
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)]">
            <Headphones size={36} />
          </span>
          <h3 className="mt-4 text-lg font-black text-white">{t("dashboard.techSupport")}</h3>
          <p className="mt-2 text-sm text-zinc-500">{t("dashboard.techSupportDesc")}</p>
        </button>

        {/* بطاقة دعم الذكاء الاصطناعي */}
        <button
          onClick={openSupport}
          className="block w-full rounded-3xl border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-5 text-center transition hover:border-[var(--color-gold)]/60 hover:shadow-[0_0_36px_-14px_rgba(255,215,0,0.45)]"
        >
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)]">
            <Bot size={36} />
          </span>
          <h3 className="mt-4 text-lg font-black text-white">{t("dashboard.aiSupport")}</h3>
          <p className="mt-2 text-sm text-zinc-500">{t("dashboard.aiSupportDesc")}</p>
        </button>

        {/* رابط التذاكر السابقة */}
        <Link
          href="/dashboard/tickets"
          className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-gold)]/30 bg-gradient-to-r from-[#3a2d0d] to-[#2a2008] p-4 text-[var(--color-gold-bright)] transition hover:border-[var(--color-gold)] hover:shadow-[0_0_20px_-8px_rgba(255,215,0,0.5)]"
        >
          <FolderOpen size={20} />
          <span className="font-black">{t("dashboard.previousTickets")}</span>
        </Link>

        {/* أزرار التواصل الاجتماعي */}
        <div className="flex items-center justify-center gap-4">
          {["WhatsApp", "Telegram"].map((label) => (
            <button
              key={label}
              title={label}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-gold)]/40 bg-[#2a1f0a] text-[var(--color-gold-pale)] transition hover:border-[var(--color-gold-bright)] hover:text-[var(--color-gold-bright)]"
            >
              <MessageCircle size={22} />
            </button>
          ))}
        </div>
      </div>

      {/* نافذة إنشاء التذكرة */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
          <div className="relative w-full max-w-md rounded-t-3xl border-t border-[var(--color-gold)]/30 bg-gradient-to-br from-[#33260c] via-[#241a08] to-[#171004] p-5 shadow-[0_0_60px_-16px_rgba(255,215,0,0.35)] sm:rounded-3xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-gold)]/40 bg-[#2a1f0a] text-[var(--color-gold-pale)] transition hover:text-[var(--color-gold-bright)]"
            >
              <X size={15} />
            </button>
            <div className="mb-4 flex items-center gap-3 border-b border-[var(--color-gold)]/20 pb-3">
              <Headphones className="text-[var(--color-gold-bright)]" size={22} />
              <h2 className="text-lg font-black text-white">{t("dashboard.techSupport")}</h2>
            </div>

            {message === "success" ? (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                  <Check size={32} />
                </span>
                <h3 className="mt-4 text-lg font-black text-white">{t("ticket.sent")}</h3>
                <p className="mt-2 text-sm text-zinc-400">{t("ticket.willReply")}</p>
              </div>
            ) : (
              <form onSubmit={submitTicket} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-black text-[var(--color-gold-pale)]">{t("ticket.chooseType")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ISSUE_TYPES.map((issue) => {
                      const Icon = issue.icon;
                      const active = selectedType === issue.id;
                      return (
                        <button
                          key={issue.id}
                          type="button"
                          onClick={() => setSelectedType(issue.id)}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition ${
                            active
                              ? "gradient-luxe border-transparent text-black shadow-[0_0_16px_-4px_rgba(255,215,0,0.5)]"
                              : "border-[var(--color-gold)]/25 bg-[#2a1f0a]/60 text-zinc-300 hover:border-[var(--color-gold)]/50"
                          }`}
                        >
                          <Icon size={14} />
                          {issue.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-400">{t("ticket.title")}</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t("ticket.titlePh")}
                    className="w-full rounded-xl border border-[var(--color-gold)]/20 bg-[#2a1f0a]/80 px-4 py-3 text-white outline-none focus:border-[var(--color-gold)]/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-400">{t("ticket.orderId")}</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder={t("ticket.orderIdPh")}
                    className="w-full rounded-xl border border-[var(--color-gold)]/20 bg-[#2a1f0a]/80 px-4 py-3 text-white outline-none focus:border-[var(--color-gold)]/50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-400">{t("ticket.describe")}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("ticket.describePh")}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[var(--color-gold)]/20 bg-[#2a1f0a]/80 px-4 py-3 text-white outline-none focus:border-[var(--color-gold)]/50"
                    required
                  />
                </div>

                {message && (
                  <div className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-400">{message}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> {t("ticket.submit")}</>}
                </button>
                <p className="text-center text-xs text-zinc-500">{t("ticket.replyWithin")}</p>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
