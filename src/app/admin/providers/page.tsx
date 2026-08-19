"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CheckSquare,
  Square,
  Filter,
  Layers3,
  DollarSign,
} from "lucide-react";
import { detectPlatform, detectServiceType } from "@/lib/platform-mapping";

interface Provider {
  id: number;
  name: string;
  api_url: string;
  api_key?: string;
  balance: string;
  balance_fetched_at: string;
  notes: string;
  is_active: number;
  connection_status?: "pending" | "online" | "offline" | string;
  last_error?: string | null;
  last_probe_at?: string | null;
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
  pricing_mode?: "markup" | "manual" | string;
  manual_price?: number | null;
  is_active: number;
  is_new?: number;
}

interface PreviewCatalogService {
  service: string | number;
  remote_service_id?: string | number;
  name?: string;
  category?: string;
  type?: string;
  rate?: number;
  min?: number;
  max?: number;
  added?: boolean;
}

interface ExecutionLog {
  id: number | string;
  status: "sent" | "failed" | string;
  provider_name?: string;
  local_order_id?: number | string | null;
  remote_order_id?: number | string | null;
  error?: string | null;
  created_at: string | number;
}

/* ══════════ صف الخدمة: بطاقة أفقية واحدة مضغوطة ══════════ */
interface ServiceRowProps {
  s: ProviderService;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onNameSave: (id: number, name: string) => void;
  onPricing: (id: number, pricing: { pricing_mode: "markup" | "manual"; markup_percent: number; manual_price?: number | null }) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

function ServiceRow({ s, selected, onSelect, onNameSave, onPricing, onToggle, onDelete }: ServiceRowProps) {
  const [name, setName] = useState(s.name);
  const [mark, setMark] = useState(String(s.markup_percent));
  const [mode, setMode] = useState<"markup" | "manual">(s.pricing_mode === "manual" ? "manual" : "markup");
  const [manual, setManual] = useState(s.manual_price == null ? String(s.sell_rate ?? "") : String(s.manual_price));
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

  const commitPricing = () => {
    const markup = Number(mark);
    const direct = Number(manual);
    if (!Number.isFinite(markup) || markup < 0) { setMark(String(s.markup_percent)); return; }
    if (mode === "manual" && (!Number.isFinite(direct) || direct < 0)) { setManual(String(s.sell_rate ?? "")); return; }
    const unchanged = mode === (s.pricing_mode === "manual" ? "manual" : "markup")
      && markup === Number(s.markup_percent)
      && (mode === "markup" || direct === Number(s.manual_price ?? s.sell_rate));
    if (!unchanged) onPricing(s.id, { pricing_mode: mode, markup_percent: markup, manual_price: mode === "manual" ? direct : null });
  };

  const isNew = Number(s.is_new) === 1;

  return (
    <div className={`mx-2.5 my-1.5 rounded-2xl border bg-[var(--color-surface-2)] px-3 py-3 transition ${s.is_active ? "border-[var(--color-gold)]/25" : "border-red-500/20 opacity-70"}`}>
      {/* السطر الأول: الرقم + الاسم القابل للتعديل + وسم جديد */}
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onSelect(s.id, !selected)} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition active:scale-95 ${selected ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black" : "border-[var(--color-gold)]/30 bg-[var(--color-surface-3)] text-zinc-500 hover:text-[var(--color-gold-pale)]"}`} aria-label={selected ? "إلغاء تحديد الخدمة" : "تحديد الخدمة للتسعير الجماعي"} title={selected ? "إلغاء التحديد" : "تحديد للتسعير الجماعي"}>{selected ? <CheckSquare size={13} /> : <Square size={13} />}</button>
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

      {/* السطر الثالث: التكلفة وسعر العرض والتحكم المرن */}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1.5 text-center">
          <div className="text-[8.5px] font-bold text-zinc-500">التكلفة /1000</div>
          <div className="text-[12px] font-black text-white">${Number(s.rate).toFixed(6)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-gold)]/35 bg-gradient-to-b from-[var(--color-gold)]/15 to-transparent px-2 py-1.5 text-center">
          <div className="text-[8.5px] font-bold text-[var(--color-gold-pale)]">سعر العرض /1000</div>
          <div className="text-[12px] font-black text-[var(--color-gold-bright)]">${Number(s.sell_rate).toFixed(6)}</div>
        </div>
      </div>
      <div className="mt-1.5 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-surface-3)] p-1.5">
        <div className="mb-1 flex items-center gap-1">
          <DollarSign size={11} className="text-[var(--color-gold)]" />
          <span className="text-[9px] font-black text-zinc-400">طريقة تحديد سعر العرض</span>
          <button type="button" onClick={() => { setMode("markup"); setTimeout(commitPricing, 0); }} className={`mr-auto rounded-lg px-2 py-1 text-[9px] font-black ${mode === "markup" ? "bg-[var(--color-gold)] text-black" : "bg-[var(--color-surface)] text-zinc-500"}`}>نسبة ربح</button>
          <button type="button" onClick={() => setMode("manual")} className={`rounded-lg px-2 py-1 text-[9px] font-black ${mode === "manual" ? "bg-[var(--color-gold)] text-black" : "bg-[var(--color-surface)] text-zinc-500"}`}>سعر مباشر</button>
        </div>
        {mode === "markup" ? (
          <input type="number" min="0" step="0.01" value={mark} onChange={(e) => setMark(e.target.value)} onBlur={commitPricing} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-8 w-full rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-2 text-center text-[11px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)]" placeholder="نسبة الربح % — مثل 30.50" />
        ) : (
          <input type="number" min="0" step="0.000001" value={manual} onChange={(e) => setManual(e.target.value)} onBlur={commitPricing} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-8 w-full rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-2 text-center text-[11px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)]" placeholder="سعر البيع /1000 — مثل 0.125500" />
        )}
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
  s: PreviewCatalogService;
  previewing: number;
  services: ProviderService[];
  globalMarkup: number;
  selected: boolean;
  onSelect: (remoteId: string, checked: boolean) => void;
  onAdd: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onLocalChange: (id: number, patch: Partial<ProviderService>) => void;
}

