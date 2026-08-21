"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Boxes, KeyRound, ListChecks, UserRound, WalletCards } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { useLanguage } from "../components/LanguageProvider";
import { useTheme } from "../components/ThemeProvider";

type UserData = {
  username: string;
  email?: string;
  balance: number;
  role: string;
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/user", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.user) setUser(data.user);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const roleLabel = user?.role === "admin" ? "Admin" : "User";

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-0 pb-8" dir="inherit">
        <section className="relative overflow-hidden rounded-[2rem] border border-amber-400/30 bg-[#211507] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-amber-300/45 bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-700 text-[#2a1704] shadow-[0_8px_24px_rgba(245,158,11,0.22)]">
              <UserRound className="h-8 w-8" strokeWidth={2.1} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300/75">{brandName}</p>
              <h1 className="truncate text-2xl font-black text-amber-50 sm:text-3xl">{t("profile.title")}</h1>
              <p className="mt-1 text-sm text-amber-100/65">{t("profile.subtitle")}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-4">
          {[
            ["profile.username", user?.username || "—"],
            ["profile.email", user?.email || "—"],
            ["profile.role", roleLabel],
            ["profile.balance", `$ ${Number(user?.balance || 0).toFixed(4)}`],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-2xl border border-amber-300/20 bg-[#191108] p-4">
              <p className="text-xs font-semibold text-amber-100/50">{t(label)}</p>
              <p className="mt-2 truncate text-sm font-black text-amber-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-[2rem] border border-amber-400/25 bg-[#191108] p-4 sm:mt-6 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-amber-50">{t("profile.availableTools")}</h2>
            <p className="mt-1 text-sm leading-6 text-amber-100/55">{t("profile.platformsDesc")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link href="/services" className="group flex items-center justify-between rounded-2xl border border-amber-300/20 bg-[#24170a] p-4 hover:border-amber-300/55">
              <span className="flex items-center gap-3"><Boxes className="h-5 w-5 text-amber-300" /><span className="text-sm font-bold text-amber-50">{t("profile.platforms")}</span></span>
              <ArrowLeft className="h-4 w-4 text-amber-300/60" />
            </Link>
            <Link href="/api-access" className="group flex items-center justify-between rounded-2xl border border-amber-300/20 bg-[#24170a] p-4 hover:border-amber-300/55">
              <span className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-amber-300" /><span className="text-sm font-bold text-amber-50">{t("settings.apiCard")}</span></span>
              <ArrowLeft className="h-4 w-4 text-amber-300/60" />
            </Link>
            <Link href="/orders" className="group flex items-center justify-between rounded-2xl border border-amber-300/20 bg-[#24170a] p-4 hover:border-amber-300/55">
              <span className="flex items-center gap-3"><ListChecks className="h-5 w-5 text-amber-300" /><span className="text-sm font-bold text-amber-50">{t("settings.ordersCard")}</span></span>
              <ArrowLeft className="h-4 w-4 text-amber-300/60" />
            </Link>
          </div>
        </section>

        <div className="mt-4 flex justify-end">
          <Link href="/deposit" className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-400/20">
            <WalletCards className="h-4 w-4" />
            {t("bottomNav.deposit")}
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
