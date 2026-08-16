"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Server,
  Plus,
  Trash2,
  Wallet,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Power,
  PowerOff,
  Activity,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Provider {
  id: number;
  name: string;
  api_url: string;
  api_key: string;
  balance: string;
  balance_fetched_at: string;
  notes: string;
  is_active: number;
}

interface ProviderService {
  id: number;
  provider_id: number;
  provider_name: string;
  remote_service_id: string;
  name: string;
  category: string;
  rate: number;
  min: number;
  max: number;
  type: string;
  markup_percent: number;
  sell_rate: number;
  is_active: number;
}

interface ServiceRowProps {
  s: ProviderService;
  onUpdate: (id: number, markup: number) => void;
  onToggle: (id: number, is_active: number) => void;
  onDelete: (id: number) => void;
}

function ServiceRow({ s, onUpdate, onToggle, onDelete }: ServiceRowProps) {
  const [name, setName] = useState(s.name);
  const [savingName, setSavingName] = useState(false);
  const saveName = async () => {
    if (name.trim() === s.name) return;
    setSavingName(true);
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename-service", id: s.id, name: name.trim() }),
    });
    setSavingName(false);
    if (!res.ok) setName(s.name);
  };
  const clearNewBadge = async () => {
    await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear-new-badge", id: s.id }),
    });
    load(); // تحديث القائمة من الأدمن
  };
  return (
    <div className={`grid grid-cols-[36px_1fr_64px_70px_80px_76px] gap-1.5 border-t border-[var(--color-border)]/50 bg-[var(--color-surface)]/40 px-3 py-2.5 text-xs ${!s.is_active ? "opacity-60" : ""}`}>
      <span className="font-bold text-zinc-500">{s.remote_service_id}</span>
      <div className="min-w-0">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") { setName(s.name); (e.target as HTMLInputElement).blur(); }
          }}
          className="w-full truncate rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[12px] font-bold text-white outline-none transition focus:border-[var(--color-primary)]/50"
          title="اضغط لتعديل اسم الخدمة — التغيير يظهر فورًا عند كل المستخدمين"
        />
        {name !== s.name && <span className="text-[9px] font-black text-amber-400">● غير محفوظ</span>}
        <div className="truncate text-[10px] text-zinc-500">{s.category || s.type || "عام"} · min {s.min} · max {s.max} · لكل 1000</div>
      </div>
      {Number((s as any).is_new) === 1 && (
        <span
          onClick={clearNewBadge}
          title="إزالة وسم الجديد"
          className="flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 text-[8px] font-black text-black shadow-[0_0_10px_-3px_#f59e0b]"
        >
          جديد
        </span>
      )}
      <div className="text-center">
        <div className="text-zinc-500">${s.rate}</div>
        <div className="text-[9px] text-zinc-600">تكلفة</div>
      </div>
      <div className="text-center">
        <div className="font-black text-[var(--color-primary)]">${s.sell_rate}</div>
        <div className="text-[9px] text-zinc-600">سعر العرض</div>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          defaultValue={s.markup_percent}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v) && v !== s.markup_percent) onUpdate(s.id, v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-1 text-white"
        />
      </div>
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => onToggle(s.id, s.is_active)}
          title={s.is_active ? "إيقاف الخدمة (تخفى عن المستخدمين)" : "إعادة الخدمة (تظهر للمستخدمين)"}
          className="transition hover:scale-110"
        >
          {s.is_active ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} className="text-zinc-500" />}
        </button>
        <button
          onClick={() => onDelete(s.id)}
          title="حذف الخدمة نهائيًا (تعود عند المزامنة التالية)"
          className="text-zinc-500 transition hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState({ name: "", api_url: "", api_key: "", notes: "" });
  const [globalMarkup, setGlobalMarkup] = useState(30);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<{ message?: string; error?: string } | null>(null);
  const [deletedServiceIds, setDeletedServiceIds] = useState<Set<number>>(new Set());
  const [previewing, setPreviewing] = useState<number | null>(null); // معرّف المزود المعروض خدماته
  const [previewServices, setPreviewServices] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");

  const load = () => {
    fetch("/api/admin/providers")
      .then((res) => (res.ok ? res.json() : { providers: [] }))
      .then((d) => setProviders(d.providers || []));
    fetch("/api/admin/providers?mode=services")
      .then((res) => (res.ok ? res.json() : { services: [] }))
      .then((d) => setServices(d.services || []));
    fetch("/api/admin/providers?mode=logs")
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((d) => setLogs(d.logs || []));
  };

  useEffect(() => {
    load();
    // تحديث تلقائي للأرصدة من سيرفرات المزودين عند فتح الصفحة
    refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBalances = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-balances" }),
      });
      load();
    } finally {
      setRefreshing(false);
    }
  };

  const saveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, action: "save", id: editing?.id }),
    });
    const data = await res.json();
    if (data.error) setResult({ error: data.error });
    else {
      setResult({ message: `تم الحفظ بنجاح — تم فحص الاتصال والرصيد: ${data.balance || "لا يوجد"}` });
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", api_url: "", api_key: "", notes: "" });
      load();
    }
    setLoading(false);
  };

  const syncServices = async (providerId: number) => {
    setSyncing(providerId);
    setResult(null);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", providerId, markup: globalMarkup }),
      });
      const data = await res.json();
      if (data.error) setResult({ error: data.error });
      else {
        setResult({ message: `تم استيراد ${data.imported} خدمة بنجاح مع هامش ربح ${globalMarkup}%` });
        load();
      }
    } finally {
      setSyncing(null);
    }
  };

  const toggleProvider = async (id: number) => {
    await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    load();
  };

  const deleteProvider = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المزود وجميع خدماته؟")) return;
    await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  };

  const updateServiceMarkup = async (id: number, markup: number) => {
    await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-service", id, markup_percent: markup }),
    });
    load();
  };

  const toggleService = async (id: number, is_active: number) => {
    await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-service", id, markup_percent: undefined as unknown as number, is_active: is_active ? 0 : 1 }),
    });
    load();
  };

  const deleteService = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة نهائيًا؟")) return;
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-service", id }),
    });
    const data = await res.json();
    if (data.ok) {
      setDeletedServiceIds((prev) => new Set([...prev, id]));
      load();
    } else {
      setResult({ error: data.error || "فشل حذف الخدمة" });
    }
  };

  const updateAllProviderServices = async (providerId: number) => {
    await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-provider-services", providerId, markup_percent: globalMarkup }),
    });
    load();
  };

  const openPreview = async (providerId: number) => {
    setPreviewing(providerId);
    setPreviewLoading(true);
    setPreviewSearch("");
    try {
      const res = await fetch(`/api/admin/providers?mode=preview&providerId=${providerId}`);
      const data = await res.json();
      if (res.ok) {
        setPreviewServices(data.services || []);
      } else {
        setPreviewServices([]);
        setResult({ error: data.error || "تعذر جلب الخدمات" });
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const addServiceFromPreview = async (providerId: number, remote_service_id: string) => {
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-service", providerId, remote_service_id, markup_percent: globalMarkup }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult({ message: "أُضيفت الخدمة — ظاهرة للمستخدمين الآن" });
      openPreview(providerId); // تحديث الحالة (أُضيفت)
    } else {
      setResult({ error: data.error || "تعذرت الإضافة" });
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] p-4 pb-16">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-[0_0_24px_-6px_#a855f7]">
              <Server size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white">مزودو الخدمات</h1>
              <div className="text-xs text-zinc-500">اربط مزودي SMM خارجيين واستورد خدماتهم تلقائيًا</div>
            </div>
          </div>
            <div className="flex items-center gap-2">
            <button
              onClick={refreshBalances}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-bold text-white transition hover:border-[var(--color-primary)]/40 disabled:opacity-50"
              title="تحديث أرصدة جميع المزودين من سيرفراتهم"
            >
              {refreshing ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
              <span className="hidden sm:inline">تحديث الأرصدة</span>
            </button>
            <Link href="/admin" className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-bold text-white transition hover:border-[var(--color-primary)]/40">
              <ArrowLeft size={16} />
              الرئيسية
            </Link>
            </div>
        </div>

        {/* هامش الربح العام */}
        <div className="card-luxe rounded-3xl border p-5">
          <div className="mb-3 flex items-center gap-3">
            <Activity size={20} className="text-[var(--color-primary)]" />
            <div className="font-black text-white">هامش الربح الافتراضي عند المزامنة</div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={globalMarkup}
              onChange={(e) => setGlobalMarkup(Number(e.target.value))}
              className="input-luxe w-28 rounded-xl px-4 py-3 text-white"
            />
            <span className="text-zinc-400">%</span>
            <span className="text-xs text-zinc-500">يُضاف فوق سعر التكلفة (مثال: تكلفة $1.00 + هامش 30% = سعر البيع $1.30 لكل 1000)</span>
          </div>
        </div>

        {/* نموذج إضافة/تعديل مزود */}
        {showForm && (
          <div className="card-luxe rounded-3xl border p-5">
            <h2 className="mb-4 text-lg font-black text-gradient-luxe">{editing ? "تعديل مزود" : "إضافة مزود جديد"}</h2>
            <form onSubmit={saveProvider} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-400">اسم المزود</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-luxe w-full rounded-xl px-4 py-3 text-white"
                  placeholder="مثال: JustAnotherPanel"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-400">رابط API</label>
                <input
                  value={form.api_url}
                  onChange={(e) => setForm({ ...form, api_url: e.target.value })}
                  className="input-luxe w-full rounded-xl px-4 py-3 text-white"
                  placeholder="https://panel.example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-400">مفتاح API</label>
                <input
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  className="input-luxe w-full rounded-xl px-4 py-3 text-white"
                  placeholder="key-xxxxxxxxxxxx"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-400">ملاحظات (اختياري)</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-luxe w-full rounded-xl px-4 py-3 text-white"
                  placeholder="مثال: مزود خدمات انستغرام"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 py-3 font-black text-white shadow-[0_0_28px_-8px_#a855f7] transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="mx-auto animate-spin" /> : "حفظ وفحص الاتصال"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 font-bold text-zinc-300"
                >
                  إلغاء
                </button>
              </div>
              <div className="rounded-xl bg-[var(--color-card)]/60 p-3 text-xs text-zinc-400 leading-relaxed">
                يدعم النظام أي مزود يستخدم SMM Panel API القياسي (/api/v2) مثل JustAnotherPanel و SMMFollowers و SMMKings وغيرها.
                عند الحفظ يتم اختبار الاتصال تلقائيًا، وعقب المزامنة تجلب جميع خدمات المزود وأسعاره وتعرضها هنا.
              </div>
            </form>
          </div>
        )}

        {result && (
          <div className={`rounded-2xl border p-4 text-sm font-bold ${result.error ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-green-500/30 bg-green-500/10 text-green-400"}`}>
            {result.error || result.message}
          </div>
        )}

        {/* قائمة المزودين */}
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className={`card-luxe rounded-3xl border p-5 transition ${p.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-[0_0_24px_-6px_#a855f7]">
                    <Server size={22} />
                  </span>
                  <div>
                    <div className="font-black text-white">{p.name}</div>
                    <div className="text-xs text-zinc-500 truncate max-w-[200px]">{p.api_url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleProvider(p.id)}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-zinc-400 transition hover:text-[var(--color-primary)]"
                    title={p.is_active ? "تعطيل" : "تفعيل"}
                  >
                    {p.is_active ? <Power size={16} className="text-green-400" /> : <PowerOff size={16} />}
                  </button>
                  <button
                    onClick={() => { setEditing(p); setForm({ name: p.name, api_url: p.api_url, api_key: p.api_key, notes: p.notes || "" }); setShowForm(true); }}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-zinc-400 transition hover:text-[var(--color-primary)]"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => openPreview(p.id)}
                    className="rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 text-xs font-black text-[var(--color-primary)] transition hover:border-[var(--color-primary)]/60"
                    title="استعراض جميع خدمات المزود من سيرفره — إضافة انتقائية دون مزامنة كاملة"
                  >
                    استعراض خدماته
                  </button>
                  <button
                    onClick={() => deleteProvider(p.id)}
                    className="rounded-full border border-red-500/20 bg-[var(--color-surface)] p-2 text-red-400/60 transition hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {p.balance && p.balance !== "غير متاح" && p.balance !== "" && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--color-primary)]/15 bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className="text-[var(--color-primary)]" />
                    <span className="font-black text-white">رصيدك لدى المزود:</span>
                    <b className="text-lg text-[var(--color-primary)]">${p.balance}</b>
                  </div>
                  {p.balance_fetched_at && <span className="text-zinc-500 text-[10px]">(محدث {new Date(p.balance_fetched_at).toLocaleTimeString("ar-EG")})</span>}
                </div>
              )}
              {p.balance === "غير متاح" || p.balance === "" ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <Wallet size={13} />
                  <span>تعذر جلب رصيد المزود — تحقق من المفتاح أو الاتصال</span>
                </div>
              ) : null}

              {/* تصنيفات خدمات المزود */}
              {(() => {
                const svc = services.filter((s) => s.provider_id === p.id);
                if (svc.length === 0) return null;
                const groups = new Map<string, { count: number; name: string }>();
                for (const s of svc) {
                  const cat = (s.category || s.type || "أخرى").trim() || "أخرى";
                  const g = groups.get(cat) || { count: 0, name: cat };
                  g.count += 1;
                  groups.set(cat, g);
                }
                return (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[10px] font-bold tracking-wide text-zinc-500">نوع الخدمات المتوفرة ({svc.length} خدمة)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...groups.entries()].map(([cat, g]) => (
                        <span key={cat} className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2.5 py-1 text-[11px] font-bold text-zinc-300">
                          {g.name} <b className="text-[var(--color-primary)]">{g.count}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => openPreview(p.id)}
                  disabled={previewing === p.id && previewLoading}
                  className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 text-xs font-black text-[var(--color-primary)] transition hover:border-[var(--color-primary)]/60"
                >
                  استعراض خدماته
                </button>
                <input
                  type="number"
                  placeholder="هامش %"
                  className="input-luxe w-20 rounded-xl px-3 py-2 text-sm text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateAllProviderServices(p.id);
                  }}
                />
                <button
                  onClick={() => updateAllProviderServices(p.id)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                >
                  تحديث أسعار الكل
                </button>
                <button
                  onClick={() => syncServices(p.id)}
                  disabled={syncing === p.id}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-black text-white shadow-[0_0_24px_-8px_#a855f7] transition hover:opacity-90 disabled:opacity-50"
                >
                  {syncing === p.id ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  مزامنة الخدمات
                </button>
              </div>

              {/* تبويبان: المضافة / الموقوفة */}
              {(() => {
                const all = services.filter((s) => s.provider_id === p.id && !deletedServiceIds.has(s.id));
                const active = all.filter((s) => s.is_active);
                const paused = all.filter((s) => !s.is_active);
                return (
                  <div className="mt-3 space-y-3">
                    {/* الخدمات المضافة (ظاهرة للمستخدمين) */}
                    <div>
                      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black tracking-wide text-zinc-500">
                        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-green-400">مضافة {active.length}</span>
                        <span className="text-zinc-500">تظهر في موقعك وتُخصم بسعر عروضك، وخصم المزود يبقى بسعر التكلفة</span>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto rounded-2xl border border-[var(--color-border)]">
                        {active.length === 0 && (
                          <div className="px-3 py-4 text-center text-xs text-zinc-500">لا توجد خدمات مضافة — اضغط مزامنة الخدمات لعرض جميع خدمات المزود</div>
                        )}
                        {active.map((s) => (
                          <ServiceRow key={s.id} s={s} onUpdate={updateServiceMarkup} onToggle={toggleService} onDelete={deleteService} />
                        ))}
                      </div>
                    </div>
                    {/* الخدمات الموقوفة */}
                    {paused.length > 0 && (
                      <div>
                        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black tracking-wide text-zinc-500">
                          <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-yellow-400">موقوفة {paused.length}</span>
                          <span className="text-zinc-500">مخفية عن المستخدمين — أعد تفعيلها لتظهر مجددًا</span>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto rounded-2xl border border-yellow-500/20">
                          {paused.map((s) => (
                            <ServiceRow key={s.id} s={s} onUpdate={updateServiceMarkup} onToggle={toggleService} onDelete={deleteService} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}

          <button
            onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", api_url: "", api_key: "", notes: "" }); }}
            className="w-full rounded-2xl border border-dashed border-[var(--color-border)] py-4 text-sm font-black text-zinc-400 transition hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
          >
            <Plus size={18} className="inline-block ml-1" /> إضافة مزود جديد
          </button>
        </div>

        {/* مودال الاستعراض الانتقائي لخدمات المزود */}
        {previewing !== null && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 backdrop-blur-sm sm:items-center" onClick={() => setPreviewing(null)}>
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-[var(--color-primary)]/20 bg-[#0c0c0c] sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
                <div>
                  <div className="text-lg font-black text-gradient-luxe">استعراض خدمات المزود</div>
                  <div className="text-[10px] text-zinc-500">جميع خدمات المزود مباشرة من سيرفره — أضف ما تعجبك فقط، وتظهر للمستخدمين فورًا بوسم "جديد"</div>
                </div>
                <button onClick={() => setPreviewing(null)} className="rounded-full border border-[var(--color-border)] p-2 text-zinc-400 transition hover:text-white">
                  <XCircle size={18} />
                </button>
              </div>
              <div className="p-4">
                <input
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  placeholder="ابحث في خدمات المزود..."
                  className="input-luxe mb-3 w-full rounded-xl px-4 py-3 text-sm text-white"
                />
                {previewLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
                    <Loader2 className="animate-spin" size={18} className="animate-spin" /> جاري جلب الخدمات من سيرفر المزود...
                  </div>
                ) : previewServices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">لا توجد خدمات لدى هذا المزود</div>
                ) : (
                  <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
                    {previewServices
                      .filter((s: any) => String(s.name || "").toLowerCase().includes(previewSearch.toLowerCase()) || String(s.service || "").includes(previewSearch))
                      .map((s: any) => (
                        <div key={s.service} className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs ${s.added ? "border-green-500/30 bg-green-500/5" : "border-[var(--color-border)] bg-[var(--color-surface)]/50"}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">#{s.service}</span>
                              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-0.5 text-[9px] text-zinc-400">{s.category || "عام"}</span>
                              {s.type && <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-300">{s.type}</span>}
                              <span className="text-[9px] text-zinc-600">min {s.min} · max {s.max}</span>
                            </div>
                            <div className="mt-0.5 truncate text-[10px] text-zinc-400">{s.name}</div>
                            <div className="mt-0.5 text-[10px]">
                              <span className="text-zinc-500">التكلفة: ${Number(s.rate).toFixed(5)}</span>
                              <span className="mx-1 text-zinc-600">|</span>
                              <span className="font-black text-[var(--color-primary)]">سعر العرض: ${(Number(s.rate) * (1 + globalMarkup / 100)).toFixed(5)} (هامش {globalMarkup}%)</span>
                            </div>
                          </div>
                          {s.added ? (
                            <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1.5 text-[10px] font-black text-green-400">
                              <CheckCircle2 size={12} /> مضافة
                            </span>
                          ) : (
                            <button
                              onClick={() => addServiceFromPreview(previewing!, String(s.service))}
                              className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1.5 text-[10px] font-black text-white shadow-[0_0_16px_-6px_#a855f7] transition hover:brightness-110"
                            >
                              <Plus size={12} /> إضافة
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
                <div className="mt-2 text-center text-[10px] text-zinc-600">الإضافة الانتقائية تحفظ الخدمة لدى المزود الأصلي بوسم "جديد" وتظهر فورًا عند كل المستخدمين ومستخدمي API</div>
              </div>
            </div>
          </div>
        )}

        {/* سجل التنفيذ */}
        {logs.length > 0 && (
          <div className="card-luxe rounded-3xl border p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
              <Activity size={20} className="text-[var(--color-primary)]" />
              سجل تنفيذ الطلبات عبر المزودين
            </h2>
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface)]/60 px-3 py-2 text-xs">
                  {l.status === "sent" ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : l.status === "failed" ? (
                    <XCircle size={14} className="text-red-400" />
                  ) : (
                    <Activity size={14} className="text-yellow-400" />
                  )}
                  <span className="text-zinc-300">مزود <b className="text-[var(--color-primary)]">{l.provider_name}</b></span>
                  <span className="text-zinc-500">طلب محلي #{l.local_order_id || "—"}</span>
                  <span className="text-zinc-500">رقم المزود: {l.remote_order_id || "—"}</span>
                  <span className={`font-bold ${l.status === "sent" ? "text-green-400" : l.status === "failed" ? "text-red-400" : "text-yellow-400"}`}>{l.status}</span>
                  {l.error && <span className="text-red-400/80 truncate">{l.error}</span>}
                  <span className="mr-auto text-zinc-500 text-[10px]">{new Date(l.created_at).toLocaleString("ar-EG")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
