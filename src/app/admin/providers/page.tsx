"use client";
import { useEffect, useMemo, useState } from "react";
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
  ListChecks,
  PenLine,
  Zap,
  Search,
  Eye,
  EyeOff,
  X,
  Link2,
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
  is_new?: number;
}

/* ══════════ صف الخدمة: بطاقة أفقية واحدة مضغوطة ══════════ */
interface ServiceRowProps {
  s: ProviderService;
  onNameSave: (id: number, name: string) => void;
  onMarkup: (id: number, markup: number) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

function ServiceRow({ s, onNameSave, onMarkup, onToggle, onDelete }: ServiceRowProps) {
  const [name, setName] = useState(s.name);
  const [mark, setMark] = useState(String(s.markup_percent));
  const [dirtyName, setDirtyName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const commitName = async () => {
    const n = name.trim();
    if (!n || n === s.name || savingName) { if (n !== s.name) setName(s.name); setDirtyName(false); return; }
    setSavingName(true);
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename-service", id: s.id, name: n }),
    });
    setSavingName(false);
    if (res.ok) onNameSave(s.id, n);
    else setName(s.name);
    setDirtyName(false);
  };

  const commitMarkup = () => {
    const v = Number(mark);
    if (!isNaN(v) && v >= 0 && v !== s.markup_percent) onMarkup(s.id, v);
    else setMark(String(s.markup_percent));
  };

  const isNew = Number((s as any).is_new) === 1;

  return (
    <div className={`mx-2.5 my-1.5 rounded-2xl border bg-[var(--color-surface-2)] px-3 py-3 transition ${s.is_active ? "border-[var(--color-gold)]/25" : "border-red-500/20 opacity-70"}`}>
      {/* السطر الأول: الرقم + الاسم القابل للتعديل + وسم جديد */}
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] font-black text-[var(--color-gold-bright)]">#{s.remote_service_id}</span>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setDirtyName(true); }}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setName(s.name); setDirtyName(false); (e.target as HTMLInputElement).blur(); } }}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-0.5 text-[13px] font-black text-white outline-none transition focus:bg-[var(--color-surface-3)]"
          title="اضغط لتعديل اسم الخدمة — التغيير يظهر فورًا عند كل المستخدمين"
        />
        {dirtyName && <span className="shrink-0 text-[9px] font-black text-amber-400">●</span>}
        {isNew && <span className="shrink-0 rounded-full bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] px-2 py-0.5 text-[9px] font-black text-black">جديد</span>}
      </div>

      {/* السطر الثاني: التصنيف + الكميات */}
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
        <span className="rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 font-bold text-[var(--color-gold-pale)]">{s.category || s.type || "عام"}</span>
        <span>الحد الأدنى {s.min.toLocaleString("en-US")}</span>
        <span>·</span>
        <span>الأقصى {s.max.toLocaleString("en-US")}</span>
      </div>

