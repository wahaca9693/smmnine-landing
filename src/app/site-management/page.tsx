"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import { SlidersHorizontal, User, Wallet, FileText, Globe2, LogOut, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SiteManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; balance: number; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => setUser(data.user || null));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const cards = [
    { href: "/dashboard", label: "مركز الدعم", icon: User, desc: "تواصل مع فريق الدعم" },
    { href: "/deposit", label: "شحن الرصيد", icon: Wallet, desc: "اختر طريقة الدفع المناسبة" },
    { href: "/terms", label: "شروط الاستخدام", icon: FileText, desc: "اقرأ شروط الخدمة" },
    { href: "/reseller", label: "أنشئ موقعك مجاناً", icon: Globe2, desc: "احصل على موقع خاص بك" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">إدارة موقعك</h1>
        </div>

        {user && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white">
                <User size={28} />
              </div>
              <div>
                <div className="text-lg font-black text-white">{user.username}</div>
                <div className="text-sm text-zinc-400">{user.role === "admin" ? "مدير" : "مستخدم"}</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-3 py-0.5 text-sm font-bold text-[var(--color-primary)]">
                  $ {Number(user.balance).toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition hover:border-[var(--color-primary)]/30"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
                <card.icon size={22} />
              </span>
              <div>
                <div className="font-bold text-white">{card.label}</div>
                <div className="text-xs text-zinc-500">{card.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 text-[var(--color-primary)]" />
            <div>
              <div className="font-bold text-white">إعدادات متقدمة</div>
              <p className="text-sm text-zinc-400">
                الإعدادات المتقدمة متوفرة لحسابات الأدمن فقط. إذا كنت بحاجة لمساعدة تواصل مع الدعم الفني.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 font-bold text-red-400 transition hover:bg-red-500/20"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </DashboardLayout>
  );
}
