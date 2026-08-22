"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import { useTheme } from "../components/ThemeProvider";
import { KeyRound, Copy, Check, RefreshCw, Ban, Plus, ArrowLeft, Terminal, Wallet, Activity, GraduationCap, Server, ShieldAlert, Rocket, Eye, EyeOff } from "lucide-react";

interface ApiPolicy {
  mode: "classic" | "custom";
  allowCatalog: boolean;
  allowBalance: boolean;
  allowOrderStatus: boolean;
  allowOrderCreate: boolean;
  allowOrderCancel: boolean;
  customRateLimit: number;
  hiddenServices: string[];
}

interface ApiKey {
  id: number;
  api_key: string;
  name: string;
  requests_count: number;
  last_used_at: string | null;
  is_active: number;
  created_at: string;
  policy: ApiPolicy;
}

interface PublicService {
  id: string;
  name: string;
  category: string;
  type: string;
}

/** صندوق كود ذهبي مع زر نسخ — يعرض الروابط بشكل مرتب داخل حدود واضحة */
function CodeBox({ title, code, compact = false }: { title: string; code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-2xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2a1f0a] to-[#1a1205] p-3 shadow-[inset_0_0_30px_-18px_rgba(255,215,0,0.25)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black tracking-wide text-[var(--color-gold-pale)]">{title}</span>
        <button
          onClick={copy}
          className="flex h-6 items-center gap-1 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-2 text-[10px] font-black text-[var(--color-gold-bright)]"
        >
          {copied ? <Check size={10} strokeWidth={4} /> : <Copy size={10} />}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg bg-black/60 px-3 py-2">
        <code dir="ltr" className={`block whitespace-nowrap font-mono text-[11px] leading-relaxed text-green-400 ${compact ? "" : "py-1"}`}>
          {code}
        </code>
      </div>
    </div>
  );
}

/** زر رجوع أنيق صغير بحد ذهبي لامع */
function BackButton() {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const sameOrigin = referrer.startsWith(window.location.origin);
      const referrerPath = sameOrigin ? new URL(referrer).pathname : "";
      if (sameOrigin && referrerPath && referrerPath !== "/login" && referrerPath !== "/register") {
        router.back();
        return;
      }
    }
    router.push("/dashboard");
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="group flex items-center gap-1.5 rounded-full border border-[var(--color-gold)]/40 bg-gradient-to-r from-[#2a1f0a] to-[#1a1205] px-3 py-1.5 text-[11px] font-black text-[var(--color-gold-bright)] shadow-[0_0_12px_-6px_rgba(255,215,0,0.4)] transition hover:border-[var(--color-gold)] hover:shadow-[0_0_16px_-4px_rgba(255,215,0,0.6)]"
    >
      <ArrowLeft size={13} className="transition group-hover:-translate-x-0.5 rtl:rotate-180" />
      رجوع
    </button>
  );
}