      {/* السطر الثالث: الأسعار + هامش الربح */}
      <div className="mt-2 grid grid-cols-3 items-center gap-1.5">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1.5 text-center">
          <div className="text-[8.5px] font-bold text-zinc-500">التكلفة /1000</div>
          <div className="text-[12px] font-black text-white">${Number(s.rate).toFixed(3)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-gold)]/35 bg-gradient-to-b from-[var(--color-gold)]/15 to-transparent px-2 py-1.5 text-center">
          <div className="text-[8.5px] font-bold text-[var(--color-gold-pale)]">سعر العرض</div>
          <div className="text-[12px] font-black text-[var(--color-gold-bright)]">${Number(s.sell_rate).toFixed(3)}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[9px] font-black text-zinc-400">ربح%</span>
          <input
            type="number"
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            onBlur={commitMarkup}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="h-8 w-full rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-1 text-center text-[12px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)]"
          />
        </div>
      </div>

      {/* السطر الرابع: الأزرار المتساوية */}
      <div className="mt-2 flex items-center gap-1.5">
        <button
          onClick={() => onToggle(s.id)}
          className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[11px] font-black transition active:scale-[0.97] ${s.is_active ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-zinc-700 bg-[var(--color-surface)] text-zinc-400"}`}
          title={s.is_active ? "إيقاف الخدمة (تخفى عن المستخدمين)" : "إعادة تفعيل الخدمة"}
        >
          {s.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          {s.is_active ? "مفعّلة" : "موقوفة"}
        </button>
        <button
          onClick={() => onDelete(s.id)}
          className="flex h-9 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-[var(--color-surface)] text-red-400/80 transition hover:text-red-400 active:scale-[0.97]"
          title="حذف الخدمة نهائيًا (تعود عند المزامنة التالية)"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* ══════════ صف خدمة المودال (استعراض/إضافة) ══════════ */
interface PreviewServiceRowProps {
  s: any;
  previewing: number;
  services: ProviderService[];
  globalMarkup: number;
  onAdd: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onRefresh: () => void;
}

function PreviewServiceRow({ s, previewing, services, globalMarkup, onAdd, onSaved, onError, onRefresh }: PreviewServiceRowProps) {
  // الخدمة المضافة محليًا (نطابقها بـ provider_id + remote_service_id)
  const local = useMemo(
    () => services.find((l) => l.provider_id === previewing && String(l.remote_service_id) === String(s.service)),
    [services, previewing, s.service]
  );
  const isAdded = Boolean(s.added) || Boolean(local);

  const [name, setName] = useState(s.name || "");
  const [mark, setMark] = useState(String(globalMarkup));
  const [dirtyName, setDirtyName] = useState(false);
  const [dirtyMark, setDirtyMark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [adding, setAdding] = useState(false);

  // عند إضافة الخدمة من الصف نضيفها أولًا ثم نحدّث اسمها وهامشها المحفوظين محليًا
  const commitEdits = async () => {
    if (!local) return;
    setSaving(true);
    try {
      const n = name.trim();
      if (dirtyName && n && n !== local.name) {
        const r = await fetch("/api/admin/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rename-service", id: local.id, name: n }),
        });
        if (r.ok) onSaved("حُفظ الاسم: " + n);
      }
      const v = Number(mark);
      if (dirtyMark && !isNaN(v) && v >= 0 && v !== local.markup_percent) {
        const r = await fetch("/api/admin/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update-service", id: local.id, markup_percent: v }),
        });
        if (r.ok) onSaved("حُفظ سعر العرض: " + v + "% فوق التكلفة");
      }
      setDirtyName(false);
      setDirtyMark(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const toggleHide = async () => {
    if (!local || toggling || saving) return;
    setToggling(true);
    try {
      const newActive = local.is_active ? 0 : 1;
      const r = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-service", id: local.id, is_active: newActive }),
      });
      if (r.ok) {
        onSaved(newActive ? "أُعيدت الخدمة للعرض — ظاهرة للمستخدمين" : "أُخفيت الخدمة — غائبة عن كل المستخدمين");
        onRefresh();
      } else { onError("تعذر إخفاء الخدمة"); }
    } finally {
      setToggling(false);
    }
  };

  const cost = Number(s.rate) || 0;
  const showRate = (cost * (1 + (local ? local.markup_percent : globalMarkup) / 100));

  return (
    <div className={`rounded-xl border p-2.5 text-[11px] transition ${isAdded ? "border-green-500/30 bg-green-500/5" : "border-[var(--color-gold)]/15 bg-[var(--color-surface-2)]"}`}>
      {/* السطر الأول: الرقم + التصنيف + النوع */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-[var(--color-gold)]/30 bg-[var(--color-surface-3)] px-1 py-0.5 text-[9px] font-black text-[var(--color-gold-bright)]">#{s.service}</span>
        <span className="rounded-full bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[9px] text-zinc-400">{s.category || "عام"}</span>
        {s.type && <span className="rounded-full bg-[var(--color-gold)]/10 px-1.5 py-0.5 text-[9px] text-[var(--color-gold-pale)]">{s.type}</span>}
        <span className="text-[9px] text-zinc-600">min {Number(s.min).toLocaleString("en-US")} · max {Number(s.max).toLocaleString("en-US")}</span>
      </div>
      {/* السطر الثاني: الاسم القابل للتعديل */}
      <div className="mt-1 flex items-center gap-1">
        <input
          value={name}
          disabled={!isAdded || saving}
          onChange={(e) => { setName(e.target.value); setDirtyName(true); }}
          onBlur={commitEdits}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-0.5 text-[11px] font-black text-white outline-none transition focus:bg-[var(--color-surface-3)] disabled:opacity-70"
          placeholder="اسم الخدمة"
          title="اضغط لتعديل الاسم — ثم اضغط Enter أو انقل التركيز للحفظ الفوري"
        />
        {dirtyName && !saving && <span className="shrink-0 text-[9px] font-black text-amber-400">●</span>}
        {saving && <Loader2 className="animate-spin shrink-0 text-zinc-500" size={12} />}
      </div>
      {/* السطر الثالث: الأسعار + هامش الربح القابل للتعديل */}
      <div className="mt-1 grid grid-cols-3 items-center gap-1.5">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1.5 py-1 text-center">
          <div className="text-[7.5px] font-bold text-zinc-500">التكلفة /1000</div>
          <div className="text-[10.5px] font-black text-white">${cost.toFixed(3)}</div>
        </div>
        <div className="rounded-lg border border-[var(--color-gold)]/35 bg-gradient-to-b from-[var(--color-gold)]/15 to-transparent px-1.5 py-1 text-center">
          <div className="text-[7.5px] font-bold text-[var(--color-gold-pale)]">سعر العرض</div>
          <div className="text-[10.5px] font-black text-[var(--color-gold-bright)]">${showRate.toFixed(3)}</div>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="shrink-0 text-[8px] font-black text-zinc-400">ربح%</span>
          <input
            type="number"
            disabled={!isAdded || saving}
            value={mark}
            onChange={(e) => { setMark(e.target.value); setDirtyMark(true); }}
            onBlur={commitEdits}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="h-7 w-full rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-1 text-center text-[10.5px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)] disabled:opacity-60"
            title="غيّر نسبة الربح ثم اضغط Enter أو انقل التركيز ليُحفظ السعر فورًا"
          />
        </div>
      </div>
      {/* السطر الرابع: زر الإضافة أو الإضافة+الإخفاء */}
      <div className="mt-1.5">
        {!isAdded ? (
          <button
            onClick={() => { if (adding) return; setAdding(true); onAdd(); setAdding(false); }}
            disabled={adding}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] text-[10.5px] font-black text-black shadow-[0_0_16px_-6px_rgba(255,215,0,0.5)] transition hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
          >
            <Plus size={13} /> {adding ? "جاري الإضافة..." : "إضافة للعرض (تظهر فورًا عند الجميع)"}
          </button>
        ) : (
          <button
            onClick={toggleHide}
            disabled={toggling || saving}
            className={`flex h-7 w-full items-center justify-center gap-1.5 rounded-lg border text-[10px] font-black transition active:scale-[0.97] disabled:opacity-60 ${local && !local.is_active ? "border-[var(--color-gold)]/30 bg-[var(--color-surface)] text-[var(--color-gold-pale)]" : "border-green-500/30 bg-green-500/10 text-green-400"}`}
          >
            {toggling ? (
              <Loader2 className="animate-spin" size={12} />
            ) : local && !local.is_active ? (
              <><Eye size={13} /> مخفية — اضغط لإعادة العرض عند كل المستخدمين</>
            ) : (
              <><EyeOff size={13} /> مضافة للعرض — اضغط للإخفاء عن كل المستخدمين</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════ بطاقة المزود ══════════ */
interface ProviderCardProps {
  p: Provider;
  services: ProviderService[];
  syncing: number | null;
  globalMarkup: number;
  onSync: (id: number) => void;
  onToggleProvider: (id: number) => void;
  onPreview: (id: number) => void;
  onEdit: (p: Provider) => void;
  onDeleteProvider: (id: number) => void;
  onServiceAction: (id: number, is_active?: number) => void;
  onMarkup: (id: number, markup: number) => void;
  onRenameService: (id: number, name: string) => void;
  onUpdateAll: (id: number) => void;
}

function ProviderCard(props: ProviderCardProps) {
  const {
    p, services, syncing, globalMarkup, onSync, onToggleProvider,
    onPreview, onEdit, onDeleteProvider, onServiceAction, onMarkup, onRenameService, onUpdateAll,
  } = props;

  const [svcSearch, setSvcSearch] = useState("");
  const [svcCat, setSvcCat] = useState<string>("الكل");
  const [svcMode, setSvcMode] = useState<"active" | "paused">("active");
  const [bulkMark, setBulkMark] = useState("");
  const [deleted] = useState<Set<number>>(new Set());

  const all = useMemo(() => services.filter((s) => s.provider_id === p.id && !deleted.has(s.id)), [services, p.id, deleted]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of all) set.add(s.category || s.type || "عام");
    return ["الكل", ...[...set].sort()];
  }, [all]);

  const filtered = useMemo(() => {
    const q = svcSearch.trim().toLowerCase();
    return all
      .filter((s) => (svcMode === "active" ? s.is_active : !s.is_active))
      .filter((s) => svcCat === "الكل" || s.category === svcCat || s.type === svcCat)
      .filter((s) => {
        if (!q) return true;
        const hay = `${s.name} ${s.remote_service_id} ${s.category} ${s.type}`.toLowerCase();
        return hay.includes(q);
      });
  }, [all, svcSearch, svcCat, svcMode]);

  const activeCount = all.filter((s) => s.is_active).length;
  const pausedCount = all.length - activeCount;

  const balanceOk = p.balance && p.balance !== "غير متاح" && p.balance !== "";

  return (
    <div className={`overflow-hidden rounded-3xl border border-[var(--color-gold)]/20 bg-[var(--color-surface)] shadow-[0_10px_40px_-18px_rgba(212,175,55,0.25)] transition ${p.is_active ? "" : "opacity-60"}`}>
      {/* شريط العنوان */}
      <div className="flex items-center gap-3 border-b border-[var(--color-gold)]/15 bg-gradient-to-r from-[var(--color-surface-2)] to-[var(--color-surface)] px-4 py-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold-bright)] via-[var(--color-gold)] to-[var(--color-gold-deep)] text-black shadow-[0_0_20px_-6px_rgba(255,215,0,0.6)]">
          <Server size={19} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-black text-white">{p.name}</span>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-black ${p.is_active ? "bg-green-500/15 text-green-400" : "bg-zinc-700/50 text-zinc-400"}`}>{p.is_active ? "متصل" : "معطل"}</span>
          </div>
          <div className="truncate text-[10px] text-zinc-500">{p.api_url}</div>
        </div>
        <button
          onClick={() => onToggleProvider(p.id)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition active:scale-[0.95] ${p.is_active ? "border-green-500/35 bg-green-500/10 text-green-400" : "border-zinc-700 bg-[var(--color-surface-2)] text-zinc-500"}`}
          title={p.is_active ? "تعطيل المزود" : "تفعيل المزود"}
        >
          {p.is_active ? <Power size={16} /> : <PowerOff size={16} />}
        </button>
      </div>

      {/* معلومات الرصيد */}
      {balanceOk ? (
        <div className="flex items-center justify-between border-b border-[var(--color-gold)]/10 bg-gradient-to-r from-[var(--color-gold)]/10 to-transparent px-4 py-2">
          <div className="flex items-center gap-1.5 text-[12px]">
            <Wallet size={13} className="text-[var(--color-gold-bright)]" />
            <span className="font-black text-white">رصيدك لدى المزود</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <b className="text-[16px] font-black text-[var(--color-gold-bright)]">${p.balance}</b>
            {p.balance_fetched_at && <span className="text-[9px] text-zinc-500">(محدث {new Date(p.balance_fetched_at).toLocaleTimeString("ar-EG")})</span>}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-red-500/15 bg-red-500/10 px-4 py-2 text-[11px] text-red-400">
          <Wallet size={13} />
          <span className="font-bold">تعذّر جلب الرصيد — تحقق من مفتاح API أو رابط المزود</span>
        </div>
      )}

      {/* شريط الأزرار الموحد */}
      <div className="grid grid-cols-3 gap-2 px-3 py-3">
        <button
          onClick={() => onPreview(p.id)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-gold)]/40 bg-gradient-to-b from-[var(--color-gold)]/20 to-[var(--color-gold)]/5 text-[11px] font-black text-[var(--color-gold-bright)] transition hover:brightness-125 active:scale-[0.97]"
          title="استعراض جميع خدمات المزود وإضافتها انتقائيًا"
        >
          <ListChecks size={14} /> عرض الخدمات
        </button>
        <button
          onClick={() => onEdit(p)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] font-black text-zinc-300 transition hover:border-[var(--color-gold)]/40 hover:text-[var(--color-gold-pale)] active:scale-[0.97]"
          title="تعديل بيانات المزود"
        >
          <PenLine size={14} /> تعديل
        </button>
        <button
          onClick={() => onDeleteProvider(p.id)}
          className="flex h-10 items-center justify-center rounded-xl border border-red-500/30 bg-[var(--color-surface-2)] text-red-400/80 transition hover:text-red-400 active:scale-[0.97]"
          title="حذف المزود وجميع خدماته"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* قسم الخدمات */}
      <div className="border-t border-[var(--color-gold)]/10 bg-[var(--color-surface)] px-2 pb-4 pt-3">
        {/* رأس قسم الخدمات */}
        <div className="mb-2 flex items-center justify-between px-2.5">
          <div className="flex items-center gap-2 text-[11px] font-black text-zinc-300">
            <Activity size={13} className="text-[var(--color-gold-bright)]" />
            خدمات المزود
            <span className="rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 text-[10px] text-zinc-400">{all.length} خدمة</span>
          </div>
          <span className="text-[9.5px] text-zinc-500">مضافة {activeCount} · موقوفة {pausedCount}</span>
        </div>

        {/* البحث */}
        <div className="relative px-2.5">
          <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={svcSearch}
            onChange={(e) => setSvcSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الخدمة..."
            className="h-10 w-full rounded-xl border border-[var(--color-gold)]/25 bg-[var(--color-surface-2)] pr-9 pl-8 text-[12px] font-bold text-white placeholder:text-zinc-600 outline-none transition focus:border-[var(--color-gold)]/60"
          />
          {svcSearch && (
            <button onClick={() => setSvcSearch("")} className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-500 transition hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* فلاتر التصنيفات */}
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto px-2.5 pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSvcCat(c)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-black transition active:scale-95 ${svcCat === c ? "border-[var(--color-gold)] bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-deep)] text-black" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-400"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* التبويب بين المفعلة والموقوفة */}
        <div className="mt-2 flex items-center gap-1.5 px-2.5">
          <button
            onClick={() => setSvcMode("active")}
            className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[11px] font-black transition active:scale-[0.97] ${svcMode === "active" ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-500"}`}
          >
            <Eye size={13} /> المفعّلة {activeCount}
          </button>
          <button
            onClick={() => setSvcMode("paused")}
            className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[11px] font-black transition active:scale-[0.97] ${svcMode === "paused" ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-500"}`}
          >
            <EyeOff size={13} /> الموقوفة {pausedCount}
          </button>
        </div>

        {/* قائمة الخدمات */}
        <div className="mt-2 max-h-[420px] overflow-y-auto rounded-2xl border border-[var(--color-gold)]/10 bg-[var(--color-surface)]">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-[11px] text-zinc-500">
              <Search size={22} className="text-zinc-600" />
              {all.length === 0
                ? "لا توجد خدمات بعد — اضغط «مزامنة جميع الخدمات» أو «عرض الخدمات» لإضافتها"
                : "لا توجد خدمات مطابقة للبحث"}
            </div>
          )}
          {filtered.map((s) => (
            <ServiceRow
              key={s.id}
              s={s}
              onNameSave={onRenameService}
              onMarkup={onMarkup}
              onToggle={onServiceAction}
              onDelete={onServiceAction}
            />
          ))}
        </div>

        {/* هامش جماعي + مزامنة */}
        <div className="mt-3 flex items-center gap-2 px-2.5">
          <input
            type="number"
            placeholder="هامش %"
            value={bulkMark}
            onChange={(e) => setBulkMark(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && bulkMark) { onUpdateAll(p.id); setBulkMark(""); } }}
            className="h-10 w-20 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-surface-2)] px-2 text-center text-[12px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)]"
          />
          <button
            onClick={() => { onUpdateAll(p.id); setBulkMark(""); }}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] font-black text-zinc-300 transition hover:border-[var(--color-gold)]/40 hover:text-[var(--color-gold-pale)] active:scale-[0.97]"
          >
            <Zap size={14} /> تحديث أسعار الكل
          </button>
        </div>
        <button
          onClick={() => onSync(p.id)}
          disabled={syncing === p.id}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold-bright)] via-[var(--color-gold)] to-[var(--color-gold-deep)] px-4 text-[13px] font-black text-black shadow-[0_0_24px_-8px_rgba(255,215,0,0.5)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {syncing === p.id ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={15} />}
          {syncing === p.id ? "جاري المزامنة..." : "مزامنة جميع الخدمات"}
        </button>
      </div>
    </div>
  );
}

