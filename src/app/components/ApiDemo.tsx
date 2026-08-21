"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "./ThemeProvider";
import {
  RefreshCw,
  Wallet,
  Package,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Code2,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Filter,
  ShoppingCart,
  Eye,
} from "lucide-react";

interface Service {
  service: number;
  name: string;
  category: string;
  type: string;
  rate: string;
  min: number;
  max: number;
  desc?: string;
  description?: string;
}

interface Balance {
  balance: string;
  currency: string;
}

type ServicesResponse = {
  error?: string;
  services?: Service[];
  categories?: string[];
};

type StatusResult = {
  status?: string;
  status_ar?: string;
  charge?: string | number;
  start_count?: string | number;
  remains?: string | number;
  error?: string;
};

type OrderResult = {
  order?: number | string;
  error?: string;
};

const PAGE_SIZE = 15;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "تعذر تنفيذ العملية";
}

const statusColors: Record<string, string> = {
  Pending: "text-amber-600 bg-amber-50 border-amber-100",
  "In progress": "text-blue-600 bg-blue-50 border-blue-100",
  Completed: "text-green-600 bg-green-50 border-green-100",
  Partial: "text-orange-600 bg-orange-50 border-orange-100",
  Canceled: "text-red-600 bg-red-50 border-red-100",
  Cancel: "text-red-600 bg-red-50 border-red-100",
  Fail: "text-red-700 bg-red-50 border-red-100",
  Refunded: "text-purple-600 bg-purple-50 border-purple-100",
};

