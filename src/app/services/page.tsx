"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "../components/Modal";
import { Search, Layers, ChevronDown, ChevronUp, ShoppingCart, ShieldCheck, Sparkles, Zap, Infinity, RefreshCw, Wallet, type LucideIcon } from "lucide-react";
import { PlatformIcon } from "../components/Icons";
import Link from "next/link";
import { useLiveRefresh } from "../components/useLiveRefresh";
import { useLanguage, translatePlatform, translateServiceName, translateServiceType } from "../components/LanguageProvider";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import { defaultPlatformOptions, normalizePlatformId, platformEnglishDisplayName, platformOption, type PlatformOption } from "@/lib/platform-mapping";
import { AUTH_CHANGED_EVENT, type ClientAuthUser } from "../components/auth-client";
import { useInitialAuthUser } from "../components/Providers";

type ServiceRecord = {
  service?: string | number;
  name?: unknown;
  nameAr?: unknown;
  description?: unknown;
  descriptionAr?: unknown;
  categoryAr?: unknown;
  serviceType?: string;
  platform?: string;
  category?: string;
  rate?: number | string;
  min?: number | string;
  max?: number | string;
  is_new?: boolean | number | string;
};

type ServiceBadge = {
  label: string;
  icon: LucideIcon;
  color: string;
};

type ServicesSnapshot = {
  services: ServiceRecord[];
  categories: string[];
  at: number;
  platforms: PlatformOption[];
};

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

let servicesSnapshot: ServicesSnapshot | null = null;

const serviceTypeIds = ["followers", "likes", "views", "comments", "shares", "saves", "votes", "stories", "reels", "live", "other"];

const curatedPlatformLogos: Record<string, string> = {
  snapchat: "/platform-logos/snapchat-user.png",
  threads: "/platform-logos/threads-user.png",
};

