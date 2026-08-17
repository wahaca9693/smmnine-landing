"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Link from "next/link";
import { Shield, Plus, Minus, AlertCircle, Coins, Smartphone, Users, Palette, MessageSquare, Wallet, KeyRound, TrendingUp, Eye } from "lucide-react";

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"add" | "subtract">("add");
  const [result, setResult] = useState<{ message?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.role === "admin") setAuthorized(true);
        else setAuthorized(false);
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, amount, type }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  if (authorized === null) {
    return (
      <DashboardLayout>
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      </DashboardLayout>
    );
  }

  if (authorized === false) {
    return (
      <DashboardLayout>
        <div className="flex h-60 flex-col items-center justify-center text-center text-red-400">
          <AlertCircle size={48} className="mb-3" />
          <h2 className="text-xl font-bold">غير مصرح</h2>
          <p className="text-zinc-500">لا تملك صلاحية الوصول إلى هذه الصفحة</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-deep)] shadow-lg shadow-[var(--color-gold)]/20">
              <Shield size={24} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">لوحة الأدمن</h1>
              <p className="text-xs text-zinc-500">إدارة المنصة بالكامل</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-3 text-center">
            <TrendingUp size={18} className="mx-auto mb-1 text-[var(--color-gold)]" />
            <div className="text-lg font-black text-white">$5.00</div>
            <div className="text-[10px] text-zinc-500">شحن اليوم</div>
          </div>
          <div className="glass-card rounded-2xl p-3 text-center">
            <Users size={18} className="mx-auto mb-1 text-[var(--color-gold)]" />
            <div className="text-lg font-black text-white">8</div>
            <div className="text-[10px] text-zinc-500">المستخدمون</div>
          </div>
          <div className="glass-card rounded-2xl p-3 text-center">
            <Eye size={18} className="mx-auto mb-1 text-[var(--color-gold)]" />
            <div className="text-lg font-black text-white">6</div>
            <div className="text-[10px] text-zinc-500">طلبات اليوم</div>
          </div>
        </div>

        <Link
          href="/admin/providers"
          className="luxe-link flex items-center gap-4 rounded-2xl glass-card p-5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/10 text-purple-400">
            <TrendingUp size={24} />
          </span>
          <div>
            <div className="font-bold text-white">مزودو الخدمات</div>
            <div className="text-xs text-zinc-500">ربط مزودي SMM الخارجيين وإسعار خدماتهم</div>
          </div>
        </Link>

        <Link
          href="/admin/api-keys"
          className="luxe-link flex items-center gap-4 rounded-2xl glass-card p-5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-gold)]/20 to-[var(--color-gold-deep)]/10 text-[var(--color-gold)]">
            <KeyRound size={24} />
          </span>
          <div>
            <div className="font-bold text-white">مفاتيح API للمستخدمين</div>
            <div className="text-xs text-zinc-500">إدارة مفاتيح API للمستخدمين وإيقافها</div>
          </div>
        </Link>

        <Link
          href="/admin/crypto"
          className="luxe-link flex items-center gap-4 rounded-2xl glass-card p-5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-gold)]/20 to-[var(--color-gold-deep)]/10 text-[var(--color-gold)]">
            <Coins size={24} />
          </span>
          <div>
            <div className="font-bold text-white">إيداعات الكريبتو</div>
            <div className="text-xs text-zinc-500">مراقبة شحن USDT/BNB/BTC والشحن التلقائي</div>
          </div>
        </Link>

        <Link
          href="/admin/asiacell"
          className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition hover:border-[var(--color-primary)]/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
            <Smartphone size={24} />
          </span>
          <div>
            <div className="font-bold text-white">إعدادات آسياسيل</div>
            <div className="text-xs text-zinc-500">ربط رقم المتجر وفحص التحويلات</div>
          </div>
        </Link>

        <Link
          href="/admin/tickets"
          className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition hover:border-[var(--color-primary)]/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
            <MessageSquare size={24} />
          </span>
          <div>
            <div className="font-bold text-white">تذاكر الدعم</div>
            <div className="text-xs text-zinc-500">عرض وإدارة تذاكر المستخدمين</div>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition hover:border-[var(--color-primary)]/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
            <Users size={24} />
          </span>
          <div>
            <div className="font-bold text-white">المستخدمين</div>
            <div className="text-xs text-zinc-500">حظر، حذف، إضافة/خصم رصيد، عرض الطلبات</div>
          </div>
        </Link>

        <Link
          href="/admin/theme"
          className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition hover:border-[var(--color-primary)]/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
            <Palette size={24} />
          </span>
          <div>
            <div className="font-bold text-white">محرر الألوان</div>
            <div className="text-xs text-zinc-500">تغيير ألوان الموقع كاملة</div>
          </div>
        </Link>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
            <Wallet size={20} className="text-[var(--color-gold)]" /> إدارة رصيد المستخدمين
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-zinc-400">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-zinc-400">المبلغ</label>
              <input
                type="number"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("add")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-bold ${type === "add" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-[var(--color-surface)] text-zinc-400"}`}
              >
                <Plus size={18} /> إضافة
              </button>
              <button
                type="button"
                onClick={() => setType("subtract")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-bold ${type === "subtract" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-[var(--color-surface)] text-zinc-400"}`}
              >
                <Minus size={18} /> خصم
              </button>
            </div>
            {result && (
              <div className={`rounded-xl p-3 text-sm font-bold ${result.error ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                {result.error || result.message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full rounded-xl py-3.5 font-black text-black disabled:opacity-50"
            >
              {loading ? "جاري..." : "تنفيذ"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
