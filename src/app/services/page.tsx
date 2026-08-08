"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Search, Layers, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
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

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

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

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-white">الخدمات</h1>

        {/* Platform grid */}
        <div className="grid grid-cols-4 gap-3">
          {platformOrder.map((p) => {
            const active = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setSelectedPlatform(p.id); setSelectedType("all"); }}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3 transition aspect-square ${
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/30"
                }`}
              >
                <PlatformIcon name={p.id} className="h-8 w-8 text-white" />
                <span className="mt-2 text-[10px] font-bold text-zinc-300">{p.name}</span>
              </button>
            );
          })}
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
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="ابحث عن خدمة بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] py-3.5 pr-12 pl-4 text-sm text-white outline-none focus:border-[var(--color-primary)]"
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
                  <div key={category} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex w-full items-center justify-between p-4"
                    >
                      <span className="font-bold text-white text-right line-clamp-1">{category}</span>
                      {expanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
                    </button>
                    {expanded && (
                      <div className="border-t border-[var(--color-border)]">
                        {items.map((s) => (
                          <div key={s.service} className="p-4 border-b border-[var(--color-border)] last:border-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-black text-white">#{s.service}</div>
                                <div className="mt-1 text-sm text-zinc-400 leading-relaxed">{s.name}</div>
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
                              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-2 text-sm font-bold text-white"
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
      </div>
    </DashboardLayout>
  );
}