function PreviewServiceRow({ s, previewing, services, globalMarkup, selected, onSelect, onAdd, onSaved, onError, onLocalChange }: PreviewServiceRowProps) {
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
      const patch: Partial<ProviderService> = {};
      const n = name.trim();
      if (dirtyName && n && n !== local.name) {
        const r = await fetch("/api/admin/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rename-service", id: local.id, name: n }),
        });
        if (r.ok) {
          patch.name = n;
          onSaved("حُفظ الاسم: " + n);
        }
      }
      const v = Number(mark);
      if (dirtyMark && !isNaN(v) && v >= 0 && v !== local.markup_percent) {
        const r = await fetch("/api/admin/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update-service", id: local.id, markup_percent: v }),
        });
        if (r.ok) {
          patch.markup_percent = v;
          patch.sell_rate = Math.round(Number(s.rate || 0) * (1 + v / 100) * 1_000_000) / 1_000_000;
          onSaved("حُفظ سعر العرض: " + v + "% فوق التكلفة");
        }
      }
      if (Object.keys(patch).length) onLocalChange(local.id, patch);
      setDirtyName(false);
      setDirtyMark(false);
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
        onLocalChange(local.id, { is_active: newActive });
        onSaved(newActive ? "أُعيدت الخدمة للعرض — ظاهرة للمستخدمين" : "أُخفيت الخدمة — غائبة عن كل المستخدمين");
      } else { onError("تعذر إخفاء الخدمة"); }
    } finally {
      setToggling(false);
    }
  };

  const cost = Number(s.rate) || 0;
  const showRate = (cost * (1 + (local ? local.markup_percent : globalMarkup) / 100));

  return (
    <div className={`rounded-xl border p-2 text-[10px] transition sm:p-2.5 sm:text-[11px] ${selected ? "border-[var(--color-gold)]/70 bg-[var(--color-gold)]/10" : isAdded ? "border-green-500/30 bg-green-500/5" : "border-[var(--color-gold)]/15 bg-[var(--color-surface-2)]"}`}>
      {/* السطر الأول: تحديد + الرقم + التصنيف + النوع */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={isAdded}
          onClick={() => onSelect(String(s.service), !selected)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black" : "border-[var(--color-gold)]/30 bg-[var(--color-surface-3)] text-zinc-500 hover:text-[var(--color-gold-pale)]"}`}
          aria-label={selected ? "إلغاء تحديد الخدمة" : "تحديد الخدمة"}
          title={isAdded ? "الخدمة مضافة مسبقًا" : selected ? "إلغاء التحديد" : "تحديد الخدمة للإضافة الجماعية"}
        >
          {selected ? <CheckSquare size={13} /> : <Square size={13} />}
        </button>
        <span className="rounded border border-[var(--color-gold)]/30 bg-[var(--color-surface-3)] px-1 py-0.5 text-[8px] font-black text-[var(--color-gold-bright)] sm:text-[9px]">#{s.service}</span>
        <span className="rounded-full bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[8px] text-zinc-400 sm:text-[9px]">{s.category || "عام"}</span>
        {s.type && <span className="rounded-full bg-[var(--color-gold)]/10 px-1.5 py-0.5 text-[8px] text-[var(--color-gold-pale)] sm:text-[9px]">{s.type}</span>}
        <span className="text-[8px] text-zinc-600 sm:text-[9px]">min {Number(s.min).toLocaleString("en-US")} · max {Number(s.max).toLocaleString("en-US")}</span>
      </div>
      {/* السطر الثاني: الاسم القابل للتعديل */}
      <div className="mt-1 flex items-center gap-1">
        <input
          value={name}
          disabled={!isAdded || saving}
          onChange={(e) => { setName(e.target.value); setDirtyName(true); }}
          onBlur={commitEdits}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-0.5 text-[10px] font-black text-white outline-none transition focus:bg-[var(--color-surface-3)] disabled:opacity-70 sm:px-1.5 sm:text-[11px]"
          placeholder="اسم الخدمة"
          title="اضغط لتعديل الاسم — ثم اضغط Enter أو انقل التركيز للحفظ الفوري"
        />
        {dirtyName && !saving && <span className="shrink-0 text-[9px] font-black text-amber-400">●</span>}
        {saving && <Loader2 className="animate-spin shrink-0 text-zinc-500" size={12} />}
      </div>
      {/* السطر الثالث: الأسعار + هامش الربح القابل للتعديل */}
      <div className="mt-1 grid grid-cols-3 items-center gap-1">
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
            className="h-[26px] w-full rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-1 text-center text-[10px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)] disabled:opacity-60 sm:h-7 sm:text-[10.5px]"
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
            className="flex h-7 w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] text-[9px] font-black text-black shadow-[0_0_16px_-6px_rgba(255,215,0,0.5)] transition hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
          >
            <Plus size={12} /> {adding ? "جاري الإضافة..." : <><span className="sm:hidden">إضافة للعرض</span><span className="hidden sm:inline">إضافة للعرض (تظهر فورًا عند الجميع)</span></>}
          </button>
        ) : (
          <button
            onClick={toggleHide}
            disabled={toggling || saving}
            className={`flex h-7 w-full items-center justify-center gap-1 rounded-lg border text-[9px] sm:text-[10px] font-black transition active:scale-[0.97] disabled:opacity-60 ${local && !local.is_active ? "border-[var(--color-gold)]/30 bg-[var(--color-surface)] text-[var(--color-gold-pale)]" : "border-green-500/30 bg-green-500/10 text-green-400"}`}
          >
            {toggling ? (
              <Loader2 className="animate-spin" size={12} />
            ) : local && !local.is_active ? (
              <><Eye size={12} /> <span className="sm:hidden">مخفية — إعادة العرض</span><span className="hidden sm:inline">مخفية — اضغط لإعادة العرض عند كل المستخدمين</span></>
            ) : (
              <><EyeOff size={12} /> <span className="sm:hidden">مضافة — إخفاء</span><span className="hidden sm:inline">مضافة للعرض — اضغط للإخفاء عن كل المستخدمين</span></>
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
  serviceCount?: number;
  servicesLoaded?: boolean;
  servicesLoading?: boolean;
  onLoadServices: (id: number) => void;
  syncing: number | null;
  globalMarkup: number;
  onSync: (id: number) => void;
  onToggleProvider: (id: number) => void;
  onPreview: (id: number) => void;
  onEdit: (p: Provider) => void;
  onDeleteProvider: (id: number) => void;
  onServiceAction: (id: number, is_active?: number) => void;
  onDeleteService: (id: number) => void;
  onPricing: (id: number, pricing: { pricing_mode: "markup" | "manual"; markup_percent: number; manual_price?: number | null }) => void;
  onRenameService: (id: number, name: string) => void;
  onUpdateAll: (id: number, mode: "markup" | "manual", value: string, scope: "provider" | "category" | "selected", ids?: number[], category?: string) => void;
  onResetPricing: (id: number, scope: "provider" | "category" | "selected", ids?: number[], category?: string) => void;
  onDeleteServices: (id: number, ids?: number[]) => void;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ProviderCard(props: ProviderCardProps) {
  const {
    p, services, serviceCount = 0, servicesLoaded = false, servicesLoading = false, onLoadServices, syncing, onSync, onToggleProvider,
    onPreview, onEdit, onDeleteProvider, onServiceAction, onDeleteService, onPricing, onRenameService, onUpdateAll, onResetPricing, onDeleteServices,
  } = props;

  const [svcSearch, setSvcSearch] = useState("");
  const [svcCat, setSvcCat] = useState<string>("الكل");
  const [svcMode, setSvcMode] = useState<"active" | "paused">("active");
  const [bulkMark, setBulkMark] = useState("");
  const [bulkManual, setBulkManual] = useState("");
  const [bulkScope, setBulkScope] = useState<"provider" | "category" | "selected">("provider");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(new Set());
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
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-black ${p.is_active ? "bg-green-500/15 text-green-400" : "bg-zinc-700/50 text-zinc-400"}`}>{p.is_active ? "مفعّل" : "معطل"}</span>
            {p.connection_status === "pending" && <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[8.5px] font-black text-amber-300">يفحص...</span>}
            {p.connection_status === "online" && <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8.5px] font-black text-emerald-300">الاتصال سليم</span>}
            {p.connection_status === "offline" && <span className="shrink-0 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[8.5px] font-black text-red-300">فحص الاتصال فشل</span>}
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
            <span className="rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 text-[10px] text-zinc-400">{servicesLoaded ? all.length : serviceCount} خدمة</span>
          </div>
          <span className="text-[9.5px] text-zinc-500">مضافة {servicesLoaded ? activeCount : "—"} · موقوفة {servicesLoaded ? pausedCount : "—"}</span>
        </div>

        {!servicesLoaded ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-gold)]/25 bg-[var(--color-surface-2)] px-3 py-5 text-center">
            <div className="mb-2 text-[11px] text-zinc-500">لا تُحمّل خدمات المزود إلا عند طلبها لتبقى اللوحة سريعة حتى مع مئات المزودين.</div>
            <button onClick={() => onLoadServices(p.id)} disabled={servicesLoading} className="mx-auto flex h-9 items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-4 text-[11px] font-black text-[var(--color-gold-bright)] disabled:opacity-60">
              {servicesLoading ? <Loader2 className="animate-spin" size={14} /> : <ListChecks size={14} />}
              {servicesLoading ? "جاري تحميل خدمات هذا المزود..." : `تحميل ${serviceCount} خدمة`}
            </button>
          </div>
        ) : null}

        {/* البحث */}
        <div className={`relative px-2.5 ${servicesLoaded ? "" : "pointer-events-none opacity-45"}`}>
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
        <div className={`no-scrollbar mt-2 flex gap-1.5 overflow-x-auto px-2.5 pb-1 ${servicesLoaded ? "" : "pointer-events-none opacity-45"}`}>
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
        <div className={`mt-2 flex items-center gap-1.5 px-2.5 ${servicesLoaded ? "" : "pointer-events-none opacity-45"}`}>
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
        <div className={`mt-2 max-h-[420px] overflow-y-auto rounded-2xl border border-[var(--color-gold)]/10 bg-[var(--color-surface)] ${servicesLoaded ? "" : "opacity-45"}`}>
          {servicesLoaded && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-[11px] text-zinc-500">
              <Search size={22} className="text-zinc-600" />
              {all.length === 0
                ? "لا توجد خدمات بعد — اضغط «مزامنة جميع الخدمات» أو «عرض الخدمات» لإضافتها"
                : "لا توجد خدمات مطابقة للبحث"}
            </div>
          )}
          {servicesLoaded && filtered.map((s) => (
            <ServiceRow
              key={s.id}
              s={s}
              selected={selectedServiceIds.has(s.id)}
              onSelect={(id, checked) => setSelectedServiceIds((prev) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; })}
              onNameSave={onRenameService}
              onPricing={onPricing}
              onToggle={onServiceAction}
              onDelete={onDeleteService}
            />
          ))}
        </div>

        {/* تسعير جماعي دقيق */}
        <div className="mt-3 rounded-2xl border border-[var(--color-gold)]/20 bg-[var(--color-surface-2)] p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-[var(--color-gold-pale)]"><DollarSign size={13} /> تسعير اختياري بنطاق محدد</div>
          <div className="mb-2 text-[9px] leading-relaxed text-zinc-500">لن تُطبّق أي نسبة تلقائيًا. اختر المزود أو التصنيف أو خدمات محددة ثم اضغط الإجراء المطلوب.</div>
          <select value={bulkScope} onChange={(e) => setBulkScope(e.target.value as "provider" | "category" | "selected")} className="mb-2 h-9 w-full rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-2 text-center text-[10px] font-black text-[var(--color-gold-pale)] outline-none">
            <option value="provider">كل خدمات هذا المزود</option>
            <option value="category">التصنيف الحالي: {svcCat === "الكل" ? "اختر تصنيفًا من الأعلى" : svcCat}</option>
            <option value="selected">الخدمات المحددة فقط ({selectedServiceIds.size})</option>
          </select>
          <div className="grid grid-cols-2 gap-1.5">
            <input type="number" min="0" step="0.01" placeholder="نسبة الربح %" value={bulkMark} onChange={(e) => setBulkMark(e.target.value)} className="h-9 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-2 text-center text-[11px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)]" />
            <input type="number" min="0" step="0.000001" placeholder="سعر مباشر /1000" value={bulkManual} onChange={(e) => setBulkManual(e.target.value)} className="h-9 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-surface)] px-2 text-center text-[11px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)]" />
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            <button onClick={() => { onUpdateAll(p.id, "markup", bulkMark, bulkScope, [...selectedServiceIds], svcCat !== "الكل" ? svcCat : undefined); setBulkMark(""); }} className="flex h-9 items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-zinc-300 hover:border-[var(--color-gold)]/50"><Zap size={13} /> تطبيق النسبة</button>
            <button onClick={() => { onUpdateAll(p.id, "manual", bulkManual, bulkScope, [...selectedServiceIds], svcCat !== "الكل" ? svcCat : undefined); setBulkManual(""); }} className="flex h-9 items-center justify-center gap-1 rounded-xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[10px] font-black text-[var(--color-gold-pale)]"><DollarSign size={13} /> تطبيق السعر</button>
            <button onClick={() => onResetPricing(p.id, bulkScope, [...selectedServiceIds], svcCat !== "الكل" ? svcCat : undefined)} className="flex h-9 items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 text-[10px] font-black text-red-300 hover:bg-red-500/15"><X size={13} /> إلغاء النسبة</button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 px-2.5">
          <button onClick={() => onDeleteServices(p.id)} className="flex h-9 items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 text-[10px] font-black text-red-300 hover:bg-red-500/15"><Trash2 size={13} /> إزالة كل خدمات المزود</button>
          <button onClick={() => onDeleteServices(p.id, all.filter((s) => s.is_active === 0).map((s) => s.id))} className="flex h-9 items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[10px] font-black text-amber-300 hover:bg-amber-500/15"><Trash2 size={13} /> إزالة الموقوفة</button>
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
  const [serviceCounts, setServiceCounts] = useState<Record<number, number>>({});
  const [serviceStats, setServiceStats] = useState<Record<number, { total: number; active: number; paused: number }>>({});
  const [loadedServiceProviders, setLoadedServiceProviders] = useState<Set<number>>(new Set());
  const [loadingServiceProviders, setLoadingServiceProviders] = useState<Set<number>>(new Set());
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState({ name: "", api_url: "", api_key: "", notes: "" });
  const [globalMarkup, setGlobalMarkup] = useState(0);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<{ message?: string; error?: string } | null>(null);
  const [previewing, setPreviewing] = useState<number | null>(null);
  const [previewServices, setPreviewServices] = useState<PreviewCatalogService[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewPlatform, setPreviewPlatform] = useState<string>("all");
  const [previewType, setPreviewType] = useState<string>("all");
  const [previewPage, setPreviewPage] = useState(1);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<{ mode: "selected" | "filtered"; services: PreviewCatalogService[] } | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");
  const [providerMode, setProviderMode] = useState<"all" | "active" | "paused">("all");
  const previewCacheRef = useRef<Map<number, { services: PreviewCatalogService[] }>>(new Map());
  const previewRequestRef = useRef(0);
  const loadRequestRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);

  const visibleProviders = useMemo(() => {
    const query = providerSearch.trim().toLowerCase();
    return providers.filter((provider) => {
      const matchesMode = providerMode === "all"
        || (providerMode === "active" && Number(provider.is_active) === 1)
        || (providerMode === "paused" && Number(provider.is_active) === 0);
      if (!matchesMode) return false;
      if (!query) return true;
      return `${provider.name} ${provider.api_url} ${provider.notes || ""}`.toLowerCase().includes(query);
    });
  }, [providers, providerMode, providerSearch]);

  const previewPlatforms = useMemo(() => {
    const set = new Set<string>();
    for (const s of previewServices) set.add(detectPlatform(String(s.category || ""), String(s.name || "")));
    return [...set].sort();
  }, [previewServices]);

  const previewTypes = useMemo(() => {
    const set = new Set<string>();
    for (const s of previewServices) set.add(detectServiceType(String(s.name || "") + " " + String(s.category || "")));
    return [...set].sort();
  }, [previewServices]);

  const load = useCallback(async () => {
    // التحميل الأولي خفيف: لا نجلب كتالوج كل المزودين قبل أن يطلبه المدير.
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    const requestId = ++loadRequestRef.current;
    loadAbortRef.current = controller;
    try {
      const [providerData, statsData, logsData] = await Promise.all([
        fetch("/api/admin/providers", { signal: controller.signal }).then((res) => (res.ok ? res.json() : { providers: [] })),
        fetch("/api/admin/providers?mode=service-stats", { signal: controller.signal }).then((res) => (res.ok ? res.json() : { stats: [] })),
        fetch("/api/admin/providers?mode=logs", { signal: controller.signal }).then((res) => (res.ok ? res.json() : { logs: [] })),
      ]);
      if (requestId !== loadRequestRef.current) return;
      setProviders(providerData.providers || []);
      const counts: Record<number, number> = {};
      const nextServiceStats: Record<number, { total: number; active: number; paused: number }> = {};
      for (const row of statsData.stats || []) {
        const providerId = Number(row.provider_id);
        const total = Number(row.total || 0);
        const active = Number(row.active || 0);
        const paused = Number(row.paused || Math.max(0, total - active));
        counts[providerId] = total;
        nextServiceStats[providerId] = { total, active, paused };
      }
      setServiceCounts(counts);
      setServiceStats(nextServiceStats);
      setLogs(logsData.logs || []);
    } catch {
      if (!controller.signal.aborted && requestId === loadRequestRef.current) setResult({ error: "تعذر تحميل بيانات المزودين" });
    } finally {
      if (loadAbortRef.current === controller) loadAbortRef.current = null;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // لا نحدّث أرصدة المزودين خارجيًا تلقائيًا عند فتح الصفحة؛ هذا الطلب قد يستغرق 20 ثانية لكل مزود.
  }, [load]);

  const loadProviderServices = async (providerId: number) => {
    if (loadedServiceProviders.has(providerId) || loadingServiceProviders.has(providerId)) return;
    setLoadingServiceProviders((prev) => new Set(prev).add(providerId));
    try {
      const res = await fetch(`/api/admin/providers?mode=services&providerId=${providerId}`);
      const data = await res.json();
      if (res.ok) {
        const loaded = Array.isArray(data.services) ? data.services as ProviderService[] : [];
        const active = loaded.filter((service) => Number(service.is_active) === 1).length;
        setServices((prev) => [...prev.filter((s) => s.provider_id !== providerId), ...loaded]);
        setServiceCounts((prev) => ({ ...prev, [providerId]: loaded.length }));
        setServiceStats((prev) => ({ ...prev, [providerId]: { total: loaded.length, active, paused: Math.max(0, loaded.length - active) } }));
        setLoadedServiceProviders((prev) => new Set(prev).add(providerId));
      } else setResult({ error: data.error || "تعذر تحميل خدمات المزود" });
    } finally {
      setLoadingServiceProviders((prev) => { const next = new Set(prev); next.delete(providerId); return next; });
    }
  };

  const refreshBalances = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-balances" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResult({ error: data.error || "تعذر تحديث أرصدة المزودين" });
        return;
      }
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const probeProvider = async (providerId: number) => {
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "probe", providerId }),
      });
      const data = await res.json();
      setProviders((prev) => prev.map((p) => p.id === providerId ? { ...p, connection_status: data.connection_status || (res.ok ? "online" : "offline"), last_error: data.error || null, last_probe_at: new Date().toISOString() } : p));
      if (!res.ok) setResult({ error: data.error || "تم حفظ المزود، لكن فشل فحص الاتصال" });
    } catch {
      setProviders((prev) => prev.map((p) => p.id === providerId ? { ...p, connection_status: "offline", last_error: "تعذر الوصول إلى المزود" } : p));
      setResult({ error: "تم حفظ المزود، لكن تعذر فحص الاتصال الآن" });
    }
  };

  const saveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // لا نترك رسالة فشل قديمة ظاهرة أثناء فحص اتصال جديد.
    setResult(null);
    try {
      const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, action: "save", id: editing?.id }),
    });
      const data = await res.json();
      if (data.error) {
        setResult({ error: data.error });
      } else {
        const saved = data.provider as Provider;
        setProviders((prev) => editing
          ? prev.map((p) => p.id === Number(editing.id) ? { ...p, ...saved, connection_status: "pending" } : p)
          : [{ ...saved, connection_status: "pending" }, ...prev]);
        setResult({ message: "تم حفظ المزود فورًا. جارٍ فحص الاتصال في الخلفية؛ يمكنك متابعة العمل دون انتظار." });
        setShowForm(false);
        setEditing(null);
        setForm({ name: "", api_url: "", api_key: "", notes: "" });
        if (saved?.id) void probeProvider(Number(saved.id));
      }
    } catch {
      setResult({ error: "تعذر الوصول إلى الخادم. تحقق من الاتصال ثم أعد المحاولة." });
    } finally {
      setLoading(false);
    }
  };

  const syncServices = async (providerId: number) => {
    setSyncing(providerId);
    setResult(null);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", providerId, pricing_enabled: false }),
      });
      const data = await res.json();
      if (data.error) setResult({ error: data.error });
      else {
        setResult({ message: `تمت مزامنة ${data.imported} خدمة جديدة وتحديث ${data.updated ?? 0} خدمة دون حذف الأسعار المخصصة` });
        const syncedTotal = Number(data.services ?? data.imported ?? 0);
        setServiceCounts((prev) => ({ ...prev, [providerId]: syncedTotal }));
        setServiceStats((prev) => ({ ...prev, [providerId]: { total: syncedTotal, active: syncedTotal, paused: 0 } }));
        setLoadedServiceProviders((prev) => { const next = new Set(prev); next.delete(providerId); return next; });
        setServices((prev) => prev.filter((s) => s.provider_id !== providerId));
      }
    } finally {
      setSyncing(null);
    }
  };

  const toggleProvider = async (id: number) => {
    const previous = providers.find((p) => p.id === id)?.is_active;
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, is_active: p.is_active ? 0 : 1 } : p));
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تغيير الحالة");
      if (data.provider) setProviders((prev) => prev.map((p) => p.id === id ? { ...p, is_active: Number(data.provider.is_active) } : p));
    } catch (err: unknown) {
      setProviders((prev) => prev.map((p) => p.id === id ? { ...p, is_active: Number(previous ?? p.is_active) } : p));
      setResult({ error: errorMessage(err, "تعذر تغيير حالة المزود") });
    }
  };

  const deleteProvider = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المزود وجميع خدماته؟")) return;
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر حذف المزود");
      setProviders((prev) => prev.filter((p) => p.id !== id));
      setServices((prev) => prev.filter((s) => s.provider_id !== id));
      setServiceCounts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setServiceStats((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setLoadedServiceProviders((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      previewCacheRef.current.delete(id);
      if (previewing === id) {
        setPreviewing(null);
        setPreviewServices([]);
      }
      setResult({ message: "تم حذف المزود وخدماته محليًا فورًا" });
    } catch (err: unknown) {
      setResult({ error: errorMessage(err, "تعذر حذف المزود") });
    }
  };

  const renameService = async (id: number, name: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, name } : s));
    setServices(updated);
  };

  const updateServicePricing = async (id: number, pricing: { pricing_mode: "markup" | "manual"; markup_percent: number; manual_price?: number | null }) => {
    const service = services.find((s) => s.id === id);
    if (!service) return;
    const sellRate = pricing.pricing_mode === "manual" ? Number(pricing.manual_price || 0) : Number(service.rate) * (1 + Number(pricing.markup_percent) / 100);
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, ...pricing, sell_rate: Math.round(sellRate * 1_000_000) / 1_000_000 } : s));
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-service", id, ...pricing }),
    });
    if (!res.ok) { setResult({ error: "تعذر حفظ سعر الخدمة" }); load(); }
  };

  const serviceAction = async (id: number) => {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    const previous = s.is_active;
    const nextActive = previous ? 0 : 1;
    setServices((prev) => prev.map((x) => x.id === id ? { ...x, is_active: nextActive } : x));
    setServiceStats((prev) => {
      const current = prev[s.provider_id] || { total: 0, active: 0, paused: 0 };
      return { ...prev, [s.provider_id]: { ...current, active: Math.max(0, current.active + (nextActive ? 1 : -1)), paused: Math.max(0, current.paused + (nextActive ? -1 : 1)) } };
    });
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-service", id, is_active: nextActive }),
      });
      if (!res.ok) throw new Error("تعذر تغيير حالة الخدمة");
    } catch (err: unknown) {
      setServices((prev) => prev.map((x) => x.id === id ? { ...x, is_active: previous } : x));
      setServiceStats((prev) => {
        const current = prev[s.provider_id] || { total: 0, active: 0, paused: 0 };
        return { ...prev, [s.provider_id]: { ...current, active: Math.max(0, current.active + (previous ? 1 : -1)), paused: Math.max(0, current.paused + (previous ? -1 : 1)) } };
      });
      setResult({ error: errorMessage(err, "تعذر تغيير حالة الخدمة") });
    }
  };

  const deleteService = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة نهائيًا؟")) return;
    const removed = services.find((s) => s.id === id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    if (removed) {
      setServiceCounts((prev) => ({ ...prev, [removed.provider_id]: Math.max(0, Number(prev[removed.provider_id] || 0) - 1) }));
      setServiceStats((prev) => {
        const current = prev[removed.provider_id] || { total: 0, active: 0, paused: 0 };
        const wasActive = Number(removed.is_active) === 1;
        return { ...prev, [removed.provider_id]: { total: Math.max(0, current.total - 1), active: Math.max(0, current.active - (wasActive ? 1 : 0)), paused: Math.max(0, current.paused - (wasActive ? 0 : 1)) } };
      });
    }
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-service", id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل حذف الخدمة");
    } catch (err: unknown) {
      if (removed) {
        setServices((prev) => [...prev, removed]);
        setServiceCounts((prev) => ({ ...prev, [removed.provider_id]: Number(prev[removed.provider_id] || 0) + 1 }));
        setServiceStats((prev) => {
          const current = prev[removed.provider_id] || { total: 0, active: 0, paused: 0 };
          const wasActive = Number(removed.is_active) === 1;
          return { ...prev, [removed.provider_id]: { total: current.total + 1, active: current.active + (wasActive ? 1 : 0), paused: current.paused + (wasActive ? 0 : 1) } };
        });
      }
      setResult({ error: errorMessage(err, "فشل حذف الخدمة") });
    }
  };

  const updateAllProviderServices = async (providerId: number, mode: "markup" | "manual" = "markup", value = String(globalMarkup), scope: "provider" | "category" | "selected" = "provider", ids: number[] = [], category?: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) { setResult({ error: mode === "manual" ? "أدخل سعرًا مباشرًا صالحًا" : "أدخل نسبة ربح صالحة" }); return; }
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-provider-services", providerId, scope, ids, category, pricing_mode: mode, markup_percent: mode === "markup" ? numeric : 0, manual_price: mode === "manual" ? numeric : undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      const selectedIds = new Set(ids);
      setServices((prev) => prev.map((service) => {
        const matches = service.provider_id === providerId && (
          scope === "provider" ||
          (scope === "selected" && selectedIds.has(service.id)) ||
          (scope === "category" && (service.category === category || service.type === category))
        );
        if (!matches) return service;
        if (mode === "manual") {
          return { ...service, pricing_mode: "manual", markup_percent: 0, manual_price: numeric, sell_rate: Math.round(numeric * 1_000_000) / 1_000_000 };
        }
        return { ...service, pricing_mode: "markup", markup_percent: numeric, manual_price: null, sell_rate: Math.round(Number(service.rate) * (1 + numeric / 100) * 1_000_000) / 1_000_000 };
      }));
      setResult({ message: mode === "manual" ? `تم تطبيق سعر بيع مباشر $${numeric.toFixed(6)} على النطاق المحدد` : `تم تطبيق هامش ${numeric}% على النطاق المحدد` });
    } else setResult({ error: data.error || "تعذر تحديث الأسعار" });
  };

  const resetProviderPricing = async (providerId: number, scope: "provider" | "category" | "selected", ids: number[] = [], category?: string) => {
    if (scope === "selected" && ids.length === 0) { setResult({ error: "حدد خدمات أولًا لإلغاء النسبة عنها" }); return; }
    if (scope === "category" && !category) { setResult({ error: "اختر تصنيفًا من قائمة الفلاتر أولًا" }); return; }
    if (!confirm("سيتم إلغاء النسبة والسعر المباشر عن النطاق المحدد وإرجاعه إلى تكلفة المزود. هل تريد المتابعة؟")) return;
    const res = await fetch("/api/admin/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset-provider-pricing", providerId, scope, ids, category }) });
    const data = await res.json();
    if (res.ok) {
      const selectedIds = new Set(ids);
      setServices((prev) => prev.map((service) => {
        const matches = service.provider_id === providerId && (
          scope === "provider" ||
          (scope === "selected" && selectedIds.has(service.id)) ||
          (scope === "category" && (service.category === category || service.type === category))
        );
        return matches
          ? { ...service, pricing_mode: "markup", markup_percent: 0, manual_price: null, sell_rate: Math.round(Number(service.rate) * 1_000_000) / 1_000_000 }
          : service;
      }));
      setResult({ message: `تم إلغاء التسعير الإضافي عن ${data.updated ?? 0} خدمة` });
    } else setResult({ error: data.error || "تعذر إلغاء النسبة" });
  };

  const deleteServices = async (providerId: number, ids?: number[]) => {
    const isAll = !ids || ids.length === 0;
    const message = isAll ? "سيتم حذف جميع خدمات هذا المزود نهائيًا. هل تريد المتابعة؟" : `سيتم حذف ${ids.length} خدمة موقوفة. هل تريد المتابعة؟`;
    if (!confirm(message)) return;
    const res = await fetch("/api/admin/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-services", providerId, ids: ids || [] }) });
    const data = await res.json();
    if (res.ok) {
      const deleted = Number(data.deleted ?? 0);
      const selectedIds = new Set(ids || []);
      setServices((prev) => prev.filter((service) => service.provider_id !== providerId || (!isAll && !selectedIds.has(service.id))));
      setServiceCounts((prev) => ({
        ...prev,
        [providerId]: isAll ? 0 : Math.max(0, Number(prev[providerId] || 0) - deleted),
      }));
      setServiceStats((prev) => {
        const current = prev[providerId] || { total: Number(serviceCounts[providerId] || 0), active: 0, paused: 0 };
        if (isAll) return { ...prev, [providerId]: { total: 0, active: 0, paused: 0 } };
        const removedPaused = [...selectedIds].filter((serviceId) => services.some((service) => service.id === serviceId && Number(service.is_active) === 0)).length;
        const removedActive = Math.max(0, deleted - removedPaused);
        return { ...prev, [providerId]: { total: Math.max(0, current.total - deleted), active: Math.max(0, current.active - removedActive), paused: Math.max(0, current.paused - removedPaused) } };
      });
      if (isAll) setLoadedServiceProviders((prev) => { const next = new Set(prev); next.delete(providerId); return next; });
      setResult({ message: `تم حذف ${deleted} خدمة` });
    } else setResult({ error: data.error || "تعذر حذف الخدمات" });
  };

  // فتح نافذة جديدة يعيد كل فلاتر المعاينة والتحديد إلى الحالة الافتراضية.
  const openPreviewSafe = async (providerId: number) => {
    await openPreviewOrig(providerId);
  };

  const openPreviewOrig = async (providerId: number) => {
    const requestId = ++previewRequestRef.current;
    const cached = previewCacheRef.current.get(providerId);
    setPreviewing(providerId);
    setPreviewSearch("");
    setPreviewPlatform("all");
    setPreviewType("all");
    setPreviewPage(1);
    setSelectedPreviewIds(new Set());
    if (cached?.services?.length) {
      setPreviewServices(cached.services);
      setPreviewLoading(false);
    } else {
      setPreviewServices([]);
      setPreviewLoading(true);
    }
    try {
      const res = await fetch(`/api/admin/providers?mode=preview&providerId=${providerId}`);
      const data = await res.json();
      if (res.ok) {
        const nextServices = Array.isArray(data.services) ? data.services : [];
        previewCacheRef.current.set(providerId, { services: nextServices });
        if (requestId === previewRequestRef.current) setPreviewServices(nextServices);
      } else if (!cached && requestId === previewRequestRef.current) {
        setPreviewServices([]);
        setResult({ error: data.error || "تعذر جلب الخدمات" });
      }
    } catch {
      if (!cached && requestId === previewRequestRef.current) setResult({ error: "تعذر الوصول إلى كتالوج المزود" });
    } finally {
      if (requestId === previewRequestRef.current) setPreviewLoading(false);
    }
  };

  const addServiceFromPreview = async (providerId: number, remote_service_id: string) => {
    const selected = previewServices.find((s) => String(s.service ?? s.remote_service_id) === String(remote_service_id));
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-service", providerId, remote_service_id, service: selected, pricing_enabled: false }),
    });
    const data = await res.json();
    if (res.ok) {
      const added = data.service as ProviderService | undefined;
      if (added?.id) {
        setServices((prev) => prev.some((service) => service.id === added.id) ? prev.map((service) => service.id === added.id ? added : service) : [...prev, added]);
        setServiceCounts((prev) => ({ ...prev, [providerId]: Number(prev[providerId] || 0) + 1 }));
        setServiceStats((prev) => {
          const current = prev[providerId] || { total: 0, active: 0, paused: 0 };
          return { ...prev, [providerId]: { total: current.total + 1, active: current.active + 1, paused: current.paused } };
        });
      }
      setPreviewServices((prev) => prev.map((service) => String(service.service) === String(remote_service_id) ? { ...service, added: true } : service));
      const cached = previewCacheRef.current.get(providerId);
      if (cached) previewCacheRef.current.set(providerId, { ...cached, services: cached.services.map((service) => String(service.service) === String(remote_service_id) ? { ...service, added: true } : service) });
      setResult({ message: "أُضيفت الخدمة — ظاهرة للمستخدمين الآن" });
    } else {
      setResult({ error: data.error || "تعذرت الإضافة" });
    }
  };

  const platformLabels: Record<string, string> = {
    all: "كل المنصات",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    telegram: "Telegram",
    twitter: "Twitter / X",
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    snapchat: "Snapchat",
    discord: "Discord",
    twitch: "Twitch",
    spotify: "Spotify",
    threads: "Threads",
    other: "عام",
  };
  const typeLabels: Record<string, string> = {
    all: "كل الأنواع",
    followers: "متابعون / أعضاء",
    likes: "إعجابات",
    views: "مشاهدات",
    comments: "تعليقات",
    shares: "مشاركات",
    saves: "حفظ",
    votes: "تصويت",
    stories: "قصص / ستوري",
    reels: "ريلز",
    live: "بث مباشر",
    other: "نوع آخر",
  };

  const filteredPreviewServices = useMemo(() => {
    const q = previewSearch.trim().toLowerCase();
    return previewServices.filter((s: PreviewCatalogService) => {
      const platform = detectPlatform(String(s.category || ""), String(s.name || ""));
      const type = detectServiceType(`${String(s.name || "")} ${String(s.category || "")}`);
      const matchesPlatform = previewPlatform === "all" || platform === previewPlatform;
      const matchesType = previewType === "all" || type === previewType;
      const haystack = `${s.name || ""} ${s.service || ""} ${s.category || ""} ${s.type || ""}`.toLowerCase();
      return matchesPlatform && matchesType && (!q || haystack.includes(q));
    });
  }, [previewServices, previewPlatform, previewType, previewSearch]);

  const previewPageSize = 60;
  const previewTotalPages = Math.max(1, Math.ceil(filteredPreviewServices.length / previewPageSize));
  const safePreviewPage = Math.min(previewPage, previewTotalPages);
  const visiblePreviewServices = filteredPreviewServices.slice(
    (safePreviewPage - 1) * previewPageSize,
    safePreviewPage * previewPageSize,
  );
  const selectablePreviewServices = filteredPreviewServices.filter((s: PreviewCatalogService) => !s.added);
  const selectedVisibleCount = selectablePreviewServices.filter((s: PreviewCatalogService) => selectedPreviewIds.has(String(s.service))).length;
  const allFilteredSelected = selectablePreviewServices.length > 0 && selectedVisibleCount === selectablePreviewServices.length;

  const togglePreviewSelection = (remoteId: string, checked: boolean) => {
    setSelectedPreviewIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(remoteId); else next.delete(remoteId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedPreviewIds((previous) => {
      const next = new Set(previous);
      if (allFilteredSelected) {
        selectablePreviewServices.forEach((s) => next.delete(String(s.service)));
      } else {
        selectablePreviewServices.forEach((s) => next.add(String(s.service)));
      }
      return next;
    });
  };

  const providerSummary = useMemo(() => {
    const online = providers.filter((provider) => provider.connection_status === "online").length;
    const offline = providers.filter((provider) => provider.connection_status === "offline").length;
    const totalServices = Object.values(serviceStats).reduce((sum, stat) => sum + stat.total, 0);
    const activeServices = Object.values(serviceStats).reduce((sum, stat) => sum + stat.active, 0);
    const pausedServices = Object.values(serviceStats).reduce((sum, stat) => sum + stat.paused, 0);
    return {
      totalProviders: providers.length,
      activeProviders: providers.filter((provider) => Number(provider.is_active) === 1).length,
      online,
      offline,
      pending: Math.max(0, providers.length - online - offline),
      totalServices,
      activeServices,
      pausedServices,
    };
  }, [providers, serviceStats]);

  const requestBulkAdd = (mode: "selected" | "filtered") => {
    const candidates = mode === "selected"
      ? filteredPreviewServices.filter((s: PreviewCatalogService) => selectedPreviewIds.has(String(s.service)) && !s.added)
      : selectablePreviewServices;
    if (!candidates.length) {
      setResult({ error: mode === "selected" ? "حدد خدمة واحدة على الأقل قبل الإضافة" : "لا توجد خدمات جديدة مطابقة لهذا الفلتر" });
      return;
    }
    setBulkConfirm({ mode, services: candidates });
  };

  const saveBulkServices = async () => {
    if (!previewing || !bulkConfirm || bulkSaving) return;
    setBulkSaving(true);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-add-services",
          providerId: previewing,
          markup_percent: globalMarkup,
          services: bulkConfirm.services,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || "تعذر حفظ الخدمات الجماعية" });
        return;
      }
      const addedServices = Array.isArray(data.services) ? data.services as ProviderService[] : [];
      const addedRemoteIds = new Set(bulkConfirm.services.map((service) => String(service.service)));
      setServices((prev) => {
        const incoming = addedServices.filter((service) => !prev.some((current) => current.id === service.id));
        return incoming.length ? [...prev, ...incoming] : prev;
      });
      const addedCount = Number(data.added || addedServices.length || 0);
      setServiceCounts((prev) => ({ ...prev, [previewing]: Number(prev[previewing] || 0) + addedCount }));
      setServiceStats((prev) => {
        const current = prev[previewing] || { total: 0, active: 0, paused: 0 };
        return { ...prev, [previewing]: { total: current.total + addedCount, active: current.active + addedCount, paused: current.paused } };
      });
      setPreviewServices((prev) => prev.map((service) => addedRemoteIds.has(String(service.service)) ? { ...service, added: true } : service));
      const cached = previewCacheRef.current.get(previewing);
      if (cached) previewCacheRef.current.set(previewing, { ...cached, services: cached.services.map((service) => addedRemoteIds.has(String(service.service)) ? { ...service, added: true } : service) });
      setBulkConfirm(null);
      setSelectedPreviewIds(new Set());
      setResult({ message: `تمت إضافة ${data.added} خدمة${data.skipped ? `، وتجاوز ${data.skipped} مضافة مسبقًا` : ""} — تظهر الآن لجميع المستخدمين` });
    } catch {
      setResult({ error: "تعذر الوصول إلى الخادم أثناء الحفظ الجماعي" });
    } finally {
      setBulkSaving(false);
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-[var(--color-gold)]/20 bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between text-[10px] text-zinc-500"><span>المزودون</span><Server size={14} className="text-[var(--color-gold)]" /></div>
            <div className="mt-1 text-lg font-black text-white">{providerSummary.totalProviders}</div>
            <div className="text-[9px] text-zinc-500">{providerSummary.activeProviders} مفعّل · {providerSummary.pending} قيد الفحص</div>
          </div>
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center justify-between text-[10px] text-zinc-500"><span>الاتصال</span><CheckCircle2 size={14} className="text-green-400" /></div>
            <div className="mt-1 text-lg font-black text-green-400">{providerSummary.online}</div>
            <div className="text-[9px] text-zinc-500">{providerSummary.offline} غير متصل</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-gold)]/20 bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between text-[10px] text-zinc-500"><span>الخدمات</span><ListChecks size={14} className="text-[var(--color-gold)]" /></div>
            <div className="mt-1 text-lg font-black text-[var(--color-gold-bright)]">{providerSummary.totalServices.toLocaleString("en-US")}</div>
            <div className="text-[9px] text-zinc-500">{providerSummary.activeServices} مفعّلة</div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between text-[10px] text-zinc-500"><span>الموقوفة</span><EyeOff size={14} className="text-amber-300" /></div>
            <div className="mt-1 text-lg font-black text-amber-300">{providerSummary.pausedServices.toLocaleString("en-US")}</div>
            <div className="text-[9px] text-zinc-500">تحتاج مراجعة أو تفعيل</div>
          </div>
        </div>

        {/* ═══ هامش الربح العام ═══ */}
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-gold)]/20 bg-[var(--color-surface)] px-4 py-3">
          <Activity size={16} className="shrink-0 text-[var(--color-gold-bright)]" />
          <span className="shrink-0 text-[12px] font-black text-white">قيمة ربح اختيارية</span>
          <div className="flex flex-1 items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={globalMarkup}
              onChange={(e) => setGlobalMarkup(Number(e.target.value))}
              className="h-9 w-20 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-surface-2)] px-2 text-center text-[12px] font-black text-[var(--color-gold-bright)] outline-none focus:border-[var(--color-gold)]"
            />
            <span className="text-[11px] text-zinc-400">اقتراح فقط — لا يُطبَّق إلا بزر ونطاق تختارهما</span>
          </div>
        </div>

        {/* ═══ بحث وتصفية المزودين محليًا دون طلبات إضافية ═══ */}
        <div className="rounded-2xl border border-[var(--color-gold)]/20 bg-[var(--color-surface)] p-2.5">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={providerSearch}
              onChange={(e) => setProviderSearch(e.target.value)}
              placeholder="ابحث باسم المزود أو الرابط أو الملاحظات..."
              className="h-10 w-full rounded-xl border border-[var(--color-gold)]/25 bg-[var(--color-surface-2)] pr-9 pl-3 text-[11px] font-bold text-white outline-none placeholder:text-zinc-600 focus:border-[var(--color-gold)]/60"
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {([["all", "الكل"], ["active", "المفعّلة"], ["paused", "الموقوفة"]] as const).map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setProviderMode(mode)} className={`h-8 rounded-xl border text-[10px] font-black transition active:scale-95 ${providerMode === mode ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-500"}`}>
                {label} ({mode === "all" ? providers.length : providers.filter((provider) => Number(provider.is_active) === (mode === "active" ? 1 : 0)).length})
              </button>
            ))}
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
                <input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} className="input-luxe h-10 w-full rounded-xl px-3 text-[13px] text-white" placeholder="https://panel.example.com أو /api/v2" inputMode="url" autoComplete="url" required />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-zinc-400">مفتاح API</label>
                <input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} className="input-luxe h-10 w-full rounded-xl px-3 text-[13px] text-white" placeholder={editing ? "اتركه فارغًا للإبقاء على المفتاح المحفوظ" : "key-xxxxxxxxxxxx"} required={!editing} />
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
                يدعم النظام أي مزود يستخدم SMM Panel API القياسي. يمكنك إدخال رابط اللوحة الأساسي أو الرابط المنتهي بـ /api/v2؛ سيقوم النظام بتطبيع الصيغة واختبار services للقراءة فقط عند الحفظ، ثم يمكنك مزامنة الخدمات دون إنشاء طلب أو خصم رصيد.
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
          {visibleProviders.length === 0 && providers.length > 0 && (
            <div className="rounded-3xl border border-dashed border-[var(--color-gold)]/25 bg-[var(--color-surface)] px-4 py-10 text-center text-[11px] text-zinc-500">
              لا توجد مزودات مطابقة للبحث أو التصفية الحالية.
            </div>
          )}
          {visibleProviders.map((p, idx) => (
            <section key={p.id} aria-label={`قسم ${p.name}`}>
              <ProviderCard
                p={p}
                services={services.filter((s) => s.provider_id === p.id)}
                serviceCount={serviceCounts[p.id] || 0}
                servicesLoaded={loadedServiceProviders.has(p.id)}
                servicesLoading={loadingServiceProviders.has(p.id)}
                onLoadServices={loadProviderServices}
                syncing={syncing}
                globalMarkup={globalMarkup}
                onSync={syncServices}
                onToggleProvider={toggleProvider}
                onPreview={openPreviewSafe}
                onEdit={(pp) => { setEditing(pp); setForm({ name: pp.name, api_url: pp.api_url, api_key: "", notes: pp.notes || "" }); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onDeleteProvider={deleteProvider}
                onServiceAction={serviceAction}
                onDeleteService={deleteService}
                onPricing={updateServicePricing}
                  onRenameService={renameService}
                onUpdateAll={updateAllProviderServices}
                onResetPricing={resetProviderPricing}
                onDeleteServices={deleteServices}
              />
              {idx < providers.length - 1 && <div className="mt-6 h-px bg-gradient-to-l from-transparent via-[var(--color-gold)]/25 to-transparent" />}
            </section>
          ))}
        </div>

        {/* ═══ مودال استعراض الخدمات المنظم ═══ */}
        {previewing !== null && (
          <div key={previewing} className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-1 backdrop-blur-sm sm:items-center sm:p-2" onClick={() => setPreviewing(null)}>
            <div className="max-h-[calc(100dvh-0.35rem)] w-full max-w-2xl overflow-hidden rounded-t-2xl border border-[var(--color-gold)]/30 bg-[#0a0a0a] shadow-[0_20px_80px_-20px_rgba(212,175,55,0.35)] sm:max-h-[92vh] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-[var(--color-gold)]/15 bg-[var(--color-surface)] p-2.5 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-black leading-tight text-gradient-luxe sm:gap-2 sm:text-[16px]"><Layers3 className="shrink-0" size={15} /> <span className="truncate">استعراض كتالوج المزوّد</span></div>
                    <div className="mt-0.5 text-[9px] leading-relaxed text-zinc-500 sm:mt-1 sm:text-[10px]">تظهر هنا كل الخدمات القادمة من المزوّد. استخدم المنصة والنوع والبحث، ثم حدّد ما تريد حفظه دفعة واحدة.</div>
                  </div>
                  <button type="button" onClick={() => setPreviewing(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border sm:h-9 sm:w-9 border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-400 transition hover:text-white"><XCircle size={17} /></button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-center sm:mt-3 sm:grid-cols-4 sm:gap-2">
                  <div className="rounded-lg border border-[var(--color-gold)]/15 bg-[var(--color-surface-2)] px-1.5 py-1.5 sm:rounded-xl sm:px-2 sm:py-2"><div className="text-[8px] text-zinc-500 sm:text-[9px]">إجمالي الكتالوج</div><b className="text-[12px] text-white sm:text-[14px]">{previewServices.length.toLocaleString("en-US")}</b></div>
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-1.5 py-1.5 sm:rounded-xl sm:px-2 sm:py-2"><div className="text-[8px] text-zinc-500 sm:text-[9px]">مطابق للفلتر</div><b className="text-[12px] text-green-400 sm:text-[14px]">{filteredPreviewServices.length.toLocaleString("en-US")}</b></div>
                  <div className="rounded-lg border border-[var(--color-gold)]/15 bg-[var(--color-surface-2)] px-1.5 py-1.5 sm:rounded-xl sm:px-2 sm:py-2"><div className="text-[8px] text-zinc-500 sm:text-[9px]">قابل للإضافة</div><b className="text-[12px] text-[var(--color-gold-bright)] sm:text-[14px]">{selectablePreviewServices.length.toLocaleString("en-US")}</b></div>
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-1.5 py-1.5 sm:rounded-xl sm:px-2 sm:py-2"><div className="text-[8px] text-zinc-500 sm:text-[9px]">محدد الآن</div><b className="text-[12px] text-sky-300 sm:text-[14px]">{selectedVisibleCount.toLocaleString("en-US")}</b></div>
                </div>
              </div>

              <div className="space-y-2 p-2 sm:space-y-3 sm:p-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={previewSearch} onChange={(e) => { setPreviewSearch(e.target.value); setPreviewPage(1); }} placeholder="ابحث باسم الخدمة أو رقمها أو التصنيف..." className="h-9 w-full rounded-xl border border-[var(--color-gold)]/25 bg-[var(--color-surface-2)] pr-9 pl-3 text-[11px] font-bold text-white placeholder:text-zinc-600 outline-none focus:border-[var(--color-gold)]/60 sm:h-10 sm:text-[12px]" />
                </div>

                <div className="rounded-xl border border-[var(--color-gold)]/15 bg-[var(--color-surface)] p-2 sm:rounded-2xl sm:p-2.5">
                  <div className="mb-1 flex items-center gap-1 text-[9px] font-black text-[var(--color-gold-pale)] sm:mb-1.5 sm:gap-1.5 sm:text-[10px]"><Filter size={12} /> المنصة</div>
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                    {["all", ...previewPlatforms].map((platform) => (
                      <button key={platform} type="button" onClick={() => { setPreviewPlatform(platform); setPreviewPage(1); }} className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black transition active:scale-95 sm:px-2.5 sm:py-1.5 sm:text-[10px] ${previewPlatform === platform ? "border-[var(--color-gold)] bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] text-black" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-400 hover:text-[var(--color-gold-pale)]"}`}>{platformLabels[platform] || platform}</button>
                    ))}
                  </div>
                  <div className="mb-1 mt-2 text-[9px] font-black text-[var(--color-gold-pale)] sm:mb-1.5 sm:mt-3 sm:text-[10px]">نوع الخدمة</div>
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                    {["all", ...previewTypes].map((type) => (
                      <button key={type} type="button" onClick={() => { setPreviewType(type); setPreviewPage(1); }} className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black transition active:scale-95 sm:px-2.5 sm:py-1.5 sm:text-[10px] ${previewType === type ? "border-[var(--color-gold)] bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] text-black" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-400 hover:text-[var(--color-gold-pale)]"}`}>{typeLabels[type] || type}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--color-gold)]/20 bg-gradient-to-r from-[var(--color-gold)]/10 to-transparent p-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:rounded-2xl sm:p-2.5">
                  <button type="button" onClick={toggleSelectAllFiltered} disabled={previewLoading || selectablePreviewServices.length === 0} className="flex h-8 min-w-0 items-center justify-center gap-1 rounded-lg border border-[var(--color-gold)]/35 bg-[var(--color-surface-2)] px-1.5 text-[9px] font-black text-[var(--color-gold-bright)] transition hover:border-[var(--color-gold)] disabled:opacity-45 sm:h-9 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:text-[10.5px]"><CheckSquare size={13} /> <span className="sm:hidden">{allFilteredSelected ? "إلغاء الكل" : "تحديد الكل"}</span><span className="hidden sm:inline">{allFilteredSelected ? "إلغاء تحديد الكل" : "تحديد الكل في الفلتر"}</span></button>
                  <button type="button" onClick={() => requestBulkAdd("selected")} disabled={selectedVisibleCount === 0 || bulkSaving} className="flex h-8 min-w-0 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] px-1 text-[9px] font-black text-black transition hover:brightness-110 disabled:opacity-45 sm:h-9 sm:flex-1 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:text-[10.5px]"><Plus size={13} /> <span className="sm:hidden">المحدد ({selectedVisibleCount})</span><span className="hidden sm:inline">إضافة المحدد ({selectedVisibleCount})</span></button>
                  <button type="button" onClick={() => requestBulkAdd("filtered")} disabled={selectablePreviewServices.length === 0 || bulkSaving} className="flex h-8 min-w-0 items-center justify-center gap-1 rounded-lg border border-green-500/35 bg-green-500/10 px-1 text-[9px] font-black text-green-300 transition hover:bg-green-500/15 disabled:opacity-45 sm:h-9 sm:flex-1 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:text-[10.5px]"><Layers3 size={13} /> <span className="sm:hidden">كل المطابق ({selectablePreviewServices.length})</span><span className="hidden sm:inline">إضافة كل المطابق ({selectablePreviewServices.length})</span></button>
                </div>

                {previewLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-zinc-400"><Loader2 className="animate-spin" size={17} /> جاري جلب الكتالوج كاملًا من سيرفر المزوّد...</div>
                ) : previewServices.length === 0 ? (
                  <div className="py-10 text-center text-[11px] text-zinc-500">لا توجد خدمات لدى هذا المزوّد</div>
                ) : filteredPreviewServices.length === 0 ? (
                  <div className="py-10 text-center text-[11px] text-zinc-500">لا توجد خدمات مطابقة للفلاتر الحالية</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-1 text-[9px] text-zinc-500 sm:text-[10px]"><span>عرض {((safePreviewPage - 1) * previewPageSize + 1).toLocaleString("en-US")}–{Math.min(safePreviewPage * previewPageSize, filteredPreviewServices.length).toLocaleString("en-US")} من {filteredPreviewServices.length.toLocaleString("en-US")}</span><span>60 خدمة في الصفحة</span></div>
                    <div className="max-h-[43vh] space-y-1 overflow-y-auto rounded-2xl border border-[var(--color-gold)]/10 bg-[#080808] p-1 sm:max-h-[47vh] sm:space-y-1.5 sm:p-1.5">
                      {visiblePreviewServices.map((s: PreviewCatalogService) => (
                        <PreviewServiceRow key={s.service} s={s} previewing={previewing!} services={services} globalMarkup={globalMarkup} selected={selectedPreviewIds.has(String(s.service))} onSelect={togglePreviewSelection} onAdd={() => addServiceFromPreview(previewing!, String(s.service))} onSaved={(msg) => setResult({ message: msg })} onError={(msg) => setResult({ error: msg })} onLocalChange={(id, patch) => setServices((prev) => prev.map((service) => service.id === id ? { ...service, ...patch } : service))} />
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 pt-0.5 sm:gap-2 sm:pt-1">
                      <button type="button" onClick={() => setPreviewPage((page) => Math.max(1, page - 1))} disabled={safePreviewPage <= 1} className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-[9px] font-black text-zinc-300 disabled:opacity-35 sm:h-8 sm:px-3 sm:text-[10px]">السابق</button>
                      <span className="rounded-lg bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-black text-[var(--color-gold-pale)] sm:px-3 sm:py-2 sm:text-[10px]">صفحة {safePreviewPage} / {previewTotalPages}</span>
                      <button type="button" onClick={() => setPreviewPage((page) => Math.min(previewTotalPages, page + 1))} disabled={safePreviewPage >= previewTotalPages} className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-[9px] font-black text-zinc-300 disabled:opacity-35 sm:h-8 sm:px-3 sm:text-[10px]">التالي</button>
                    </div>
                  </>
                )}
                <div className="pb-1 text-center text-[9.5px] leading-relaxed text-zinc-600">الإضافة الجماعية تحفظ الخدمات في Turso دفعة واحدة مع منع التكرار. لا يتم إنشاء طلبات للمزوّد ولا خصم أي رصيد أثناء هذه العملية.</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ تأكيد الحفظ الجماعي ═══ */}
        {bulkConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => !bulkSaving && setBulkConfirm(null)}>
            <div className="w-full max-w-md rounded-3xl border border-[var(--color-gold)]/35 bg-[#0d0d0d] p-5 shadow-[0_20px_80px_-20px_rgba(212,175,55,0.4)]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]"><CheckSquare size={19} /></span><div><h3 className="text-[16px] font-black text-white">تأكيد إضافة الخدمات</h3><p className="mt-1 text-[11px] leading-relaxed text-zinc-400">سيتم حفظ <b className="text-[var(--color-gold-bright)]">{bulkConfirm.services.length.toLocaleString("en-US")} خدمة</b> في كتالوج المنصة دون هامش ربح تلقائي. يمكنك تطبيق الربح لاحقًا من بطاقة المزود على نطاق محدد فقط.</p></div></div>
              <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-[10.5px] leading-relaxed text-yellow-200/80">تأكد من الفلتر الحالي قبل المتابعة. هذه العملية لا ترسل أي طلبات مدفوعة للمزوّد، لكنها ستضيف الخدمات إلى قاعدة البيانات.</div>
              <div className="mt-4 flex gap-2"><button type="button" onClick={() => setBulkConfirm(null)} disabled={bulkSaving} className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 text-[12px] font-black text-zinc-300 disabled:opacity-50">إلغاء</button><button type="button" onClick={saveBulkServices} disabled={bulkSaving} className="flex-1 rounded-xl bg-gradient-to-r from-[var(--color-gold-bright)] to-[var(--color-gold)] py-2.5 text-[12px] font-black text-black disabled:opacity-50">{bulkSaving ? <Loader2 className="mx-auto animate-spin" size={16} /> : `تأكيد إضافة ${bulkConfirm.services.length.toLocaleString("en-US")}`}</button></div>
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