function safeServiceText(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function displayServiceName(service: ServiceRecord, locale: string): string {
  const arabic = safeServiceText(service.nameAr).trim();
  const original = safeServiceText(service.name).trim();
  if (locale === "ar" && arabic) return arabic;
  return translateServiceName(original, locale as Parameters<typeof translateServiceName>[1]);
}

function displayServiceDescription(service: ServiceRecord, locale: string): string {
  const arabic = safeServiceText(service.descriptionAr).trim();
  const original = safeServiceText(service.description).trim();
  if (locale === "ar" && arabic) return arabic;
  return original;
}

function serviceBelongsToPlatform(service: ServiceRecord, platformId: string, options: PlatformOption[]): boolean {
  if (platformId === "all") return true;
  const platform = options.find((option) => option.id === platformId);
  if (!platform) return false;
  if (Array.isArray(platform.serviceIds) && platform.serviceIds.length > 0) {
    return platform.serviceIds.includes(safeServiceText(service.service));
  }
  return normalizePlatformId(safeServiceText(service.platform)) === normalizePlatformId(platformId);
}

function formatServiceRate(value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(5) : "0.00000";
}

function formatServiceQuantity(value: unknown, locale: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar-IQ" : locale).format(amount);
}

function detectGuarantees(name: string, t: (key: string) => string): { isGuaranteed: boolean; badges: ServiceBadge[] } {
  const lower = name.toLowerCase();
  const badges: ServiceBadge[] = [];

  if (/مضمون|ضمان|garant|guarantee|ضامن/.test(lower)) {
    badges.push({ label: t("service.badge.guaranteed"), icon: ShieldCheck, color: "bg-green-500/10 text-green-400 border-green-500/20" });
  }
  if (/مدى الحياة|lifetime|life time|الحياة/.test(lower)) {
    badges.push({ label: t("service.badge.lifetime"), icon: Infinity, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" });
  }
  if (/فوري|فورية|instant|fast|quick|سريع|سريعة/.test(lower)) {
    badges.push({ label: t("service.badge.instant"), icon: Zap, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" });
  }
  return { isGuaranteed: badges.length > 0, badges };
}

export default function ServicesPage() {
  const { locale, t } = useLanguage();
  const initialUser = useInitialAuthUser();
  const [accountUser, setAccountUser] = useState<ClientAuthUser | null>(initialUser);
  const [accountAuthState, setAccountAuthState] = useState<"checking" | "authenticated" | "guest">(initialUser ? "authenticated" : "checking");
  const [services, setServices] = useState<ServiceRecord[]>(servicesSnapshot?.services || []);
  const [platforms, setPlatforms] = useState<PlatformOption[]>(servicesSnapshot?.platforms || defaultPlatformOptions);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!servicesSnapshot);
  const [syncing, setSyncing] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  const [showGuaranteed, setShowGuaranteed] = useState(false);
  const [guaranteedStep, setGuaranteedStep] = useState<"platform" | "services">("platform");
  const [guaranteedPlatform, setGuaranteedPlatform] = useState<string | null>(null);
  const [guaranteedTypeFilter, setGuaranteedTypeFilter] = useState<string>("all");

  const refreshAccountBalance = useCallback(async () => {
    setRefreshingBalance(true);
    try {
      const response = await fetch("/api/user", { cache: "no-store", credentials: "include" });
      if (response.status === 401) {
        setAccountUser(null);
        setAccountAuthState("guest");
        return;
      }
      if (!response.ok) return;
      const data = await response.json() as { user?: ClientAuthUser };
      if (data.user) {
        setAccountUser(data.user);
        setAccountAuthState("authenticated");
      }
    } catch {
      // Keep the last trusted balance when a refresh is temporarily unavailable.
    } finally {
      setRefreshingBalance(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const handleAuthChange = (event: Event) => {
      if (!active) return;
      const detail = (event as CustomEvent<{ user?: ClientAuthUser | null }>).detail;
      if (detail && Object.prototype.hasOwnProperty.call(detail, "user")) {
        setAccountUser(detail.user || null);
        setAccountAuthState(detail.user ? "authenticated" : "guest");
      }
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    const timer = window.setTimeout(() => { void refreshAccountBalance(); }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    };
  }, [refreshAccountBalance]);

  const loadServices = useCallback(async (silent = false) => {
    if (!silent && servicesSnapshot) {
      setServices(servicesSnapshot.services);
      setLastSyncedAt(new Date(servicesSnapshot.at));
      setLoading(false);
    } else if (!silent) {
      setLoading(true);
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/services", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحميل الخدمات");
      const nextSnapshot: ServicesSnapshot = {
        services: Array.isArray(data.services) ? data.services as ServiceRecord[] : [],
        categories: Array.isArray(data.categories) ? data.categories as string[] : [],
        platforms: Array.isArray(data.platforms) ? data.platforms as PlatformOption[] : [],
        at: Date.now(),
      };
      servicesSnapshot = nextSnapshot;
      setServices(nextSnapshot.services);
      setPlatforms(nextSnapshot.platforms);
      setExpandedCategories((previous) => {
        if (Object.keys(previous).length > 0) return previous;
        return Object.fromEntries(nextSnapshot.categories.slice(0, 2).map((category) => [category, true]));
      });
      setFetchError("");
      setLastSyncedAt(new Date());
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "تعذر تحميل الخدمات");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadServices(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadServices]);

  useEffect(() => {
    let active = true;
    void fetch("/api/catalog-platforms", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : { platforms: [] })
      .then((data) => {
        if (!active || !Array.isArray(data.platforms)) return;
        setPlatforms((current) => {
          const custom = data.platforms as PlatformOption[];
          const byId = new Map(current.map((platform) => [platform.id, platform]));
          custom.forEach((platform) => byId.set(platform.id, platform));
          return [...byId.values()];
        });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useLiveRefresh(() => loadServices(true), { intervalMs: 120000 });

  const platformOptions = useMemo<PlatformOption[]>(() => {
    // الأزرار الافتراضية ثابتة وتظهر فورًا؛ الأزرار المخصصة تُدمج عند وصولها من الإدارة.
    const byId = new Map(defaultPlatformOptions.map((platform) => [platform.id, platform]));
    platforms.forEach((platform) => byId.set(platform.id, platform));
    const all = byId.get("all") || { ...platformOption("all"), color: "var(--color-primary)" };
    byId.set("all", { ...all, color: "var(--color-primary)" });
    return [...byId.values()];
  }, [platforms]);

  const activePlatform = platformOptions.some((platform) => platform.id === selectedPlatform)
    ? selectedPlatform
    : "all";

  const filteredServices = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(locale);
    return services.filter((s) => {
      const servicePlatform = safeServiceText(s.platform).toLowerCase();
      const serviceType = safeServiceText(s.serviceType || "other").toLowerCase();
      const serviceCategory = safeServiceText(s.category || "عام");
      const rawName = safeServiceText(s.name);
        const translatedName = displayServiceName(s, locale);
        const translatedDescription = displayServiceDescription(s, locale);
        const searchableText = [
          rawName,
          translatedName,
          safeServiceText(s.nameAr),
          safeServiceText(s.description),
          translatedDescription,
        safeServiceText(s.service),
        servicePlatform,
        translatePlatform(servicePlatform, locale),
        serviceType,
        translateServiceType(serviceType, locale),
        serviceCategory,
        translateServiceName(serviceCategory === "عام" ? "other" : serviceCategory, locale),
      ].join(" ").toLocaleLowerCase(locale);
      const matchesPlatform = serviceBelongsToPlatform(s, activePlatform, platformOptions);
      const matchesType = selectedType === "all" ? true : serviceType === selectedType;
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      return matchesPlatform && matchesType && matchesSearch;
    }).sort((a, b) => {
      // الخدمات الجديدة (وسم "جديد" / تحديث) تظهر أولًا دائمًا
      const aNew = isTruthyFlag(a.is_new) ? 1 : 0;
      const bNew = isTruthyFlag(b.is_new) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      const aType = serviceTypeIds.indexOf(safeServiceText(a.serviceType || "other"));
      const bType = serviceTypeIds.indexOf(safeServiceText(b.serviceType || "other"));
      if (aType !== bType) return (aType === -1 ? serviceTypeIds.length : aType) - (bType === -1 ? serviceTypeIds.length : bType);
      return safeServiceText(a.service).localeCompare(safeServiceText(b.service), locale, { numeric: true });
    });
  }, [services, activePlatform, selectedType, search, locale, platformOptions]);

  const servicesByCategory = useMemo(() => {
    const map: Record<string, ServiceRecord[]> = {};
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
      .filter((s) => serviceBelongsToPlatform(s, activePlatform, platformOptions))
      .forEach((s) => types.add(s.serviceType || "other"));
    return ["all", ...Array.from(types).sort((a, b) => {
      const ia = serviceTypeIds.indexOf(a);
      const ib = serviceTypeIds.indexOf(b);
      return (ia === -1 ? serviceTypeIds.length : ia) - (ib === -1 ? serviceTypeIds.length : ib);
    })];
  }, [services, activePlatform, platformOptions]);

  const guaranteedServices = useMemo(() => {
    return services.filter((s) => {
      const matchesPlatform = !guaranteedPlatform || serviceBelongsToPlatform(s, guaranteedPlatform, platformOptions);
      const { isGuaranteed } = detectGuarantees(safeServiceText(s.name), t);
      return matchesPlatform && isGuaranteed;
    });
  }, [services, guaranteedPlatform, platformOptions, t]);

  const guaranteedServicesByType = useMemo(() => {
    const map: Record<string, ServiceRecord[]> = {};
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

  const platformList = platformOptions.filter((p) => p.id !== "all");
  const builtinPlatformIds = useMemo(() => new Set(defaultPlatformOptions.map((p) => p.id)), []);
  const displayPlatformLabel = (platform: PlatformOption) => {
    if (platform.id === "all") return t("service.all");
    const canonicalId = normalizePlatformId(platform.id);
    if (builtinPlatformIds.has(canonicalId)) {
      return locale === "ar" ? platformOption(canonicalId).name : platformEnglishDisplayName(canonicalId);
    }
    return locale === "ar" ? platform.nameAr || platform.name : platform.nameEn || platform.nameAr || platform.name;
  };
  const displayPlatformBrand = (platform: PlatformOption) => {
    const canonicalId = normalizePlatformId(platform.id);
    return builtinPlatformIds.has(canonicalId) ? platformEnglishDisplayName(canonicalId) : null;
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-bg)]">
      {accountAuthState !== "checking" && (
        <>
          <Header onMenuClick={() => setSidebarOpen(true)} user={accountUser} unreadNotifications={0} />
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={accountUser} />
        </>
      )}
      <main className="flex-1 px-4 pb-28 pt-4 animate-fadeIn">
      <div className="mx-auto max-w-5xl">
      <div className="relative space-y-5">
        {/* رأس الصفحة بتدرج متوهج */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-card)] via-[var(--color-surface)] to-[var(--color-card)] p-5 shadow-[0_0_60px_-20px_var(--color-primary)]">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
          <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gradient-luxe">{t("service.title")}</h1>
              <p className="mt-1 text-xs text-zinc-400">{t("service.subtitle")}</p>
            </div>
            <div className="hidden sm:flex animate-float items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-2 text-xs font-bold text-[var(--color-primary-light)]">
              <Sparkles size={14} className="sparkle-star" />
              <span>{filteredServices.length} {t("service.availableCount")}</span>
            </div>
          </div>
          <div className="divider-glow mt-4" />
          <div className="mt-3 flex flex-col gap-2.5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-zinc-400">
              <span className={`h-2 w-2 shrink-0 rounded-full ${fetchError ? "bg-red-400" : "bg-emerald-400"} ${syncing ? "animate-pulse" : ""}`} />
              <span className="truncate">
                {fetchError ? t("service.syncError") : lastSyncedAt ? `${t("service.lastUpdatedPrefix")} ${lastSyncedAt.toLocaleTimeString(locale === "ar" ? "ar-AE" : locale, { hour: "2-digit", minute: "2-digit" })}` : t("service.syncing")}
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              {accountUser && (
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.07] px-2.5 py-1.5 shadow-[0_8px_22px_-16px_var(--color-primary)] sm:min-w-[168px] sm:flex-none">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 text-[var(--color-primary-light)]">
                      <Wallet size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[9px] font-semibold text-zinc-500">{t("profile.balance")}</span>
                      <strong dir="ltr" className="block text-sm font-black leading-none text-[var(--color-primary-light)]">${Number(accountUser.balance ?? 0).toFixed(2)}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshAccountBalance()}
                    disabled={refreshingBalance}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary)]/25 text-[var(--color-primary-light)] transition hover:bg-[var(--color-primary)]/15 disabled:cursor-wait disabled:opacity-60"
                    aria-label={t("service.refresh")}
                    title={t("service.refresh")}
                  >
                    <RefreshCw size={13} className={refreshingBalance ? "animate-spin" : ""} />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => void loadServices()}
                disabled={syncing}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-2 font-bold text-[var(--color-primary-light)] transition hover:border-[var(--color-primary)]/60 disabled:cursor-wait disabled:opacity-60"
                aria-label={t("service.refresh")}
              >
                <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                {t("service.refresh")}
              </button>
            </div>
          </div>
        </div>

        {/* Guaranteed services button */}
        <button
          type="button"
          onClick={openGuaranteed}
          aria-label={t("service.guaranteed")}
          className="group relative w-full overflow-hidden rounded-[1.35rem] border border-emerald-300/20 bg-gradient-to-br from-[#1b1d16] via-[#15130d] to-[#0d0b08] p-3.5 text-white shadow-[0_16px_42px_-22px_rgba(212,175,55,0.75)] transition duration-200 hover:border-emerald-300/45 hover:shadow-[0_18px_48px_-18px_rgba(212,175,55,0.55)] active:scale-[0.99]"
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
          <div className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-emerald-400/10 blur-3xl transition duration-300 group-hover:bg-emerald-300/20" />
          <div className="relative flex items-center gap-3">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-emerald-200/25 bg-gradient-to-br from-emerald-300/20 via-emerald-500/10 to-transparent text-emerald-100 shadow-[inset_0_0_18px_rgba(52,211,153,0.12)] transition duration-200 group-hover:scale-105">
              <ShieldCheck size={25} strokeWidth={1.9} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#15130d] bg-emerald-300 shadow-[0_0_10px_2px_rgba(110,231,183,0.6)]" />
            </span>
            <span className="min-w-0 flex-1 text-right">
              <span className="flex items-center justify-end gap-2">
                <span className="truncate text-base font-black tracking-tight text-white">{t("service.guaranteed")}</span>
                <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[9px] font-black text-emerald-200">PRO</span>
              </span>
              <span className="mt-2 flex flex-wrap justify-end gap-1.5">
                {t("service.guaranteedDesc").split("•").map((highlight) => (
                  <span key={highlight.trim()} className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[10px] font-semibold text-zinc-300">
                    {highlight.trim()}
                  </span>
                ))}
              </span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 text-[var(--color-primary-light)] transition duration-200 group-hover:-translate-x-0.5">
              <ChevronDown size={16} className="-rotate-90" />
            </span>
          </div>
        </button>

        {/* Platform grid — بطاقات منصات فاخرة */}
        <div className="relative">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {platformOptions.map((p) => {
              const active = activePlatform === p.id;
              const platformLogoUrl = p.logoUrl || curatedPlatformLogos[normalizePlatformId(p.id)];
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setSelectedPlatform(p.id); setSelectedType("all"); }}
                  className={`platform-tile group relative flex min-h-[6.5rem] flex-col items-center justify-center gap-2 px-1.5 py-3 sm:min-h-[7.25rem] sm:px-2.5 ${
                    active ? "platform-tile-active" : ""
                  }`}
                >
                  {platformLogoUrl ? (
                    <span className={`platform-logo-frame h-11 w-11 sm:h-12 sm:w-12 ${normalizePlatformId(p.id) === "threads" ? "platform-logo-frame-light" : "platform-logo-frame-dark"}`}>
                      <img src={platformLogoUrl} alt={displayPlatformLabel(p)} className="h-full w-full rounded-[0.8rem] object-contain p-1" loading="lazy" />
                    </span>
                  ) : (
                    <PlatformIcon
                      name={p.id}
                      className="platform-icon-tile h-11 w-11 sm:h-12 sm:w-12"
                      animated={false}
                    />
                  )}
                  <span className="flex min-h-[2.2rem] max-w-full flex-col items-center justify-center text-center leading-tight">
                    <span className="line-clamp-1 max-w-full text-[11px] font-bold text-zinc-100 sm:text-xs">{displayPlatformLabel(p)}</span>
                    {displayPlatformBrand(p) && <span dir="ltr" className="mt-0.5 max-w-full truncate text-[8px] font-medium tracking-wide text-zinc-500 sm:text-[9px]">{displayPlatformBrand(p)}</span>}
                  </span>
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
              {translateServiceType(type, locale)}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative group">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-[var(--color-primary)]/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--color-primary)] transition-colors" size={18} />
          <input
            type="text"
            placeholder={t("service.search")}
            aria-label={t("service.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-luxe w-full rounded-2xl py-3.5 pr-12 pl-4 text-sm text-white"
          />
        </div>

        {/* Categories */}
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-400">
            <Layers size={16} />
            <span>{t("service.categories")}</span>
            <span className="mr-auto text-xs text-zinc-600">{filteredServices.length} {t("service.availableCount")}</span>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            </div>
          ) : fetchError ? (
            <div className="card-luxe rounded-2xl border border-red-400/20 p-6 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-400/10 text-red-300">!</div>
              <h2 className="font-black text-white">{t("service.loadingError")}</h2>
              <p className="mt-1 text-xs text-zinc-400">{fetchError}</p>
              <button
                type="button"
                onClick={() => void loadServices()}
                className="mt-4 rounded-xl gradient-luxe px-4 py-2 text-xs font-black text-[#111]"
              >
                {t("service.retry")}
              </button>
            </div>
          ) : Object.keys(servicesByCategory).length === 0 ? (
            <div className="card-luxe rounded-2xl border border-[var(--color-border)] p-8 text-center">
              <Search size={34} className="mx-auto mb-3 text-[var(--color-primary)] opacity-70" />
              <p className="font-black text-white">{t("service.noResults")}</p>
              <p className="mt-1 text-xs text-zinc-500">{search.trim() ? search.trim() : translateServiceType(selectedType, locale)}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(servicesByCategory).map(([category, items], categoryIndex) => {
                const categoryElementId = `service-category-${categoryIndex}-${category.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                const expanded = expandedCategories[category];
                const translatedCategory = locale === "ar"
                  ? safeServiceText(items[0]?.categoryAr) || translateServiceName(category === "عام" ? "other" : category, locale)
                  : translateServiceName(category === "عام" ? "other" : category, locale);
                return (
                  <div key={category} className="card-luxe rounded-2xl border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      aria-expanded={expanded}
                      aria-controls={categoryElementId}
                      className="group flex w-full items-center justify-between p-4"
                    >
                      <span className="font-bold text-white text-right line-clamp-1">{translatedCategory}</span>
                      <span className="rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[10px] font-black text-[var(--color-primary-light)] group-hover:border-[var(--color-primary)]/50 transition">
                        {items.length}
                      </span>
                      {expanded ? <ChevronUp size={18} className="text-[var(--color-primary)]" /> : <ChevronDown size={18} className="text-zinc-400" />}
                    </button>
                    {expanded && (
                      <div id={categoryElementId} className="border-t border-[var(--color-primary)]/10">
                        {items.map((s) => (
                          <div key={s.service} className="p-4 border-b border-[var(--color-primary)]/8 last:border-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-gradient-luxe text-xs font-black">{translateServiceType(safeServiceText(s.serviceType || "other"), locale)}</span>
                                  {isTruthyFlag(s.is_new) && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-black text-black shadow-[0_0_12px_-2px_#f59e0b]">
                                      <Sparkles size={9} /> {t("service.new")}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-zinc-200 leading-relaxed">{displayServiceName(s, locale)}</div>
                                {displayServiceDescription(s, locale) && (
                                  <p className="mt-1 text-xs leading-5 text-zinc-500 line-clamp-2">{displayServiceDescription(s, locale)}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                                  <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5">min: {formatServiceQuantity(s.min, locale)}</span>
                                  <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5">max: {formatServiceQuantity(s.max, locale)}</span>
                                </div>
                              </div>
                              <div className="text-left">
                                <div className="text-lg font-black text-gradient-luxe">${formatServiceRate(s.rate)}</div>
                                <div className="text-xs text-zinc-500">{t("service.per1000")}</div>
                              </div>
                            </div>
                            <Link
                              href={`/orders/new?service=${s.service}`}
                              className="btn-glow-pulse mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-2 text-sm font-bold text-white transition hover:brightness-110"
                            >
                              <ShoppingCart size={16} />
                              {t("service.orderThis")}
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
          title={t("service.guaranteed")}
          subtitle={guaranteedStep === "platform" ? t("service.platforms") : `${t("service.guaranteedFor")} ${guaranteedPlatform ? translatePlatform(guaranteedPlatform, locale) : ""}`}
          zIndex={100}
        >

              {guaranteedStep === "platform" ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400">{t("service.guaranteedPrompt")}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {platformList.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectGuaranteedPlatform(p.id)}
                        className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-success)]/30 hover:bg-[var(--color-success)]/5"
                      >
                        <PlatformIcon name={p.id} className="h-7 w-7 text-white" animated />
                        <span className="mt-2 text-[10px] font-bold text-zinc-300">{p.id === "all" ? t("service.all") : translatePlatform(p.id, locale)}</span>
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
                    {t("service.changePlatform")}
                  </button>

                      {guaranteedServices.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-8 text-center text-zinc-500">
                      <ShieldCheck size={48} className="mx-auto mb-3 opacity-30" />
                      <p>{t("service.noGuaranteed")}</p>
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
                          {t("service.allShort")}
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
                            {translateServiceType(type, locale)}
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
                                  {translateServiceType(type, locale)} ({typeServices.length})
                                </span>
                                <span className="h-px flex-1 bg-[var(--color-border)]" />
                              </div>
                              {typeServices.map((s) => {
                                const { badges } = detectGuarantees(safeServiceText(s.name), t);
                                return (
                                  <div key={s.service} className="rounded-2xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="font-bold text-[var(--color-primary-light)]">{translateServiceType(safeServiceText(s.serviceType || "other"), locale)}</div>
                                        <div className="mt-1 text-sm text-zinc-200 leading-relaxed">{displayServiceName(s, locale)}</div>
                                        {displayServiceDescription(s, locale) && (
                                          <p className="mt-1 text-xs leading-5 text-zinc-500 line-clamp-2">{displayServiceDescription(s, locale)}</p>
                                        )}
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
                                        <div className="text-lg font-black text-[var(--color-primary)]">${formatServiceRate(s.rate)}</div>
                                        <div className="text-xs text-zinc-500">{t("service.per1000")}</div>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                                      <span>min: {formatServiceQuantity(s.min, locale)}</span>
                                      <span>max: {formatServiceQuantity(s.max, locale)}</span>
                                    </div>
                                    <Link
                                      href={`/orders/new?service=${s.service}`}
                                      onClick={() => setShowGuaranteed(false)}
                                      className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-bold text-white"
                                    >
                                      <ShoppingCart size={16} />
                                      {t("service.orderThis")}
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
      </div>
      </main>
      <BottomNav />
    </div>
  );
}
