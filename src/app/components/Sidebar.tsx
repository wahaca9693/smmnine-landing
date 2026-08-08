"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  X,
  User,
  Globe,
  Boxes,
  ShoppingCart,
  Zap,
  RefreshCw,
  Wallet,
  History,
  Bell,
  Globe2,
  SlidersHorizontal,
  LogOut,
  Shield,
  FileText,
  Check,
} from "lucide-react";
import { useLanguage, type Locale } from "./LanguageProvider";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: { username: string; balance: number; role: string } | null;
}

type MenuItem =
  | { type: "link"; label: string; href: string; icon?: React.ElementType; badge?: string; badgeColor?: string }
  | { type: "action"; label: string; action: () => void; icon?: React.ElementType; badge?: string; badgeColor?: string };

export default function Sidebar({ open, onClose, user }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();
  const [showLangSheet, setShowLangSheet] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleLangSelect = (value: Locale) => {
    setLocale(value);
    setShowLangSheet(false);
    onClose();
  };

  const menuItems: MenuItem[] = [
    { type: "link", label: t("sidebar.menu"), href: "/dashboard" },
    {
      type: "action",
      label: `${t("sidebar.language")} (${locale === "ar" ? "EN" : "AR"})`,
      action: () => setShowLangSheet(true),
      icon: Globe,
    },
    { type: "link", label: t("sidebar.services"), href: "/services", icon: Boxes },
    { type: "link", label: t("sidebar.orders"), href: "/orders", icon: ShoppingCart },
    { type: "link", label: t("sidebar.actions"), href: "/orders?tab=actions", icon: Zap },
    { type: "link", label: t("sidebar.autoRefill"), href: "/auto-refill", icon: RefreshCw },
    { type: "link", label: t("sidebar.deposit"), href: "/deposit", icon: Wallet },
    { type: "link", label: t("sidebar.transactions"), href: "/transactions", icon: History },
    { type: "link", label: t("sidebar.updates"), href: "/updates", icon: Bell, badge: "جديد" },
    { type: "link", label: t("sidebar.terms"), href: "/terms", icon: FileText },
    { type: "link", label: t("sidebar.createSite"), href: "/reseller", icon: Globe2, badge: "مجاني", badgeColor: "green" },
    { type: "link", label: t("sidebar.siteManagement"), href: user?.role === "admin" ? "/admin" : "/site-management", icon: SlidersHorizontal },
  ];

  const isActive = (href: string) => {
    return pathname === href.split("?")[0];
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-[80] h-full w-[280px] transform bg-[var(--color-bg)] shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="relative flex h-[200px] flex-col items-center justify-center bg-gradient-to-b from-[var(--color-primary)]/20 to-transparent p-4">
            <button onClick={onClose} className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] text-zinc-400">
              <X size={18} />
            </button>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-orange-500/30">
              <User size={36} />
            </div>
            <div className="mt-3 text-center">
              <div className="text-lg font-black text-white">{user?.username || "زائر"}</div>
              <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm font-bold text-[var(--color-primary)]">
                $ {Number(user?.balance || 0).toFixed(4)}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <div className="mb-2 text-xs font-bold text-zinc-500">{t("sidebar.menu")}</div>
            {menuItems.map((item, idx) => {
              const active = item.type === "link" && isActive(item.href);
              const content = (
                <>
                  <span className={`font-bold ${active ? "text-[var(--color-primary)]" : "text-white"}`}>{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.badgeColor === "green" ? "bg-green-500/20 text-green-400" : "bg-[var(--color-primary)] text-white"}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.icon && <item.icon size={18} className={active ? "text-[var(--color-primary)]" : "text-zinc-400"} />}
                  </div>
                </>
              );

              const className = `flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-[var(--color-surface)] ${active ? "bg-[var(--color-surface)]" : ""}`;

              return item.type === "link" ? (
                <Link key={idx} href={item.href} onClick={onClose} className={className}>
                  {content}
                </Link>
              ) : (
                <button key={idx} onClick={() => { item.action(); }} className={`w-full text-right ${className}`}>
                  {content}
                </button>
              );
            })}

            {user?.role === "admin" && (
              <>
                <div className="mb-2 mt-4 text-xs font-bold text-zinc-500">{t("sidebar.menu")}</div>
                <Link
                  href="/admin"
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-[var(--color-surface)] ${pathname === "/admin" ? "bg-[var(--color-surface)]" : ""}`}
                >
                  <span className={`font-bold ${pathname === "/admin" ? "text-[var(--color-primary)]" : "text-white"}`}>{t("sidebar.adminPanel")}</span>
                  <Shield size={18} className={pathname === "/admin" ? "text-[var(--color-primary)]" : "text-[var(--color-primary)]"} />
                </Link>
              </>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] p-3">
            <button
              onClick={logout}
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-red-400 transition hover:bg-red-500/10"
            >
              <span className="font-bold">{t("sidebar.logout")}</span>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Language selection sheet */}
      {showLangSheet && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-4 sm:items-center animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 animate-slideUp">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-white">{t("language.title")}</h3>
              <button onClick={() => setShowLangSheet(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-zinc-400">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {(["ar", "en"] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLangSelect(lang)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${
                    locale === lang
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-zinc-300 hover:border-[var(--color-primary)]/30"
                  }`}
                >
                  <span className="font-bold">{t(`language.${lang}`)}</span>
                  {locale === lang && <Check size={18} className="text-[var(--color-primary)]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
