"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { Users, Search, Ban, Unlock, Trash2, Plus, Minus, Eye, Shield, AlertCircle } from "lucide-react";

export default function AdminUsersPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => setAuthorized(data.user?.role === "admin"));
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const action = async (userId: number, action: string, extra?: any) => {
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId, ...extra }),
    });
    const data = await res.json();
    setMessage(data.error || data.message);
    fetchUsers();
  };

  if (authorized === null || (authorized === false && loading)) {
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
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Users className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">إدارة المستخدمين</h1>
        </div>

        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
            placeholder="ابحث باسم المستخدم أو البريد..."
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] py-3.5 pr-12 pl-4 text-sm text-white outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("فشل") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-white">{u.username}</div>
                    <div className="text-xs text-zinc-400">{u.email || "—"}</div>
                    <div className="mt-1 text-sm font-bold text-[var(--color-primary)]">$ {u.balance.toFixed(4)}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.is_banned ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {u.is_banned ? "محظور" : "نشط"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/users/${u.id}/orders`}
                    className="flex items-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-primary)] hover:text-white"
                  >
                    <Eye size={14} /> الطلبات
                  </Link>
                  <button
                    onClick={() => action(u.id, u.is_banned ? "unban" : "ban")}
                    className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${u.is_banned ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                  >
                    {u.is_banned ? <Unlock size={14} /> : <Ban size={14} />}
                    {u.is_banned ? "فك الحظر" : "حظر"}
                  </button>
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="flex items-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-primary)]"
                  >
                    <Plus size={14} /> رصيد
                  </button>
                  <button
                    onClick={() => action(u.id, "delete")}
                    className="flex items-center gap-1 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={14} /> حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-4 sm:items-center animate-fadeIn">
            <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 animate-slideUp">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-white">رصيد {selectedUser.username}</h3>
                <button onClick={() => { setSelectedUser(null); setAmount(""); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-zinc-400">×</button>
              </div>
              <input
                type="number"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="المبلغ"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  onClick={() => { action(selectedUser.id, "addBalance", { amount }); setSelectedUser(null); setAmount(""); }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-500/10 py-3 font-bold text-green-400"
                >
                  <Plus size={18} /> إضافة
                </button>
                <button
                  onClick={() => { action(selectedUser.id, "subtractBalance", { amount }); setSelectedUser(null); setAmount(""); }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 font-bold text-red-400"
                >
                  <Minus size={18} /> خصم
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
