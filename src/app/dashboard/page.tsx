"use client";

import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Link from "next/link";
import { Headphones, Bot, MessageCircle, FolderOpen, LifeBuoy, X, Send, Rocket, Gift, CreditCard, Ban, HelpCircle, AlertCircle, Loader2, Check } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import { useRouter } from "next/navigation";

const ISSUE_TYPES = [
  { id: "speed_up", label: "تسريع طلب", icon: Rocket },
  { id: "refill", label: "تعويض طلب", icon: Gift },
  { id: "recharge_issue", label: "مشكلة في الشحن", icon: CreditCard },
  { id: "cancel_order", label: "إلغاء طلب", icon: Ban },
  { id: "other", label: "مشكلة أخرى", icon: AlertCircle },
  { id: "inquiry", label: "استفسار عام", icon: HelpCircle },
];

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
      setMessage("اختر نوع المشكلة أولاً");
      return;
    }
    setLoading(true);
    setMessage("");
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
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Support center banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black">{t("dashboard.supportCenter")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-blue-100">
                {t("dashboard.supportCenterDesc")}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <LifeBuoy size={26} />
            </span>
          </div>
        </div>

        {/* Support options */}
        <button
          onClick={openSupport}
          className="block w-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 text-right transition hover:border-[var(--color-primary)]/30"
        >
          <div className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]">
              <Headphones size={36} />
            </span>
            <h3 className="mt-4 text-lg font-black text-white">{t("dashboard.techSupport")}</h3>
            <p className="mt-2 text-sm text-zinc-500">
              {t("dashboard.techSupportDesc")}
            </p>
          </div>
        </button>

        <button
          onClick={openSupport}
          className="block w-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 text-right transition hover:border-[var(--color-primary)]/30"
        >
          <div className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#a855f7]/30 bg-[#a855f7]/10 text-[#a855f7]">
              <Bot size={36} />
            </span>
            <h3 className="mt-4 text-lg font-black text-white">{t("dashboard.aiSupport")}</h3>
            <p className="mt-2 text-sm text-zinc-500">
              {t("dashboard.aiSupportDesc")}
            </p>
          </div>
        </button>

        <Link
          href="/dashboard/tickets"
          className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--color-primary)] transition hover:bg-[var(--color-surface)]"
        >
          <FolderOpen size={20} />
          <span className="font-bold">{t("dashboard.previousTickets")}</span>
        </Link>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {[t("dashboard.whatsapp"), t("dashboard.telegram"), t("dashboard.support")].map((item, i) => (
            <button
              key={i}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg"
            >
              <MessageCircle size={24} />
            </button>
          ))}
        </div>
      </div>

      {/* Support Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="relative w-full max-w-md rounded-t-3xl bg-[var(--color-card)] p-5 shadow-2xl sm:rounded-3xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)] text-zinc-400"
            >
              <X size={18} />
            </button>
            <div className="mb-4 flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
              <Headphones className="text-[#3b82f6]" size={24} />
              <h2 className="text-lg font-black text-white">الدعم الفني</h2>
            </div>

            {message === "success" ? (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                  <Check size={32} />
                </span>
                <h3 className="mt-4 text-lg font-black text-white">تم إرسال التذكرة</h3>
                <p className="mt-2 text-sm text-zinc-400">سنرد عليك في أقرب وقت</p>
              </div>
            ) : (
              <form onSubmit={submitTicket} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-white">اختر نوع المشكلة 💜</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ISSUE_TYPES.map((issue) => {
                      const Icon = issue.icon;
                      const active = selectedType === issue.id;
                      return (
                        <button
                          key={issue.id}
                          type="button"
                          onClick={() => setSelectedType(issue.id)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] text-zinc-300 hover:border-[var(--color-primary)]/30"
                          }`}
                        >
                          <Icon size={16} />
                          {issue.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-400">العنوان</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="مثلاً: مشكلة في طلب زيادة متابعين"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-400">رقم الطلب (اختياري)</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="12345"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-400">صف مشكلتك بالتفصيل ✏️</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="اكتب وصفاً واضحاً للمشكلة — يمكنك ذكر رقم الطلب إن وُجد..."
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                </div>

                {message && (
                  <div className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-400">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] py-3.5 font-black text-white disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> إرسال</>}
                </button>
                <p className="text-center text-xs text-zinc-500">
                  ستُنشأ تذكرة في قسم تذاكري ويردّ عليك الفريق خلال 24 ساعة.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