export default function ApiAccessPage() {
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [balance, setBalance] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState("/api/v2");
  const [revealedKey, setRevealedKey] = useState<{ id: number; value: string } | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  const refresh = useCallback(async () => {
    setMessage(null);
    const [keyResult, userResult] = await Promise.allSettled([
      fetch("/api/api-access", { cache: "no-store" }),
      fetch("/api/user", { cache: "no-store" }),
    ]);

    if (keyResult.status === "fulfilled") {
      try {
        const data = await keyResult.value.json();
        if (data.keys) setKeys(data.keys);
        if (data.apiBaseUrl) setApiBaseUrl(String(data.apiBaseUrl));
        if (data.error) setMessage(String(data.error));
      } catch {
        setMessage("تعذر قراءة مفاتيح API. اضغط إعادة المحاولة.");
      }
    } else {
      setMessage("تعذر تحميل مفتاح API مؤقتًا. اضغط إعادة المحاولة.");
    }

    if (userResult.status === "fulfilled") {
      try {
        const userData = await userResult.value.json();
        setBalance(Number(userData.user?.balance || 0));
      } catch {
        // الرصيد ثانوي ولا يمنع عرض عنوان API والمفتاح.
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const copy = async (value: string, id: number) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const create = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/api-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "مفتاحي الرئيسي" }),
      });
      const data = await res.json();
      if (data.apiBaseUrl) setApiBaseUrl(String(data.apiBaseUrl));
      if (data.error) setMessage(String(data.error));
      else {
        if (data.apiKey && data.keyId) setRevealedKey({ id: Number(data.keyId), value: String(data.apiKey) });
        setMessage("تم إنشاء المفتاح. احفظه الآن لأنه لن يظهر كاملًا مرة أخرى");
        await refresh();
      }
    } catch {
      setMessage("تعذر إنشاء المفتاح الآن. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const act = async (id: number, action: "revoke" | "regenerate") => {
    setMessage(null);
    try {
      const res = await fetch("/api/api-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (data.apiBaseUrl) setApiBaseUrl(String(data.apiBaseUrl));
      if (data.error) setMessage(String(data.error));
      else {
        if (action === "regenerate" && data.apiKey) setRevealedKey({ id, value: String(data.apiKey) });
        if (action === "revoke" && revealedKey?.id === id) setRevealedKey(null);
        setMessage(action === "revoke" ? "تم إلغاء المفتاح" : "تم تجديد المفتاح. احفظه الآن لأنه لن يظهر كاملًا مرة أخرى");
        await refresh();
      }
    } catch {
      setMessage("تعذر تنفيذ العملية الآن. حاول مرة أخرى.");
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetch("/api/api-access?resource=catalog", { cache: "no-store" });
      const data = await res.json();
      if (data.services) setServices(data.services as PublicService[]);
      else setMessage(String(data.error || "تعذر تحميل كتالوج الخدمات"));
    } catch {
      setMessage("تعذر تحميل كتالوج الخدمات الآن. حاول مرة أخرى.");
    }
  };

  const savePolicy = async (key: ApiKey, patch: Partial<ApiPolicy>) => {
    setSavingSettings(true);
    setMessage(null);
    const policy = { ...key.policy, ...patch };
    try {
      const res = await fetch("/api/api-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key.id, action: "settings", ...policy }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(String(data.error));
      } else {
        setKeys((current) => current.map((item) => item.id === key.id ? { ...item, policy: data.policy as ApiPolicy } : item));
        setMessage("تم حفظ إعدادات المفتاح فورًا");
      }
    } catch {
      setMessage("تعذر حفظ الإعدادات الآن. حاول مرة أخرى.");
    } finally {
      setSavingSettings(false);
    }
  };

  const resetPolicy = async (key: ApiKey) => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/api-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key.id, action: "reset-settings" }),
      });
      const data = await res.json();
      if (data.error) setMessage(String(data.error));
      else {
        setKeys((current) => current.map((item) => item.id === key.id ? { ...item, policy: data.policy as ApiPolicy } : item));
        setMessage("عادت إعدادات المفتاح إلى الوضع الكلاسيكي");
      }
    } catch {
      setMessage("تعذر إعادة الإعدادات الآن. حاول مرة أخرى.");
    } finally {
      setSavingSettings(false);
    }
  };

  const activeKey = keys.find((k) => Number(k.is_active));
  const API_URL = apiBaseUrl;
  const activeRawKey = activeKey && revealedKey?.id === activeKey.id ? revealedKey.value : null;
  const authHeader = activeRawKey ? `Authorization: Bearer ${activeRawKey}` : "Authorization: Bearer YOUR_API_KEY";

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24">
        {/* رأس الصفحة مع زر رجوع أنيق */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-luxe shadow-[0_0_28px_-6px_rgba(255,215,0,0.55)]">
              <KeyRound size={24} className="text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-white">بوابة API</h1>
              <p className="truncate text-xs text-zinc-500">اربط موقعك أو بوتك بالمنصة واطلب من محفظتك تلقائيًا</p>
            </div>
          </div>
          <BackButton />
        </div>

        <div className="rounded-2xl border border-[var(--color-gold)]/30 bg-gradient-to-r from-[#2a1f0a] to-[#1a1205] p-4 shadow-[inset_0_0_24px_-16px_rgba(255,215,0,0.35)]">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
            <Server size={16} className="text-[var(--color-gold-bright)]" /> عنوان ربط الخادم الخاص بك
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">استخدم هذا العنوان في السيرفر الخلفي لموقعك أو بوتك. لا تضع مفتاحك داخل كود المتصفح.</p>
          <CodeBox title="رابط API v2 — الخدمات والطلبات" code={API_URL} />
          <div className="mt-2 rounded-xl border border-[var(--color-gold)]/15 bg-black/30 px-3 py-2 text-[10px] text-zinc-400">
            المصادقة: <code dir="ltr" className="font-mono text-green-400">{authHeader}</code>
          </div>
        </div>

        {/* ما هو API الخاص بي؟ — شرح مفصّل لوظيفة الـ API */}
        <div className="rounded-3xl border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#33260c] via-[#241a08] to-[#171004] p-5 shadow-[0_0_40px_-16px_rgba(255,215,0,0.35),inset_0_1px_0_rgba(255,215,0,0.15)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <GraduationCap size={16} className="text-[var(--color-gold-bright)]" /> ما هو الـ API الخاص بك؟
          </div>
          <p className="text-[11px] leading-[1.7] text-zinc-300">
            الـ <span className="font-black text-[var(--color-gold-bright)]">API</span> هو بوابة تربط موقعك أو بوتك الخاص بمنصة
            <span className="font-black text-white"> {brandName}</span> مباشرة. وظيفته أن تمنحك التحكم الكامل من داخل منصتك أنت:
            استدعاء جميع خدمات {brandName} بشكل كامل وفوري، وأي تحديث جديد على الخدمات أو الأسعار يصلك فورًا تلقائيًا عبر الـ API دون الحاجة لتحديث يدوي،
            بالإضافة إلى إنشاء وتنفيذ الطلبات (متابعين، مشاهدات، إعجابات وغير ذلك) بطلب برمجي واحد فقط.
          </p>
          {/* خطوات من إنشاء الحساب حتى الاستخدام */}
          <div className="mt-3 space-y-2">
            {[
              { icon: Rocket, title: "أنشئ حسابك", text: `أنشئ حسابًا داخل المنصة وسجل دخولك إلى لوحة خدمات ${brandName}` },
              { icon: KeyRound, title: "ادخل إلى قسم الـ API", text: "افتح هذا القسم — ستجد عنوان ربط الخادم ومفتاحك العشوائي الطويل ظاهرين لك هنا" },
              { icon: Terminal, title: "انسخ المفتاح واربطه", text: "انسخ المفتاح واستخدمه في موقعك أو بوتك لاستدعاء الخدمات وتنفيذ الطلبات" },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-2xl border border-[var(--color-gold)]/15 bg-[#241a08]/70 p-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]">
                  <s.icon size={12} />
                </div>
                <div>
                  <div className="text-[11px] font-black text-white">{i + 1}. {s.title}</div>
                  <div className="text-[10px] leading-relaxed text-zinc-400">{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* بطاقة المفتاح — تصميم ذهبي لامع بدل الزجاجي */}
        <div className="rounded-3xl border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#33260c] via-[#241a08] to-[#171004] p-5 shadow-[0_0_40px_-16px_rgba(255,215,0,0.35),inset_0_1px_0_rgba(255,215,0,0.15)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-black text-white">
              <KeyRound size={16} className="shrink-0 text-[var(--color-gold-bright)]" /> مفتاحك الخاص
            </div>
            {activeKey ? (
              <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-[10px] font-black text-green-400">
                <Check size={10} strokeWidth={4} className="inline ml-1" /> نشط
              </span>
            ) : (
              <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-black text-red-400">لا يوجد مفتاح</span>
            )}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">يمكنك تغيير المفتاح أو إلغاؤه متى شئت دون حدّ منخفض لعمليات التدوير؛ يبقى آخر مفتاح فعّالًا فقط.</p>

          {activeKey ? (
            <>
              {/* صندوق المفتاح مع زر نسخ مدمج */}
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--color-gold)]/30 bg-gradient-to-r from-black/70 to-[#1a1204] px-3 py-2.5 shadow-[inset_0_0_24px_-16px_rgba(255,215,0,0.3)]">
                <Terminal size={14} className="shrink-0 text-[var(--color-gold-bright)]" />
                <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[11px] text-white">
                  {activeRawKey || activeKey.api_key}
                </code>
                <button
                  onClick={() => activeRawKey && copy(activeRawKey, activeKey.id)}
                  disabled={!activeRawKey}
                  className="shrink-0 rounded-lg border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-2.5 py-1.5 text-[10px] font-black text-[var(--color-gold-bright)] transition hover:bg-[var(--color-gold)]/20"
                >
                  {copiedId === activeKey.id ? (
                    <span className="flex items-center gap-1"><Check size={10} strokeWidth={4} /> تم</span>
                  ) : (
                    <span className="flex items-center gap-1"><Copy size={10} /> {activeRawKey ? "نسخ" : "يظهر مرة واحدة"}</span>
                  )}
                </button>
              </div>

              {/* إحصاءات */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#241a08]/80 p-3">
                  <div className="text-zinc-500">الاستخدامات</div>
                  <div className="mt-0.5 font-black text-white">
                    <Activity size={11} className="mb-0.5 inline text-[var(--color-gold)]" /> {activeKey.requests_count}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--color-gold)]/15 bg-[#241a08]/80 p-3">
                  <div className="text-zinc-500">رصيدك</div>
                  <div className="mt-0.5 font-black text-gradient-luxe">
                    <Wallet size={11} className="mb-0.5 inline" /> ${balance.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* أزرار طبيعية الحجم */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => act(activeKey.id, "regenerate")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-gold)]/40 bg-gradient-to-r from-[#3a2d0d] to-[#2a2008] py-2.5 text-[11px] font-black text-[var(--color-gold-bright)] transition hover:shadow-[0_0_18px_-6px_rgba(255,215,0,0.5)]"
                  title="يتم تعطيل المفتاح السابق فورًا وتفعيل المفتاح الجديد فقط"
                >
                  <RefreshCw size={12} /> تغيير المفتاح
                </button>
                <button
                  onClick={() => act(activeKey.id, "revoke")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-400/40 bg-gradient-to-r from-[#3a0f0f] to-[#2a0a0a] py-2.5 text-[11px] font-black text-red-400 transition hover:shadow-[0_0_18px_-6px_rgba(255,80,80,0.5)]"
                >
                  <Ban size={12} /> إلغاء المفتاح
                </button>
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-3 text-center">
              <p className="text-sm text-zinc-400">أنشئ مفتاحك الخاص لربط منصتك أو بوتك بالمنصة</p>
              <button onClick={create} disabled={loading} className="btn-gold w-full rounded-xl py-3 text-sm disabled:opacity-50">
                {loading ? "جاري..." : <><Plus size={14} className="inline ml-1" /> إنشاء مفتاح جديد</>}
              </button>
            </div>
          )}

          {message && (
            <div aria-live="polite" className="mt-3 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/10 p-3 text-xs font-bold text-[var(--color-gold-pale)]">{message}</div>
          )}

          {/* شرح الخصم من محفظتك */}
          <div className="mt-3 rounded-2xl border border-[var(--color-gold)]/20 bg-[#1a1204]/60 p-3 text-[11px] leading-relaxed text-zinc-400">
            <div className="mb-1.5 flex items-center gap-1.5 font-black text-[var(--color-gold-pale)]">
              <Wallet size={12} /> كيف يعمل الخصم من محفظتك؟
            </div>
            <p>
              كل عملية طلب تصل عبر مفتاحك — أو أي تحديث أو تغيير على خدمات {brandName} تستدعيه من هذا الـ API — يتم احتساب قيمتها وخصمها
              <span className="font-black text-white"> من رصيد محفظتك أنت داخل المنصة حصريًا</span>، تلقائيًا وفوريًا عند تنفيذ الطلب. لا علاقة لمحفظة الإدارة أو حسابات المستخدمين الآخرين بمفاتيحك.
              إن لم يكن في محفظتك رصيد كافٍ، سيظهر لك خطأ ويُرفض الطلب ولن يُخصم شيء.
            </p>
          </div>

          {/* تحذير أمان */}
          <div className="mt-3 rounded-2xl border border-red-400/35 bg-gradient-to-br from-[#3a0f0f]/80 to-[#1a0606]/80 p-3 text-[11px] leading-relaxed text-red-300/90 shadow-[0_0_20px_-10px_rgba(255,80,80,0.4)]">
            <div className="mb-1.5 flex items-center gap-1.5 font-black text-red-400">
              <ShieldAlert size={13} /> تحذير أمني مهم — لا تشارك مفتاحك أبدًا
            </div>
            <p>
              أي شخص يمتلك مفتاحك يستطيع تنفيذ طلبات على حسابك <span className="font-black">وسيتم خصم الرصيد من محفظتك أنت</span>. عند بناء موقعك أو بوتك الخاص،
              احفظ المفتاح في إعدادات السيرفر (Environment Variables) وأخفِه بعيدًا عن الكود الظاهر والمستعرض — لا تشاركه مع أي مستخدم ولا تنشره في أي مكان.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Eye size={12} className="text-red-400" />
              <span className="text-[10px]">مكشوف أمام الغير = خسارة رصيدك</span>
              <EyeOff size={12} className="mr-auto text-red-400" />
              <span className="text-[10px]">مخفي على سيرفرك = آمن تمامًا</span>
            </div>
          </div>
        </div>

        {activeKey && (
          <div className="rounded-3xl border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#33260c] via-[#241a08] to-[#171004] p-5 shadow-[0_0_40px_-16px_rgba(255,215,0,0.35),inset_0_1px_0_rgba(255,215,0,0.15)]">
            <div className="mb-1 flex items-center gap-2 text-sm font-black text-white">
              <ShieldAlert size={16} className="text-[var(--color-gold-bright)]" /> إعدادات التحكم بمفتاح API
            </div>
            <p className="mb-4 text-[11px] leading-relaxed text-zinc-400">اختر الإعدادات الكلاسيكية أو خصّص ما يستطيع هذا المفتاح الوصول إليه. التغيير يخص هذا المفتاح فقط ولا يغيّر محفظتك أو مفاتيحك الأخرى.</p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => resetPolicy(activeKey)}
                disabled={savingSettings || activeKey.policy.mode === "classic"}
                className={`rounded-xl border px-3 py-2.5 text-[11px] font-black transition ${activeKey.policy.mode === "classic" ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]" : "border-white/10 bg-black/20 text-zinc-400 hover:border-[var(--color-gold)]/40"}`}
              >
                كلاسيكي — كل الصلاحيات
              </button>
              <button
                type="button"
                onClick={() => savePolicy(activeKey, { mode: "custom" })}
                disabled={savingSettings}
                className={`rounded-xl border px-3 py-2.5 text-[11px] font-black transition ${activeKey.policy.mode === "custom" ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]" : "border-white/10 bg-black/20 text-zinc-400 hover:border-[var(--color-gold)]/40"}`}
              >
                مخصص — تحكم دقيق
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([
                ["allowCatalog", "قراءة كتالوج الخدمات", "عرض الخدمات العامة والأسعار"],
                ["allowBalance", "قراءة الرصيد", "قراءة رصيد محفظتك فقط"],
                ["allowOrderStatus", "متابعة الطلبات", "قراءة حالة طلبات هذا المفتاح"],
                ["allowOrderCreate", "إنشاء الطلبات", "إرسال طلب جديد والخصم من محفظتك"],
                ["allowOrderCancel", "إلغاء الطلبات", "طلب إلغاء الطلب حسب حالته"],
              ] as const).map(([field, label, description]) => (
                <label key={field} className="flex cursor-pointer items-start gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <input
                    type="checkbox"
                    checked={activeKey.policy[field]}
                    disabled={savingSettings}
                    onChange={(event) => savePolicy(activeKey, { [field]: event.target.checked } as Partial<ApiPolicy>)}
                    className="mt-0.5 h-4 w-4 accent-[#f4c95d]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-black text-white">{label}</span>
                    <span className="mt-0.5 block text-[10px] text-zinc-500">{description}</span>
                  </span>
                </label>
              ))}
            </div>

            <label className="mt-3 block rounded-2xl border border-white/10 bg-black/20 p-3">
              <span className="flex items-center justify-between gap-2 text-[11px] font-black text-white">
                <span>حد الطلبات في الدقيقة</span>
                <span className="text-[var(--color-gold-bright)]">{activeKey.policy.customRateLimit}</span>
              </span>
              <input
                type="range"
                min={10}
                max={5000}
                step={10}
                value={activeKey.policy.customRateLimit}
                disabled={savingSettings}
                onChange={(event) => savePolicy(activeKey, { customRateLimit: Number(event.target.value), mode: "custom" })}
                className="mt-2 w-full accent-[#f4c95d]"
              />
              <span className="mt-1 block text-[10px] text-zinc-500">يُطبّق على هذا المفتاح فقط، والحد الافتراضي الآمن 120 طلبًا في الدقيقة.</span>
            </label>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-black text-white">إخفاء خدمات من كتالوج هذا المفتاح</div>
                  <div className="mt-0.5 text-[10px] text-zinc-500">الخدمات المخفية لن تظهر ولن يمكن طلبها بهذا المفتاح، دون كشف مصدرها.</div>
                </div>
                <button type="button" onClick={() => void loadServices()} className="shrink-0 rounded-xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-2 text-[10px] font-black text-[var(--color-gold-bright)]">تحميل الكتالوج</button>
              </div>
              {services.length > 0 && (
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/10 p-2">
                  {services.map((service) => {
                    const hidden = activeKey.policy.hiddenServices.includes(service.id);
                    return (
                      <label key={service.id} className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.03] p-2">
                        <input
                          type="checkbox"
                          checked={hidden}
                          disabled={savingSettings}
                          onChange={(event) => {
                            const hiddenServices = event.target.checked
                              ? [...activeKey.policy.hiddenServices, service.id]
                              : activeKey.policy.hiddenServices.filter((id) => id !== service.id);
                            void savePolicy(activeKey, { hiddenServices, mode: "custom" });
                          }}
                          className="h-4 w-4 accent-[#f4c95d]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[10px] font-bold text-zinc-200">{service.name}</span>
                          <span dir="ltr" className="block truncate font-mono text-[9px] text-zinc-600">{service.id}</span>
                        </span>
                        <span className="text-[9px] text-zinc-500">{hidden ? "مخفية" : "ظاهرة"}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* دليل الاستخدام — صناديق كود منظمة بدل النصوص المكسورة */}
        {activeKey && (
          <div className="rounded-3xl border border-[var(--color-gold)]/30 bg-gradient-to-br from-[#33260c] via-[#241a08] to-[#171004] p-5 shadow-[0_0_40px_-16px_rgba(255,215,0,0.35),inset_0_1px_0_rgba(255,215,0,0.15)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
              <GraduationCap size={16} className="text-[var(--color-gold-bright)]" /> دليل الاستخدام — ربط الـ API بموقعك أو بوتك
            </div>
            <div className="space-y-2 text-[11px]">
              <CodeBox
                title={`1. رابط البوابة (POST)`}
                code={`POST ${API_URL}`}
              />
              <CodeBox
                title={`2. جلب الخدمات المتاحة (GET)`}
                code={`GET ${API_URL}`}
                compact
              />
              <CodeBox
                title="3. ترويسة المصادقة"
                code={authHeader}
              />
              <CodeBox
                title="4. إرسال طلب — جسم JSON"
                code={`{"service": "svc_0123456789abcdef0123", "link": "https://instagram.com/user", "quantity": 1000, "idempotency_key": "order_20260821_abc123"}`}
              />
              <CodeBox
                title="5. إعادة الإرسال الآمنة — ترويسة اختيارية"
                code={`Idempotency-Key: order_20260821_abc123\nAuthorization: Bearer ${activeRawKey ?? "YOUR_API_KEY"}`}
                compact
              />
              <p className="text-zinc-500">
                استخدم <span className="font-bold text-zinc-300">svc_&lt;public_id&gt;</span> كما يظهر في كتالوج الخدمات. هذا المعرّف موحّد ولا يكشف مصدر الخدمة أو أي مزود داخلي.
                يمكنك قراءة الرصيد عبر <span className="font-bold text-zinc-300">GET ?action=balance</span>، وقراءة حالة طلبك عبر <span className="font-bold text-zinc-300">GET ?order=&lt;id&gt;</span>، وتبقى الصلاحيات قابلة للتخصيص من لوحة الإعدادات أدناه. احتفظ بمفتاح idempotency نفسه عند إعادة إرسال الطلب بعد مهلة أو خطأ شبكي؛ سيعيد API الطلب المحلي نفسه ولن يخصم الرصيد أو يرسل طلبًا مكررًا.
                الأسعار تخصم من رصيد محفظتك مباشرة حسب عرض المنصة، وكل طلب يصل عبر هذا المفتاح يسجل في قائمة طلباتك.
                عند الضغط على &quot;تغيير المفتاح&quot; يتم تعطيل المفتاح السابق فورًا وتفعيل المفتاح الجديد فقط — أي طلب يصل بالمفتاح القديم لن يُنفذ بعد ذلك.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
