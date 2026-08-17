"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, ListOrdered, PlusCircle, Wallet, Boxes } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(false);
  const lastScroll = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        // إخفاء عند النزول، إظهار عند الصعود — مع استثناء: يظهر دائماً في أسفل الصفحة
        if (y > lastScroll.current && y > 80) setHidden(true);
        else setHidden(false);
        lastScroll.current = y;
        if (max > 0 && y >= max - 4) setHidden(false);
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = [
    { href: "/services", label: t("bottomNav.services"), icon: Boxes },
    { href: "/deposit", label: t("bottomNav.deposit"), icon: Wallet },
    { href: "/orders/new", label: t("bottomNav.newOrder"), icon: PlusCircle, center: true },
    { href: "/orders", label: t("bottomNav.orders"), icon: ListOrdered },
    { href: "/dashboard", label: t("bottomNav.support"), icon: LifeBuoy },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 pb-safe border-t border-[var(--color-gold)]/50 bg-[linear-gradient(180deg,#3d2e10_0%,#2b200a_55%,#1d1506_100%)] shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        <span className="hidden lg:block">MKR-XYZ</span>
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 transition ${active ? "text-[var(--color-gold-bright)]" : "text-[var(--color-gold-pale)]/70 hover:text-[var(--color-gold)]"}`}
            >
              {item.center ? (
                <span className="btn-glow-pulse flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full gradient-luxe text-[#111] shadow-[0_0_30px_-2px_rgba(255,215,0,0.6)]">
                  <item.icon size={24} />
                </span>
              ) : (
                <span className={`flex items-center justify-center rounded-xl transition-all ${active ? "bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)] shadow-[0_0_16px_-6px_rgba(255,215,0,0.55)]" : "text-[var(--color-gold)]/85 hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-gold-bright)]"}`}>
                  <item.icon size={22} strokeWidth={2} />
                </span>
              )}
              <span className={`text-[10px] font-bold ${item.center ? "-mt-2" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
