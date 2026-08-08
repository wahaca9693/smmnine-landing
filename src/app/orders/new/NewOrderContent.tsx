"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "../../components/DashboardLayout";
import { ShoppingCart, Check, AlertCircle, ChevronDown, ChevronUp, Calculator, Wallet } from "lucide-react";

export default function NewOrderContent() {
  const searchParams = useSearchParams();
  const initialService = searchParams.get("service");

  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [result, setResult] = useState<{ message?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [showServices, setShowServices] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data.services || []);
        setCategories(data.categories || []);
        if (initialService) {
          setServiceId(initialService);
        }
      });
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => setBalance(Number(data.user?.balance || 0)));
  }, [initialService]);

  const selectedService = useMemo(
    () => services.find((s) => String(s.service) === serviceId),
    [serviceId, services]
  );

  const estimatedCost = useMemo(() => {
    if (!selectedService || !quantity) return 0;
    return (Number(selectedService.rate) * Number(quantity)) / 1000;
  }, [selectedService, quantity]);

  const filteredServices = useMemo(() => {
    let list = services;
    if (selectedCategory) list = list.filter((s) => s.category === selectedCategory);
    if (search) list = list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || String(s.service).includes(search));
    return list;
  }, [services, selectedCategory, search]);

  const presetQuantities = [100, 500, 1000, 5000, 10000];

  const calculatePriceFor = (qty: number) => {
    if (!selectedService) return 0;
    return (Number(selectedService.rate) * qty) / 1000;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !link || !quantity) return;
    setConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setConfirmDialog(false);
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, link, quantity }),
    });
    const data = await res.json();
    if (data.error) setResult({ error: data.error });
    else {
      setResult({ message: `تم إنشاء الطلب بنجاح: #${data.order.smmnine_order_id}` });
      setBalance((b) => b - Number(data.order.charge));
      setServiceId("");
      setLink("");
      setQuantity("");
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-white">طلب جديد</h1>

        <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Wallet size={18} />
            <span className="text-sm">رصيدك</span>
          </div>
          <div className="text-xl font-black text-[var(--color-primary)]">$ {balance.toFixed(4)}</div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Service selection */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowServices(!showServices)}
              className="flex w-full items-center justify-between p-4"
            >
              <span className="font-bold text-white text-right line-clamp-1">
                {selectedService ? `#${selectedService.service} — ${selectedService.name.slice(0, 45)}${selectedService.name.length > 45 ? "..." : ""}` : "اختر الخدمة"}
              </span>
              {showServices ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
            </button>

            {showServices && (
              <div className="border-t border-[var(--color-border)] p-4 space-y-3">
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="">كل الفئات</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="ابحث عن خدمة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]"
                />
                <div className="max-h-[300px] overflow-auto space-y-2">
                  {filteredServices.slice(0, 40).map((s) => (
                    <button
                      key={s.service}
                      type="button"
                      onClick={() => { setServiceId(String(s.service)); setShowServices(false); }}
                      className={`w-full rounded-xl p-3 text-right transition ${serviceId === String(s.service) ? "bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30" : "bg-[var(--color-surface)] border border-[var(--color-border)]"}`}
                    >
                      <div className="font-bold text-white text-sm">#{s.service} — {s.name}</div>
                      <div className="mt-1 text-xs text-[var(--color-primary)]">${s.rate} / 1000 • min:{s.min} max:{s.max}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected service details */}
          {selectedService && (
            <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
              <div className="font-bold text-white leading-relaxed">{selectedService.name}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[var(--color-card)] p-2">
                  <div className="text-xs text-zinc-500">الحد الأدنى</div>
                  <div className="font-bold text-white">{selectedService.min}</div>
                </div>
                <div className="rounded-xl bg-[var(--color-card)] p-2">
                  <div className="text-xs text-zinc-500">الحد الأقصى</div>
                  <div className="font-bold text-white">{selectedService.max}</div>
                </div>
                <div className="rounded-xl bg-[var(--color-card)] p-2">
                  <div className="text-xs text-zinc-500">السعر/1000</div>
                  <div className="font-bold text-[var(--color-primary)]">${selectedService.rate}</div>
                </div>
              </div>
            </div>
          )}

          {/* Link input */}
          <div>
            <label className="mb-1 block text-sm font-bold text-zinc-400">الرابط أو اسم المستخدم</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
              placeholder="https://..."
              required
            />
          </div>

          {/* Quantity input */}
          <div>
            <label className="mb-1 block text-sm font-bold text-zinc-400">الكمية</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-white outline-none focus:border-[var(--color-primary)]"
              placeholder={selectedService ? `من ${selectedService.min} إلى ${selectedService.max}` : "1000"}
              required
            />
          </div>

          {/* Quick quantity buttons */}
          {selectedService && (
            <div className="flex flex-wrap gap-2">
              {presetQuantities.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(String(q))}
                  className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-zinc-300 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {q.toLocaleString("ar-EG")}
                </button>
              ))}
            </div>
          )}

          {/* Smart calculator */}
          {selectedService && quantity && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="mb-3 flex items-center gap-2 text-[var(--color-primary)]">
                <Calculator size={18} />
                <span className="font-bold">حاسبة السعر الذكية</span>
              </div>
              <div className="space-y-2 text-sm">
                {[100, 500, 1000, 5000, 10000].map((q) => (
                  <div key={q} className={`flex justify-between rounded-lg px-3 py-2 ${Number(quantity) === q ? "bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30" : "bg-[var(--color-surface)]"}`}>
                    <span className="text-zinc-400">{q.toLocaleString("ar-EG")} متابع:</span>
                    <span className="font-bold text-white">${calculatePriceFor(q).toFixed(5)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[var(--color-border)] pt-2">
                  <span className="text-zinc-400">الكمية المختارة ({quantity}):</span>
                  <span className="text-lg font-black text-[var(--color-primary)]">${estimatedCost.toFixed(5)}</span>
                </div>
                {balance < estimatedCost && (
                  <div className="rounded-xl bg-red-500/10 p-2 text-center text-xs font-bold text-red-400">
                    رصيدك غير كافٍ، تحتاج ${(estimatedCost - balance).toFixed(5)} إضافية
                  </div>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className={`flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${result.error ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
              {result.error ? <AlertCircle size={18} /> : <Check size={18} />}
              {result.error || result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !serviceId || !link || !quantity || balance < estimatedCost}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white shadow-lg shadow-orange-500/25 disabled:opacity-50"
          >
            {loading ? "جاري الإرسال..." : <><ShoppingCart size={20} /> متابعة الطلب</>}
          </button>
        </form>
      </div>

      {/* Confirmation dialog */}
      {confirmDialog && selectedService && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-4 sm:items-center animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 animate-slideUp">
            <h3 className="mb-4 text-lg font-black text-white">تأكيد الطلب</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">الخدمة:</span>
                <span className="text-right font-bold text-white max-w-[60%]">#{selectedService.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">الكمية:</span>
                <span className="font-bold text-white">{Number(quantity).toLocaleString("ar-EG")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">التكلفة:</span>
                <span className="font-bold text-[var(--color-primary)]">${estimatedCost.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">الرابط:</span>
                <span className="text-right font-bold text-white max-w-[60%] truncate">{link}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
              بالضغط على تأكيد، فإنك توافق على شروط الخدمة. تأكد من صحة الرابط والكمية. اقرأ{" "}
              <Link href="/terms" target="_blank" className="text-[var(--color-primary)]">شروط الاستخدام</Link>.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDialog(false)}
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 font-bold text-zinc-400"
              >
                إلغاء
              </button>
              <button
                onClick={confirmSubmit}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3 font-bold text-white disabled:opacity-50"
              >
                {loading ? "جاري..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
