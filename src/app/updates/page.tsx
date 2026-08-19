"use client";

import DashboardLayout from "../components/DashboardLayout";
import { Bell, Sparkles, Wrench, Shield, Zap } from "lucide-react";

const updates = [
  {
    date: "7 أغسطس 2026",
    title: "تحديث جديد للمنصة",
    body: "تم إضافة قائمة جانبية كاملة، دعم تبديل اللغة، التعبئة التلقائية، سجل المعاملات، وتحسين التنقل.",
    icon: Sparkles,
    color: "text-[var(--color-primary)]",
  },
  {
    date: "5 أغسطس 2026",
    title: "تحسين API الطلبات",
    body: "إصلاح مشكلة تسلسل BigInt وربط الطلبات مباشرة بواجهة API مع خصم الرصيد تلقائياً.",
    icon: Zap,
    color: "text-yellow-400",
  },
  {
    date: "1 أغسطس 2026",
    title: "إضافة طرق الدفع",
    body: "USDT BEP20، TRC20، Binance Pay، TON، Litecoin، Telegram Stars، زين العراق، واسياسيل.",
    icon: Shield,
    color: "text-green-400",
  },
  {
    date: "28 يوليو 2026",
    title: "تحسينات عامة",
    body: "تحسين تصميم الصفحات، دعم RTL، وأيقونات المنصات بصيغة SVG.",
    icon: Wrench,
    color: "text-blue-400",
  },
];

export default function UpdatesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">التحديثات</h1>
        </div>

        <div className="space-y-3">
          {updates.map((u, i) => (
            <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] ${u.color}`}>
                  <u.icon size={20} />
                </span>
                <div className="flex-1">
                  <div className="text-xs text-zinc-500">{u.date}</div>
                  <h3 className="mt-1 font-black text-white">{u.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{u.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
