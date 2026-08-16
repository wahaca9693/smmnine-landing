"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Modal } from "../components/Modal";
import { Search, Layers, ChevronDown, ChevronUp, ShoppingCart, ShieldCheck, Sparkles, Zap, Infinity, RefreshCw } from "lucide-react";
import { PlatformIcon } from "../components/Icons";
import Link from "next/link";

const platformOrder = [
  { id: "facebook", name: "فيسبوك" },
  { id: "tiktok", name: "تيك توك" },
  { id: "instagram", name: "إنستغرام" },
  { id: "whatsapp", name: "واتساب" },
  { id: "twitter", name: "تويتر / X" },
  { id: "youtube", name: "يوتيوب" },
  { id: "telegram", name: "تيليجرام" },
  { id: "discord", name: "ديسكورد" },
  { id: "snapchat", name: "سناب جات" },
  { id: "threads", name: "ثريدز" },
  { id: "twitch", name: "تويتش" },
  { id: "kuaishou", name: "كواي" },
  { id: "likee", name: "كيك" },
  { id: "spotify", name: "سبوتيفاي" },
  { id: "other", name: "أخرى" },
  { id: "all", name: "الكل" },
];

const serviceTypeLabels: Record<string, string> = {
  followers: "متابعين",
  likes: "لايكات",
  views: "مشاهدات",
  comments: "تعليقات",
  shares: "مشاركات",
  saves: "حفظ",
  votes: "تصويت",
  stories: "ستوريات",
  reels: "ريلز",
  live: "بث مباشر",
  other: "أخرى",
};

