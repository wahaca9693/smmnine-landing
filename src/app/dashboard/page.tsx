"use client";

import DashboardLayout from "../components/DashboardLayout";
import Link from "next/link";
import { Headphones, Bot, MessageCircle, FolderOpen, LifeBuoy } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

export default function DashboardPage() {
  const { t } = useLanguage();

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
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]">
              <Headphones size={36} />
            </span>
            <h3 className="mt-4 text-lg font-black text-white">{t("dashboard.techSupport")}</h3>
            <p className="mt-2 text-sm text-zinc-500">
              {t("dashboard.techSupportDesc")}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#a855f7]/30 bg-[#a855f7]/10 text-[#a855f7]">
              <Bot size={36} />
            </span>
            <h3 className="mt-4 text-lg font-black text-white">{t("dashboard.aiSupport")}</h3>
            <p className="mt-2 text-sm text-zinc-500">
              {t("dashboard.aiSupportDesc")}
            </p>
          </div>
        </div>

        <Link
          href="#"
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
    </DashboardLayout>
  );
}
