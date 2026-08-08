"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Link from "next/link";
import { Shield, Plus, Minus, AlertCircle, Smartphone, Users, Palette, MessageSquare } from "lucide-react";

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
        <div className="flex items-center gap-3">
          <Shield className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">لوحة الأدمن</h1>
        </div>

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

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="mb-4 text-lg font-black text-white">إدارة رصيد المستخدمين</h2>
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
              className="w-full rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
            >
              {loading ? "جاري..." : "تنفيذ"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
