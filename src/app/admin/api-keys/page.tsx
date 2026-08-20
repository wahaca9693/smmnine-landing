"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";
import { KeyRound, ArrowLeft, Power, Trash2, Users, Activity } from "lucide-react";

interface ApiKeyRow {
  id: number;
  user_id: number;
  username: string;
  api_key: string;
  name: string;
  requests_count: number;
  last_used_at: string | null;
  is_active: number;
  created_at: string;
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch {
      /* لا شيء */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const act = async (id: number, action: "toggle" | "delete") => {
    const res = await fetch(`/api/admin/api-keys`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    setMessage(data.error || data.message || null);
    refresh();
  };

  const activeCount = keys.filter((k) => Number(k.is_active)).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-deep)] shadow-lg shadow-[var(--color-gold)]/20">
              <KeyRound size={24} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">مفاتيح API للمستخدمين</h1>
              <p className="text-xs text-zinc-500">إدارة مفاتيح الربط لكل المستخدمين</p>
            </div>
          </div>
          <Link href="/admin" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-zinc-300">
            <ArrowLeft size={14} className="inline ml-1" />لوحة الأدمن
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <KeyRound size={13} className="text-[var(--color-gold)]" /> إجمالي المفاتيح
            </div>
            <div className="mt-1 text-2xl font-black text-white">{keys.length}</div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Activity size={13} className="text-green-400" /> مفاتيح نشطة
            </div>
            <div className="mt-1 text-2xl font-black text-gradient-luxe">{activeCount}</div>
          </div>
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-xs font-bold ${message.includes("تم") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}

        <div className="glass-card divide-y divide-[var(--color-border)]/50 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-sm text-zinc-500">جاري التحميل...</div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <Users size={28} className="text-zinc-600" />
              <p className="text-sm text-zinc-500">لا توجد مفاتيح API مسجلة حتى الآن</p>
            </div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{k.username || `مستخدم #${k.user_id}`}</span>
                      {Number(k.is_active) ? (
                        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[9px] font-black text-green-400">نشط</span>
                      ) : (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-black text-red-400">ملغى</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-black/40 px-2 py-1">
                      <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--color-gold-pale)]">
                        {k.api_key}
                      </code>
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      استخدامات: <span className="font-bold text-zinc-300">{k.requests_count}</span>
                      {k.last_used_at && <> · آخر استخدام: {new Date(k.last_used_at).toLocaleString("ar")}</>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => act(k.id, "toggle")}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-2.5 py-1.5 text-[10px] font-black text-[var(--color-gold)]"
                    >
                      <Power size={11} /> {Number(k.is_active) ? "تعطيل" : "تفعيل"}
                    </button>
                    <button
                      onClick={() => act(k.id, "delete")}
                      className="flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-black text-red-400"
                    >
                      <Trash2 size={11} /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