/* ══════════ الصفحة الرئيسية ══════════ */
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
  const [previewing, setPreviewing] = useState<number | null>(null);
  const [previewServices, setPreviewServices] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewCat, setPreviewCat] = useState<string>("الكل");

  const previewCats = useMemo(() => {
    const set = new Set<string>();
    for (const s of previewServices) set.add(s.category || s.type || "عام");
    return [...set].sort();
  }, [previewServices]);

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
      setResult({
        message: `تم الربط بنجاح ✓ الاتصال سليم — الرصيد لدى المزود: $${Number(data.balance ?? 0).toFixed(2)} — اضغط «عرض الخدمات» لإضافة ما تعجبك انتقائيًا`,
      });
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

  const renameService = async (id: number, name: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, name } : s));
    setServices(updated);
  };

  const updateServiceMarkup = async (id: number, markup: number) => {
    const updated = services.map((s) => (s.id === id ? { ...s, markup_percent: markup, sell_rate: s.rate * (1 + markup / 100) } : s));
    setServices(updated);
    fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-service", id, markup_percent: markup }),
    });
  };

  const serviceAction = async (id: number) => {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    const deactivate = s.is_active ? 1 : 0; // 1 = حذف/إيقاف (نفس منطق الواجهة السابقة)
    const updated = services.map((x) => (x.id === id ? { ...x, is_active: deactivate ? 0 : 1 } : x));
    setServices(updated);
    await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-service", id, markup_percent: undefined as unknown as number, is_active: deactivate }),
    });
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
      setServices((prev) => prev.filter((s) => s.id !== id));
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

  // إعادة تعيين الفلتر عند فتح مودال جديد (يضمن مودالًا واحدًا نظيفًا)
  const openPreviewSafe = async (providerId: number) => {
    if (previewing !== null && previewing !== providerId) setPreviewCat("الكل");
    await openPreviewOrig(providerId);
  };

  const openPreviewOrig = async (providerId: number) => {
    setPreviewing(providerId);
    setPreviewLoading(true);
    setPreviewSearch("");
    try {
      const res = await fetch(`/api/admin/providers?mode=preview&providerId=${providerId}`);
      const data = await res.json();
      if (res.ok) setPreviewServices(data.services || []);
      else { setPreviewServices([]); setResult({ error: data.error || "تعذر جلب الخدمات" }); }
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
      openPreviewSafe(providerId);
      load();
    } else {
      setResult({ error: data.error || "تعذرت الإضافة" });
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] pb-16">
      <div className="mx-auto max-w-4xl space-y-4 p-3">
        {/* ═══ رأس الصفحة ═══ */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-gold-bright)] via-[var(--color-gold)] to-[var(--color-gold-deep)] text-black shadow-[0_0_22px_-6px_rgba(255,215,0,0.6)]">
            <Server size={20} strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-black text-gradient-luxe">مزودو الخدمات</h1>
            <div className="text-[10.5px] text-zinc-500">اربط مزودي SMM خارجيين وأضِف خدماتهم انتقائيًا</div>
          </div>
          <button
            onClick={refreshBalances}
            disabled={refreshing}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--color-gold)]/35 bg-gradient-to-b from-[var(--color-gold)]/20 to-transparent px-3 text-[11px] font-black text-[var(--color-gold-bright)] transition hover:brightness-125 active:scale-[0.95] disabled:opacity-50"
            title="تحديث أرصدة جميع المزودين من سيرفراتهم"
          >
            {refreshing ? <Loader2 className="animate-spin" size={14} /> : <Wallet size={14} />}
            أرصدة
          </button>
          <Link
            href="/admin"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-3 text-[11px] font-black text-zinc-300 transition hover:text-[var(--color-gold-pale)] active:scale-[0.95]"
          >
            <ArrowLeft size={14} /> الرئيسية
          </Link>
        </div>

        {/* ═══ هامش الربح العام ═══ */}
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-gold)]/20 bg-[var(--color-surface)] px-4 py-3">
          <Activity size={16} className="shrink-0 text-[var(--color-gold-bright)]" />
          <span className="shrink-0 text-[12px] font-black text-white">هامش الربح الافتراضي</span>
          <div className="flex flex-1 items-center gap-2">
            <input
              type="number"
              value={globalMarkup}
              onChange={(e) => setGlobalMarkup(Number(e.target.value))}
              className="h-9 w-20 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-surface-2)] px-2 text-center text-[12px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)]"
            />
            <span className="text-[11px] text-zinc-400">٪ يُضاف فوق التكلفة</span>
          </div>
        </div>

        {/* ═══ زر إضافة المزود الموحّد (يظهر دائمًا أعلى القائمة) ═══ */}
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", api_url: "", api_key: "", notes: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-gold-bright)] via-[var(--color-gold)] to-[var(--color-gold-deep)] text-[13px] font-black text-black shadow-[0_0_24px_-8px_rgba(255,215,0,0.5)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <Plus size={16} /> {showForm ? "إخفاء نموذج الإضافة" : "إضافة مزود جديد"}
        </button>

        {/* ═══ نموذج إضافة/تعديل مزود (موحّد في مكان واحد أعلى القائمة) ═══ */}
        {showForm && (
          <div className="rounded-3xl border border-[var(--color-gold)]/25 bg-[var(--color-surface)] p-4 shadow-[0_10px_40px_-18px_rgba(212,175,55,0.3)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-black text-gradient-luxe">{editing ? `تعديل المزود: ${editing.name}` : "إضافة مزود جديد"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-400 transition hover:text-white">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={saveProvider} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-zinc-400">اسم المزود</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-luxe h-10 w-full rounded-xl px-3 text-[13px] text-white" placeholder="مثال: JustAnotherPanel" required />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-zinc-400">رابط API</label>
                <input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} className="input-luxe h-10 w-full rounded-xl px-3 text-[13px] text-white" placeholder="https://panel.example.com" required />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-zinc-400">مفتاح API</label>
                <input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} className="input-luxe h-10 w-full rounded-xl px-3 text-[13px] text-white" placeholder="key-xxxxxxxxxxxx" required />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-zinc-400">ملاحظات (اختياري)</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-luxe h-10 w-full rounded-xl px-3 text-[13px] text-white" placeholder="مثال: مزود خدمات انستغرام" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-gold flex-1 rounded-xl py-2.5 text-[13px] disabled:opacity-50">
                  {loading ? <Loader2 className="mx-auto animate-spin" size={16} /> : "حفظ وفحص الاتصال"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-2.5 text-[12px] font-bold text-zinc-300">إلغاء</button>
              </div>
              <div className="rounded-xl border border-[var(--color-gold)]/10 bg-[var(--color-surface-2)] p-2.5 text-[10.5px] leading-relaxed text-zinc-400">
                يدعم النظام أي مزود يستخدم SMM Panel API القياسي (api/v2) مثل JustAnotherPanel و SMMFollowers و SMMKings. عند الحفظ يُختبر الاتصال تلقائيًا، وبعد المزامنة تُستورد خدمات المزود لتختار منها ما تريد.
              </div>
            </form>
          </div>
        )}

        {/* ═══ رسالة النتيجة ═══ */}
        {result && (
          <div className={`flex items-center gap-2 rounded-2xl border p-3 text-[12px] font-bold leading-relaxed ${result.error ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-green-500/30 bg-green-500/10 text-green-400"}`}>
            {result.error ? <XCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
            <span className="whitespace-pre-line">{result.error || result.message}</span>
          </div>
        )}

        {/* ═══ قائمة المزودين: قسم مستقل لكل مزود ═══ */}
        {providers.length === 0 && !showForm && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--color-gold)]/25 bg-[var(--color-surface)] px-4 py-12 text-center">
            <Link2 size={28} className="text-[var(--color-gold)]/50" />
            <div className="text-[13px] font-black text-white">لم تربط أي مزود بعد</div>
            <div className="text-[11px] text-zinc-500">اضغط «إضافة مزود جديد» أعلاه لربط أول مزود</div>
          </div>
        )}
        <div className="space-y-6">
          {providers.map((p, idx) => (
            <section key={p.id} aria-label={`قسم ${p.name}`}>
              <ProviderCard
                p={p}
                services={services}
                syncing={syncing}
                globalMarkup={globalMarkup}
                onSync={syncServices}
                onToggleProvider={toggleProvider}
                onPreview={openPreviewSafe}
                onEdit={(pp) => { setEditing(pp); setForm({ name: pp.name, api_url: pp.api_url, api_key: pp.api_key, notes: pp.notes || "" }); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onDeleteProvider={deleteProvider}
                onServiceAction={serviceAction}
                onMarkup={updateServiceMarkup}
                onRenameService={renameService}
                onUpdateAll={updateAllProviderServices}
              />
              {idx < providers.length - 1 && <div className="mt-6 h-px bg-gradient-to-l from-transparent via-[var(--color-gold)]/25 to-transparent" />}
            </section>
          ))}
        </div>

        {/* ═══ مودال الاستعراض الانتقائي ═══ */}
        {previewing !== null && (
          <div key={previewing} className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-2 backdrop-blur-sm sm:items-center" onClick={() => setPreviewing(null)}>
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-[var(--color-gold)]/25 bg-[#0c0c0c] sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-gold)]/15 bg-[var(--color-surface)] p-4">
                <div>
                  <div className="text-[16px] font-black text-gradient-luxe">استعراض خدمات المزود</div>
                  <div className="text-[10px] text-zinc-500">كل خدمات المزود مرتبة حسب النوع — أضِف انتقائيًا وتظهر فورًا، وعدّل الاسم والسعر واحفظ فورًا</div>
                </div>
                <button onClick={() => setPreviewing(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-400 transition hover:text-white">
                  <XCircle size={17} />
                </button>
              </div>
              <div className="p-3">
                <div className="relative mb-3">
                  <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو رقم الخدمة..."
                    className="h-10 w-full rounded-xl border border-[var(--color-gold)]/25 bg-[var(--color-surface-2)] pr-9 pl-3 text-[12px] font-bold text-white placeholder:text-zinc-600 outline-none focus:border-[var(--color-gold)]/60"
                  />
                  {/* فلاتر نوع الخدمة: اختر النوع لعرض خدماته فقط */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["الكل", ...previewCats]
                      .filter((cat) => cat !== "الكل" || previewCats.length > 0)
                      .map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPreviewCat(cat)}
                          className={`rounded-full border px-2.5 py-1 text-[9.5px] font-black transition active:scale-[0.95] ${previewCat === cat ? "border-[var(--color-gold)] bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] text-black shadow-[0_0_12px_-4px_rgba(255,215,0,0.5)]" : "border-[var(--color-gold)]/20 bg-[var(--color-surface-2)] text-zinc-400 hover:border-[var(--color-gold)]/40 hover:text-[var(--color-gold-pale)]"}`}
                        >
                          {cat}
                        </button>
                      ))}
                  </div>
                </div>
                {previewLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-zinc-400">
                    <Loader2 className="animate-spin" size={16} /> جاري جلب الخدمات من سيرفر المزود...
                  </div>
                ) : previewServices.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-zinc-500">لا توجد خدمات لدى هذا المزود</div>
                ) : (
                  <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
                    {previewServices
                      .filter((s: any) => previewCat === "الكل" || s.category === previewCat || s.type === previewCat)
                      .filter((s: any) => {
                        const q = previewSearch.trim().toLowerCase();
                        if (!q) return true;
                        return `${s.name || ""} ${s.service || ""} ${s.category || ""}`.toLowerCase().includes(q);
                      })
                      .map((s: any) => (
                        <PreviewServiceRow
                          key={s.service}
                          s={s}
                          previewing={previewing!}
                          services={services}
                          globalMarkup={globalMarkup}
                          onAdd={() => addServiceFromPreview(previewing!, String(s.service))}
                          onSaved={(msg) => setResult({ message: msg })}
                          onError={(msg) => setResult({ error: msg })}
                          onRefresh={() => openPreviewOrig(previewing!)}
                        />
                      ))}
                  </div>
                )}
                <div className="mt-2 pb-1 text-center text-[9.5px] text-zinc-600">الإضافة الانتقائية تظهر فورًا عند كل المستخدمين ومستخدمي API — أي تعديل على الاسم أو السعر يُحفظ فورًا</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ سجل التنفيذ ═══ */}
        {logs.length > 0 && (
          <div className="rounded-3xl border border-[var(--color-gold)]/20 bg-[var(--color-surface)] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-black text-white">
              <Activity size={16} className="text-[var(--color-gold-bright)]" />
              سجل تنفيذ الطلبات
            </h2>
            <div className="space-y-1.5">
              {logs.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-[10.5px]">
                  {l.status === "sent" ? <CheckCircle2 size={13} className="text-green-400" /> : l.status === "failed" ? <XCircle size={13} className="text-red-400" /> : <Activity size={13} className="text-yellow-400" />}
                  <span className="text-zinc-300">مزود <b className="text-[var(--color-gold-bright)]">{l.provider_name}</b></span>
                  <span className="text-zinc-500">طلب #{l.local_order_id || "—"}</span>
                  <span className="text-zinc-500">المزود: {l.remote_order_id || "—"}</span>
                  <span className={`rounded-full px-2 py-0.5 font-black ${l.status === "sent" ? "bg-green-500/15 text-green-400" : l.status === "failed" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"}`}>{l.status}</span>
                  {l.error && <span className="w-full text-red-400/80">{l.error}</span>}
                  <span className="mr-auto text-zinc-600">{new Date(l.created_at).toLocaleString("ar-EG")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
