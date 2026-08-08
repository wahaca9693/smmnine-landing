"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, ListOrdered, PlusCircle, Wallet, Boxes } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const items = [
    { href: "/services", label: t("bottomNav.services"), icon: Boxes },
    { href: "/deposit", label: t("bottomNav.deposit"), icon: Wallet },
    { href: "/orders/new", label: t("bottomNav.newOrder"), icon: PlusCircle, center: true },
    { href: "/orders", label: t("bottomNav.orders"), icon: ListOrdered },
    { href: "/dashboard", label: t("bottomNav.support"), icon: Headphones },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[#0a0a0a] pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 transition ${active ? "text-[var(--color-primary)]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {item.center ? (
                <span className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-orange-500/30">
                  <item.icon size={24} />
                </span>
              ) : (
                <item.icon size={22} className={active ? "fill-current" : ""} />
              )}
              <span className={`text-[10px] font-bold ${item.center ? "-mt-2" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