function detectGuarantees(name: string): { isGuaranteed: boolean; badges: { label: string; icon: any; color: string }[] } {
  const lower = name.toLowerCase();
  const badges: { label: string; icon: any; color: string }[] = [];

  if (/مضمون|ضمان|garant|guarantee|ضامن/.test(lower)) {
    badges.push({ label: "مضمونة", icon: ShieldCheck, color: "bg-green-500/10 text-green-400 border-green-500/20" });
  }
  if (/مدى الحياة|lifetime|life time|الحياة/.test(lower)) {
    badges.push({ label: "مدى الحياة", icon: Infinity, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" });
  }
  if (/فوري|فورية|instant|fast|quick|سريع|سريعة/.test(lower)) {
    badges.push({ label: "فورية", icon: Zap, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" });
  }
  if (/تعويض|refill|auto refill|إعادة تعبئة/.test(lower)) {
    badges.push({ label: "تعويض تلقائي", icon: RefreshCw, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" });
  }

  return { isGuaranteed: badges.length > 0, badges };
}

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [showGuaranteed, setShowGuaranteed] = useState(false);
  const [guaranteedStep, setGuaranteedStep] = useState<"platform" | "services">("platform");
  const [guaranteedPlatform, setGuaranteedPlatform] = useState<string | null>(null);
  const [guaranteedTypeFilter, setGuaranteedTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data.services || []);
        setCategories(data.categories || []);
        setPlatforms(data.platforms || []);
        setLoading(false);
      });
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesPlatform = selectedPlatform === "all" ? true : s.platform === selectedPlatform;
      const matchesType = selectedType === "all" ? true : s.serviceType === selectedType;
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || String(s.service).includes(search);
      return matchesPlatform && matchesType && matchesSearch;
    }).sort((a, b) => {
      // الخدمات الجديدة (وسم "جديد" / تحديث) تظهر أولًا دائمًا
      const aNew = !!(a as any).is_new ? 1 : 0;
      const bNew = !!(b as any).is_new ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return String(a.service).localeCompare(String(b.service));
    });
  }, [services, selectedPlatform, selectedType, search]);

  const servicesByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredServices.forEach((s) => {
      const cat = s.category || "عام";
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    return map;
  }, [filteredServices]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    services
      .filter((s) => selectedPlatform === "all" || s.platform === selectedPlatform)
      .forEach((s) => types.add(s.serviceType || "other"));
    return ["all", ...Array.from(types)];
  }, [services, selectedPlatform]);

  const guaranteedServices = useMemo(() => {
    return services.filter((s) => {
      const matchesPlatform = !guaranteedPlatform || guaranteedPlatform === "all" ? true : s.platform === guaranteedPlatform;
      const { isGuaranteed } = detectGuarantees(s.name);
      return matchesPlatform && isGuaranteed;
    });
  }, [services, guaranteedPlatform]);

  const guaranteedServicesByType = useMemo(() => {
    const map: Record<string, any[]> = {};
    guaranteedServices.forEach((s) => {
      const type = s.serviceType || "other";
      if (!map[type]) map[type] = [];
      map[type].push(s);
    });
    return map;
  }, [guaranteedServices]);

  const guaranteedTypes = useMemo(() => {
    return Object.keys(guaranteedServicesByType).sort((a, b) => {
      const order = ["followers", "likes", "views", "comments", "shares", "saves", "stories", "reels", "live", "other"];
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [guaranteedServicesByType]);

  const filteredGuaranteedServicesByType = useMemo(() => {
    if (guaranteedTypeFilter === "all") return guaranteedServicesByType;
    const type = guaranteedTypeFilter;
    if (!guaranteedServicesByType[type]) return {};
    return { [type]: guaranteedServicesByType[type] };
  }, [guaranteedServicesByType, guaranteedTypeFilter]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const openGuaranteed = () => {
    setShowGuaranteed(true);
    setGuaranteedStep("platform");
    setGuaranteedPlatform(null);
  };

  const selectGuaranteedPlatform = (platformId: string) => {
    setGuaranteedPlatform(platformId);
    setGuaranteedTypeFilter("all");
    setGuaranteedStep("services");
  };

  const platformList = platformOrder.filter((p) => p.id !== "all");

  return (
    <DashboardLayout>
      <div className="relative space-y-5">
        {/* رأس الصفحة بتدرج متوهج */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-card)] via-[var(--color-surface)] to-[var(--color-card)] p-5 shadow-[0_0_60px_-20px_var(--color-primary)]">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
          <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gradient-luxe">الخدمات</h1>
              <p className="mt-1 text-xs text-zinc-400">اختر منصتك واعثر على الخدمة المثالية لنمو حسابك</p>
            </div>
            <div className="hidden sm:flex animate-float items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-2 text-xs font-bold text-[var(--color-primary-light)]">
              <Sparkles size={14} className="sparkle-star" />
              <span>{filteredServices.length} خدمة متاحة</span>
            </div>
          </div>
          <div className="divider-glow mt-4" />
        </div>

        {/* Guaranteed services button */}
        <button
          onClick={openGuaranteed}
          className="card-luxe card-lift group relative w-full overflow-hidden rounded-2xl p-4 text-white"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <ShieldCheck size={26} />
              </span>
              <div className="text-right">
                <div className="text-lg font-black">الخدمات المضمونة</div>
                <div className="text-xs opacity-90">خدمات مختارة بضمان • تعويض تلقائي • مدى الحياة</div>
              </div>
            </div>
            <Sparkles size={24} className="opacity-80 group-hover:animate-pulse" />
          </div>
        </button>

        {/* Platform grid — بطاقات منصات فاخرة */}
        <div className="relative">
          <div className="pointer-events-none absolute -top-6 inset-x-0 h-24 bg-[var(--color-primary)]/8 blur-2xl" />
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {platformOrder.map((p) => {
              const active = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPlatform(p.id); setSelectedType("all"); }}
                  className={`card-luxe group relative flex flex-col items-center justify-center rounded-2xl border p-3 aspect-square ${
                    active
                      ? "border-[var(--color-primary)]/70 bg-[var(--color-primary)]/10 shadow-[0_0_32px_-6px_var(--color-primary)]"
                      : ""
                  }`}
                >
                  {active && <div className="pointer-events-none absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_2px_var(--color-primary)] sparkle-star" />}
                <PlatformIcon
                  name={p.id}
                  className={`h-8 w-8 ${active ? "platform-icon-animated-active" : "text-white"}`}
                  animated={!active}
                />
                <span className="mt-2 text-[10px] font-bold text-zinc-300">{p.name}</span>
              </button>
            );
          })}
          </div>
        </div>

        {/* Service type filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                selectedType === type
                  ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white"
                  : "bg-[var(--color-card)] text-zinc-400 border border-[var(--color-border)]"
              }`}
            >
              {serviceTypeLabels[type] || type}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative group">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-[var(--color-primary)]/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--color-primary)] transition-colors" size={18} />
          <input
            type="text"
            placeholder="ابحث عن خدمة بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-luxe w-full rounded-2xl py-3.5 pr-12 pl-4 text-sm text-white"
          />
        </div>

        {/* Categories */}
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-400">
            <Layers size={16} />
            <span>الفئات</span>
            <span className="mr-auto text-xs text-zinc-600">{filteredServices.length} خدمة</span>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(servicesByCategory).map(([category, items]) => {
                const expanded = expandedCategories[category];
                return (
                  <div key={category} className="card-luxe rounded-2xl border overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="group flex w-full items-center justify-between p-4"
                    >
                      <span className="font-bold text-white text-right line-clamp-1">{category}</span>
                      <span className="rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[10px] font-black text-[var(--color-primary-light)] group-hover:border-[var(--color-primary)]/50 transition">
                        {items.length}
                      </span>
                      {expanded ? <ChevronUp size={18} className="text-[var(--color-primary)]" /> : <ChevronDown size={18} className="text-zinc-400" />}
                    </button>
                    {expanded && (
                      <div className="border-t border-[var(--color-primary)]/10">
                        {items.map((s) => (
                          <div key={s.service} className="p-4 border-b border-[var(--color-primary)]/8 last:border-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-gradient-luxe text-sm font-black">#{s.service}</span>
                                  {(s as any).is_new && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-black text-black shadow-[0_0_12px_-2px_#f59e0b]">
                                      <Sparkles size={9} /> جديد
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-zinc-400 leading-relaxed">{s.name}</div>
                                <div className="mt-2 flex gap-2 text-[10px] text-zinc-500">
                                  <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5">min: {s.min}</span>
                                  <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5">max: {s.max}</span>
                                </div>
                              </div>
                              <div className="text-left">
                                <div className="text-lg font-black text-gradient-luxe">${Number(s.rate).toFixed(5)}</div>
                                <div className="text-xs text-zinc-500">لكل 1000</div>
                              </div>
                            </div>
                            <Link
                              href={`/orders/new?service=${s.service}`}
                              className="btn-glow-pulse mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-2 text-sm font-bold text-white transition hover:brightness-110"
                            >
                              <ShoppingCart size={16} />
                              اطلب هذه الخدمة
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Guaranteed Services Modal */}
        <Modal
          open={showGuaranteed}
          onClose={() => setShowGuaranteed(false)}
          icon={<ShieldCheck size={22} className="text-white" />}
          title="الخدمات المضمونة"
          subtitle={guaranteedStep === "platform" ? "اختر المنصة" : `خدمات مضمونة لـ ${platformOrder.find((p) => p.id === guaranteedPlatform)?.name}`}
          zIndex={100}
        >

              {guaranteedStep === "platform" ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400">اختر المنصة اللي تريد تشوف خدماتها المضمونة:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {platformList.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectGuaranteedPlatform(p.id)}
                        className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-success)]/30 hover:bg-[var(--color-success)]/5"
                      >
                        <PlatformIcon name={p.id} className="h-7 w-7 text-white" animated />
                        <span className="mt-2 text-[10px] font-bold text-zinc-300">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setGuaranteedStep("platform")}
                    className="text-sm font-bold text-green-400 hover:underline"
                  >
                    ← تغيير المنصة
                  </button>

                      {guaranteedServices.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-8 text-center text-zinc-500">
                      <ShieldCheck size={48} className="mx-auto mb-3 opacity-30" />
                      <p>لا توجد خدمات مضمونة لهذه المنصة حالياً</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Type filter buttons */}
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        <button
                          onClick={() => setGuaranteedTypeFilter("all")}
                          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                            guaranteedTypeFilter === "all"
                              ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white"
                              : "bg-[var(--color-surface)] text-zinc-400 border border-[var(--color-border)]"
                          }`}
                        >
                          الكل
                        </button>
                        {guaranteedTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => setGuaranteedTypeFilter(type)}
                            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                              guaranteedTypeFilter === type
                                ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white"
                                : "bg-[var(--color-surface)] text-zinc-400 border border-[var(--color-border)]"
                            }`}
                          >
                            {serviceTypeLabels[type] || type}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-6">
                        {Object.entries(filteredGuaranteedServicesByType).map(([type, typeServices]) => {
                          return (
                            <div key={type} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="h-px flex-1 bg-[var(--color-border)]" />
                                <span className="rounded-full bg-[var(--color-success)]/10 px-3 py-1 text-xs font-black text-[var(--color-success)]">
                                  {serviceTypeLabels[type] || type} ({typeServices.length})
                                </span>
                                <span className="h-px flex-1 bg-[var(--color-border)]" />
                              </div>
                              {typeServices.map((s) => {
                                const { badges } = detectGuarantees(s.name);
                                return (
                                  <div key={s.service} className="rounded-2xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="font-bold text-white">#{s.service}</div>
                                        <div className="mt-1 text-sm text-zinc-300 leading-relaxed">{s.name}</div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {badges.map((badge, idx) => {
                                            const Icon = badge.icon;
                                            return (
                                              <span key={idx} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${badge.color}`}>
                                                <Icon size={10} /> {badge.label}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div className="text-left">
                                        <div className="text-lg font-black text-[var(--color-primary)]">${Number(s.rate).toFixed(5)}</div>
                                        <div className="text-xs text-zinc-500">لكل 1000</div>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                                      <span>min: {s.min}</span>
                                      <span>max: {s.max}</span>
                                    </div>
                                    <Link
                                      href={`/orders/new?service=${s.service}`}
                                      onClick={() => setShowGuaranteed(false)}
                                      className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-bold text-white"
                                    >
                                      <ShoppingCart size={16} />
                                      اطلب هذه الخدمة
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