export default function ApiDemo() {
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [page, setPage] = useState(1);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [creating, setCreating] = useState(false);

  const [orderId, setOrderId] = useState("");
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [actionLoading, setActionLoading] = useState<"refill" | "cancel" | null>(null);
  const [actionResult, setActionResult] = useState<{ message?: string; error?: string } | null>(null);

  const fetchServices = async () => {
    setLoadingServices(true);
    setError(null);
    try {
      const res = await fetch("/api/services");
      const data = (await res.json()) as ServicesResponse;
      if (data.error) throw new Error(data.error);
      setServices(data.services || []);
      setCategories(["الكل", ...(data.categories || [])]);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchBalance = async () => {
    setLoadingBalance(true);
    setError(null);
    try {
      const res = await fetch("/api/balance");
      const data = (await res.json()) as Balance & { error?: string };
      if (data.error) throw new Error(data.error);
      setBalance(data);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchServices();
      void fetchBalance();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = services;

    if (selectedCategory !== "الكل") {
      list = list.filter((s) => s.category === selectedCategory);
    }

    if (term) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.category.toLowerCase().includes(term) ||
          String(s.service).includes(term)
      );
    }

    return list;
  }, [search, selectedCategory, services]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visiblePage = Math.min(page, Math.max(totalPages, 1));
  const paginated = useMemo(() => {
    const start = (visiblePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, visiblePage]);

  const handleServiceSelect = (svc: Service) => {
    setSelectedService(svc);
    setServiceId(String(svc.service));
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setOrderResult(null);
    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: serviceId, link, quantity }),
      });
      const data = await res.json();
      setOrderResult(data);
      if (data.order) {
        setOrderId(String(data.order));
      }
    } catch (err: unknown) {
      setOrderResult({ error: errorMessage(err) });
    } finally {
      setCreating(false);
    }
  };

  const checkStatus = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!orderId) return;
    setChecking(true);
    setStatusResult(null);
    setActionResult(null);
    try {
      const res = await fetch("/api/order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderId }),
      });
      const data = (await res.json()) as StatusResult;
      setStatusResult(data);
    } catch (err: unknown) {
      setStatusResult({ error: errorMessage(err) });
    } finally {
      setChecking(false);
    }
  };

  const handleAction = async (action: "refill" | "cancel") => {
    if (!orderId) return;
    setActionLoading(action);
    setActionResult(null);
    try {
      const res = await fetch(`/api/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderId }),
      });
      const data = await res.json();
      setActionResult(data);
      if (!data.error) checkStatus();
    } catch (err: unknown) {
      setActionResult({ error: errorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  };

  const estimatedCost = useMemo(() => {
    if (!selectedService || !quantity) return 0;
    const rate = Number(selectedService.rate);
    const qty = Number(quantity);
    if (!rate || !qty) return 0;
    return (rate * qty) / 1000;
  }, [selectedService, quantity]);

  return (
    <section id="api" className="bg-[#f8faff] px-5 py-20 lg:py-[80px]">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8edf5] bg-white px-4 py-1.5 text-sm font-bold text-[#1565c0] shadow-sm">
            <Code2 size={16} />
            واجهة برمجة التطبيقات
          </div>
          <h2 className="mb-3 text-[clamp(1.7rem,3vw,2.4rem)] font-black text-[#0a2463]">
            متصل مباشرة بسيرفرات {brandName}
          </h2>
          <p className="mx-auto max-w-[650px] text-base text-[#6b7280]">
            جلب كامل للخدمات والسيرفرات مع إمكانية إنشاء الطلبات، متابعتها، إعادة التعبئة، والإلغاء.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Top cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-[20px] border border-[#e8edf5] bg-white p-6 shadow-[0_4px_20px_rgba(21,101,192,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0a2463]">الرصيد المتاح</h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f2fd] text-[#1565c0]">
                <Wallet size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-[#0a2463]">
              {loadingBalance ? <Loader2 className="animate-spin" size={28} /> : balance ? `${Number(balance.balance).toFixed(5)} ${balance.currency}` : "—"}
            </div>
            <button onClick={fetchBalance} className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#1565c0] hover:underline">
              <RefreshCw size={15} /> تحديث الرصيد
            </button>
          </div>

          <div className="rounded-[20px] border border-[#e8edf5] bg-white p-6 shadow-[0_4px_20px_rgba(21,101,192,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0a2463]">إجمالي الخدمات</h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f2fd] text-[#1565c0]">
                <Package size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-[#0a2463]">
              {loadingServices ? <Loader2 className="animate-spin" size={28} /> : services.length.toLocaleString("ar-EG")}
            </div>
            <p className="mt-2 text-sm text-[#6b7280]">خدمة متاحة عبر السيرفر</p>
          </div>

          <div className="rounded-[20px] border border-[#e8edf5] bg-white p-6 shadow-[0_4px_20px_rgba(21,101,192,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0a2463]">التصنيفات</h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f2fd] text-[#1565c0]">
                <Filter size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-[#0a2463]">
              {loadingServices ? <Loader2 className="animate-spin" size={28} /> : categories.length > 1 ? (categories.length - 1).toLocaleString("ar-EG") : "—"}
            </div>
            <p className="mt-2 text-sm text-[#6b7280]">تصنيف متاح</p>
          </div>
        </div>

        {/* Create order */}
        <div className="mb-8 rounded-[20px] border border-[#e8edf5] bg-white p-6 shadow-[0_4px_20px_rgba(21,101,192,0.08)]">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f2fd] text-[#1565c0]">
              <ShoppingCart size={20} />
            </div>
            <h3 className="text-base font-extrabold text-[#0a2463]">إنشاء طلب جديد</h3>
          </div>

          <form onSubmit={createOrder} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0a2463]">اختر الخدمة</label>
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  const svc = services.find((s) => String(s.service) === e.target.value);
                  setSelectedService(svc || null);
                }}
                className="w-full rounded-xl border border-[#e8edf5] bg-[#f8faff] px-4 py-3 text-sm text-[#0a2463] outline-none focus:border-[#1565c0] focus:ring-2 focus:ring-[#1565c0]/20"
                required
              >
                <option value="">اختر من القائمة أدناه أو اكتب المعرف</option>
                {services.map((s) => (
                  <option key={s.service} value={s.service}>
                    #{s.service} — {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0a2463]">معرف الخدمة</label>
              <input
                type="text"
                placeholder="مثال: 7966"
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  const svc = services.find((s) => String(s.service) === e.target.value);
                  setSelectedService(svc || null);
                }}
                className="w-full rounded-xl border border-[#e8edf5] bg-[#f8faff] px-4 py-3 text-sm text-[#0a2463] placeholder:text-[#9ca3af] outline-none focus:border-[#1565c0] focus:ring-2 focus:ring-[#1565c0]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0a2463]">الرابط / username / channel</label>
              <input
                type="text"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full rounded-xl border border-[#e8edf5] bg-[#f8faff] px-4 py-3 text-sm text-[#0a2463] placeholder:text-[#9ca3af] outline-none focus:border-[#1565c0] focus:ring-2 focus:ring-[#1565c0]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0a2463]">الكمية</label>
              <input
                type="number"
                placeholder={selectedService ? `من ${selectedService.min} إلى ${selectedService.max}` : "1000"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={selectedService?.min}
                max={selectedService?.max}
                className="w-full rounded-xl border border-[#e8edf5] bg-[#f8faff] px-4 py-3 text-sm text-[#0a2463] placeholder:text-[#9ca3af] outline-none focus:border-[#1565c0] focus:ring-2 focus:ring-[#1565c0]/20"
                required
              />
            </div>

            {selectedService && (
              <div className="rounded-xl border border-[#e8edf5] bg-[#f8faff] p-4 lg:col-span-2">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="rounded-full bg-white px-3 py-1 font-bold text-[#0a2463] border border-[#e8edf5]">
                    السعر: ${Number(selectedService.rate).toFixed(5)} لكل 1000
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-bold text-[#0a2463] border border-[#e8edf5]">
                    الحد الأدنى: {selectedService.min}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-bold text-[#0a2463] border border-[#e8edf5]">
                    الحد الأقصى: {selectedService.max}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-bold text-[#1565c0] border border-[#e8edf5]">
                    التكلفة التقديرية: ${estimatedCost.toFixed(5)}
                  </span>
                </div>
                {(selectedService.desc || selectedService.description) && (
                  <p className="mt-3 text-sm leading-relaxed text-[#6b7280]">
                    {selectedService.desc || selectedService.description}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-[#1565c0] to-[#2196f3] px-8 text-sm font-extrabold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-60"
              >
                {creating ? <Loader2 className="animate-spin" size={20} /> : "إنشاء الطلب"}
              </button>
              {orderResult && (
                <div className="flex items-center gap-2 text-sm font-bold">
                  {orderResult.order ? (
                    <>
                      <CheckCircle2 size={18} className="text-green-600" />
                      <span className="text-green-700">تم إنشاء الطلب رقم: {orderResult.order}</span>
                    </>
                  ) : (
                    <span className="text-red-600">{orderResult.error}</span>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Order status */}
        <div className="mb-8 rounded-[20px] border border-[#e8edf5] bg-white p-6 shadow-[0_4px_20px_rgba(21,101,192,0.08)]">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f2fd] text-[#1565c0]">
              <Eye size={20} />
            </div>
            <h3 className="text-base font-extrabold text-[#0a2463]">متابعة حالة الطلب</h3>
          </div>

          <form onSubmit={checkStatus} className="flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              placeholder="أدخل رقم الطلب"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="flex-1 rounded-xl border border-[#e8edf5] bg-[#f8faff] px-4 py-3 text-sm text-[#0a2463] placeholder:text-[#9ca3af] outline-none focus:border-[#1565c0] focus:ring-2 focus:ring-[#1565c0]/20"
              required
            />
            <button
              type="submit"
              disabled={checking}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#0a2463] px-8 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-[#081a47] disabled:opacity-60"
            >
              {checking ? <Loader2 className="animate-spin" size={20} /> : "فحص الحالة"}
            </button>
          </form>

          {statusResult && !statusResult.error && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#e8edf5] bg-[#f8faff] p-4">
                <div className="mb-1 text-xs font-bold text-[#6b7280]">الحالة</div>
                <div className={`inline-block rounded-full border px-3 py-1 text-sm font-extrabold ${(statusResult.status ? statusColors[statusResult.status] : undefined) || "text-gray-600 bg-gray-50 border-gray-100"}`}>
                  {statusResult.status_ar || statusResult.status}
                </div>
              </div>
              <div className="rounded-xl border border-[#e8edf5] bg-[#f8faff] p-4">
                <div className="mb-1 text-xs font-bold text-[#6b7280]">التكلفة</div>
                <div className="text-lg font-black text-[#0a2463]">${statusResult.charge || "—"}</div>
              </div>
              <div className="rounded-xl border border-[#e8edf5] bg-[#f8faff] p-4">
                <div className="mb-1 text-xs font-bold text-[#6b7280]">العدد عند البداية</div>
                <div className="text-lg font-black text-[#0a2463]">{statusResult.start_count ?? "—"}</div>
              </div>
              <div className="rounded-xl border border-[#e8edf5] bg-[#f8faff] p-4">
                <div className="mb-1 text-xs font-bold text-[#6b7280]">المتبقي</div>
                <div className="text-lg font-black text-[#0a2463]">{statusResult.remains ?? "—"}</div>
              </div>

              <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
                <button
                  onClick={() => handleAction("refill")}
                  disabled={actionLoading === "refill"}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-50 px-5 text-sm font-extrabold text-amber-700 border border-amber-100 hover:bg-amber-100 disabled:opacity-60"
                >
                  {actionLoading === "refill" ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
                  طلب إعادة تعبئة
                </button>
                <button
                  onClick={() => handleAction("cancel")}
                  disabled={actionLoading === "cancel"}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-red-50 px-5 text-sm font-extrabold text-red-700 border border-red-100 hover:bg-red-100 disabled:opacity-60"
                >
                  {actionLoading === "cancel" ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                  إلغاء الطلب
                </button>
              </div>
            </div>
          )}

          {statusResult?.error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              {statusResult.error}
            </div>
          )}

          {actionResult && (
            <div className={`mt-4 rounded-xl border p-4 text-sm font-bold ${actionResult.error ? "border-red-100 bg-red-50 text-red-700" : "border-green-100 bg-green-50 text-green-700"}`}>
              {actionResult.error || actionResult.message}
            </div>
          )}
        </div>

        {/* Services catalog */}
        <div className="overflow-hidden rounded-[20px] border border-[#e8edf5] bg-white shadow-[0_4px_20px_rgba(21,101,192,0.08)]">
          <div className="flex flex-col gap-4 border-b border-[#e8edf5] bg-[#f8faff] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f2fd] text-[#1565c0]">
                <Package size={20} />
              </div>
              <h3 className="text-base font-extrabold text-[#0a2463]">كتالوج الخدمات</h3>
              <span className="mr-2 rounded-full bg-[#1565c0]/10 px-3 py-1 text-xs font-black text-[#1565c0]">
                {filtered.length.toLocaleString("ar-EG")} خدمة
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-full border border-[#e8edf5] bg-white py-2.5 px-4 text-sm text-[#0a2463] outline-none focus:border-[#1565c0] focus:ring-2 focus:ring-[#1565c0]/20"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <div className="relative w-full sm:w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
                <input
                  type="text"
                  placeholder="ابحث بالمعرف أو الاسم أو التصنيف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full border border-[#e8edf5] bg-white py-2.5 pr-10 pl-4 text-sm text-[#0a2463] placeholder:text-[#9ca3af] outline-none focus:border-[#1565c0] focus:ring-2 focus:ring-[#1565c0]/20"
                />
              </div>
            </div>
          </div>

          <div className="max-h-[520px] overflow-auto">
            {loadingServices ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="animate-spin text-[#1565c0]" size={36} />
              </div>
            ) : paginated.length === 0 ? (
              <div className="p-10 text-center text-[#6b7280]">لا توجد خدمات مطابقة</div>
            ) : (
              <table className="w-full text-right">
                <thead className="sticky top-0 z-10 bg-[#f8faff] text-xs font-black uppercase tracking-wider text-[#6b7280]">
                  <tr>
                    <th className="px-5 py-3">المعرف</th>
                    <th className="px-5 py-3">الاسم</th>
                    <th className="px-5 py-3">التصنيف</th>
                    <th className="px-5 py-3">السعر لكل 1000</th>
                    <th className="px-5 py-3">الحدود</th>
                    <th className="px-5 py-3">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8edf5]">
                  {paginated.map((service) => (
                    <tr key={service.service} className="transition-colors hover:bg-[#f8faff]">
                      <td className="px-5 py-3 text-sm font-black text-[#1565c0]">#{service.service}</td>
                      <td className="px-5 py-3 text-sm text-[#0a2463]">
                        <div className="max-w-[280px] truncate" title={service.name}>{service.name}</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#6b7280]">{service.category}</td>
                      <td className="px-5 py-3 text-sm font-bold text-[#0a2463]">${Number(service.rate).toFixed(5)}</td>
                      <td className="px-5 py-3 text-sm text-[#6b7280]">{service.min} — {service.max}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleServiceSelect(service)}
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-[#e3f2fd] px-3 text-xs font-extrabold text-[#1565c0] hover:bg-[#1565c0] hover:text-white transition-colors"
                        >
                          اختر
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loadingServices && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#e8edf5] bg-[#f8faff] px-5 py-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#0a2463] border border-[#e8edf5] disabled:opacity-50 hover:border-[#1565c0] transition-colors"
              >
                <ChevronRight size={16} /> السابق
              </button>
              <span className="text-sm font-bold text-[#6b7280]">
                صفحة {page.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#0a2463] border border-[#e8edf5] disabled:opacity-50 hover:border-[#1565c0] transition-colors"
              >
                التالي <ChevronLeft size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
