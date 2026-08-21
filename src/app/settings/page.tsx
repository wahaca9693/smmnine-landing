"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  Globe2,
  KeyRound,
  Languages,
  LayoutPanelTop,
  ListChecks,
  Loader2,
  RefreshCw,
  Save,
  UserRound,
  WalletCards,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { useLanguage, type Locale } from "../components/LanguageProvider";
import { useTheme } from "../components/ThemeProvider";

type Preferences = {
  email_notifications: boolean;
  order_status_notifications: boolean;
  auto_refresh_orders: boolean;
  refresh_interval_seconds: number;
  compact_mode: boolean;
};

const defaults: Preferences = {
  email_notifications: true,
  order_status_notifications: true,
  auto_refresh_orders: true,
  refresh_interval_seconds: 30,
  compact_mode: false,
};

const cards = [
  { key: "profile", href: "/profile", icon: UserRound, title: "settings.profileCard", description: "settings.profileCardDesc" },
  { key: "language", href: "/settings/language", icon: Languages, title: "settings.languageCard", description: "settings.languageCardDesc" },
  { key: "services", href: "/services", icon: Globe2, title: "settings.servicesCard", description: "settings.servicesCardDesc" },
  { key: "orders", href: "/orders", icon: ListChecks, title: "settings.ordersCard", description: "settings.ordersCardDesc" },
  { key: "api", href: "/api-access", icon: KeyRound, title: "settings.apiCard", description: "settings.apiCardDesc" },
  { key: "transactions", href: "/transactions", icon: WalletCards, title: "settings.transactionsCard", description: "settings.transactionsCardDesc" },
] as const;

const preferenceLabels: Record<Locale, {
  title: string;
  subtitle: string;
  email: string;
  emailDesc: string;
  orderStatus: string;
  orderStatusDesc: string;
  autoRefresh: string;
  autoRefreshDesc: string;
  interval: string;
  compact: string;
  compactDesc: string;
  save: string;
  saving: string;
  saved: string;
  error: string;
}> = {
  ar: {
    title: "تفضيلات الحساب المتقدمة",
    subtitle: "تحكم في إشعاراتك وطريقة تحديث الطلبات وواجهة الحساب.",
    email: "إشعارات الحساب",
    emailDesc: "استقبل تنبيهات الحساب المهمة عند توفرها.",
    orderStatus: "تحديثات حالة الطلبات",
    orderStatusDesc: "اعرض تنبيهات تغيّر حالة طلباتك وتقدمها.",
    autoRefresh: "التحديث التلقائي للطلبات",
    autoRefreshDesc: "اجلب آخر حالة من المزود تلقائيًا أثناء متابعة الطلب.",
    interval: "فترة التحديث بالثواني",
    compact: "الوضع المدمج",
    compactDesc: "استخدم بطاقات ومسافات أصغر لعرض معلومات أكثر على الهاتف.",
    save: "حفظ التفضيلات",
    saving: "جارٍ الحفظ...",
    saved: "تم حفظ التفضيلات بنجاح",
    error: "تعذر حفظ التفضيلات. حاول مرة أخرى.",
  },
  en: {
    title: "Advanced account preferences",
    subtitle: "Control notifications, order refresh behavior, and account layout.",
    email: "Account notifications",
    emailDesc: "Receive important account alerts when they become available.",
    orderStatus: "Order status updates",
    orderStatusDesc: "Show notifications when your orders change status or progress.",
    autoRefresh: "Automatic order refresh",
    autoRefreshDesc: "Fetch the latest provider status automatically while tracking an order.",
    interval: "Refresh interval in seconds",
    compact: "Compact mode",
    compactDesc: "Use smaller cards and spacing to show more information on mobile.",
    save: "Save preferences",
    saving: "Saving...",
    saved: "Preferences saved successfully",
    error: "Could not save preferences. Please try again.",
  },
  ru: {
    title: "Расширенные настройки аккаунта",
    subtitle: "Управляйте уведомлениями, обновлением заказов и видом аккаунта.",
    email: "Уведомления аккаунта",
    emailDesc: "Получайте важные уведомления аккаунта.",
    orderStatus: "Обновления статуса заказов",
    orderStatusDesc: "Получайте уведомления об изменении статуса и прогресса заказов.",
    autoRefresh: "Автообновление заказов",
    autoRefreshDesc: "Автоматически получайте последний статус поставщика при отслеживании.",
    interval: "Интервал обновления в секундах",
    compact: "Компактный режим",
    compactDesc: "Используйте меньшие карточки для телефона.",
    save: "Сохранить настройки",
    saving: "Сохранение...",
    saved: "Настройки успешно сохранены",
    error: "Не удалось сохранить настройки. Попробуйте снова.",
  },
  zh: {
    title: "高级账户偏好设置",
    subtitle: "管理通知、订单刷新方式和账户布局。",
    email: "账户通知",
    emailDesc: "接收重要的账户提醒。",
    orderStatus: "订单状态更新",
    orderStatusDesc: "订单状态或进度变化时显示通知。",
    autoRefresh: "自动刷新订单",
    autoRefreshDesc: "跟踪订单时自动获取服务商的最新状态。",
    interval: "刷新间隔（秒）",
    compact: "紧凑模式",
    compactDesc: "使用更小的卡片和间距，方便手机查看更多信息。",
    save: "保存偏好设置",
    saving: "保存中...",
    saved: "偏好设置已成功保存",
    error: "无法保存偏好设置，请重试。",
  },
  hi: {
    title: "उन्नत खाता प्राथमिकताएँ",
    subtitle: "सूचनाओं, ऑर्डर रिफ्रेश और खाते के लेआउट को नियंत्रित करें।",
    email: "खाता सूचनाएँ",
    emailDesc: "महत्वपूर्ण खाता सूचनाएँ प्राप्त करें।",
    orderStatus: "ऑर्डर स्थिति अपडेट",
    orderStatusDesc: "ऑर्डर की स्थिति या प्रगति बदलने पर सूचनाएँ दिखाएँ।",
    autoRefresh: "ऑर्डर ऑटो रिफ्रेश",
    autoRefreshDesc: "ऑर्डर ट्रैक करते समय प्रदाता की नवीनतम स्थिति अपने आप लाएँ।",
    interval: "रिफ्रेश अंतराल सेकंड में",
    compact: "कॉम्पैक्ट मोड",
    compactDesc: "मोबाइल पर अधिक जानकारी दिखाने के लिए छोटे कार्ड इस्तेमाल करें।",
    save: "प्राथमिकताएँ सेव करें",
    saving: "सेव हो रहा है...",
    saved: "प्राथमिकताएँ सफलतापूर्वक सेव हो गईं",
    error: "प्राथमिकताएँ सेव नहीं हो सकीं। फिर प्रयास करें।",
  },
};

export default function SettingsPage() {
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  const { t, locale } = useLanguage();
  const labels = useMemo(() => preferenceLabels[locale], [locale]);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/user/preferences", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("preferences_load_failed");
        const data = await response.json();
        if (active && data.preferences) setPreferences({ ...defaults, ...data.preferences });
      })
      .catch(() => {
        if (active) setFeedback("error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function savePreferences() {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) throw new Error("preferences_save_failed");
      const data = await response.json();
      setPreferences({ ...defaults, ...data.preferences });
      setFeedback("saved");
    } catch {
      setFeedback("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-0 pb-8" dir="inherit">
        <section className="relative overflow-hidden rounded-[2rem] border border-amber-400/30 bg-[#211507] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-yellow-600/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-300/40 bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-700 text-[#2a1704] shadow-[0_8px_24px_rgba(245,158,11,0.22)]">
              <UserRound className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300/75">{brandName}</p>
              <h1 className="text-2xl font-black text-amber-50 sm:text-3xl">{t("settings.accountTitle")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-100/65">{t("settings.accountSubtitle")}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.key} href={card.href} className="group relative flex min-h-[154px] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-amber-300/20 bg-[#191108] p-5 transition hover:-translate-y-0.5 hover:border-amber-300/55 hover:bg-[#24170a]">
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl transition group-hover:bg-amber-400/20" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-amber-300/25 bg-amber-400/10 text-amber-300"><Icon className="h-5 w-5" /></div>
                  <ArrowLeft className="h-5 w-5 text-amber-300/45 transition group-hover:text-amber-200" />
                </div>
                <div className="relative mt-6"><h2 className="text-base font-extrabold text-amber-50">{t(card.title)}</h2><p className="mt-1 text-xs leading-6 text-amber-100/55">{t(card.description)}</p></div>
              </Link>
            );
          })}
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-amber-300/25 bg-[#191108] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.2)] sm:mt-6 sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-amber-300/15 pb-5">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-400/10 text-amber-300"><LayoutPanelTop className="h-5 w-5" /></div>
              <div><h2 className="text-lg font-black text-amber-50">{labels.title}</h2><p className="mt-1 text-xs leading-6 text-amber-100/55">{labels.subtitle}</p></div>
            </div>
            <RefreshCw className={`mt-1 h-5 w-5 shrink-0 text-amber-300/60 ${loading ? "animate-spin" : ""}`} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-amber-100/60"><Loader2 className="h-5 w-5 animate-spin" />{t("common.loading")}</div>
          ) : (
            <div className="mt-5 space-y-3">
              <PreferenceToggle label={labels.email} description={labels.emailDesc} checked={preferences.email_notifications} onChange={(value) => setPreferences((current) => ({ ...current, email_notifications: value }))} icon={<Bell className="h-5 w-5" />} />
              <PreferenceToggle label={labels.orderStatus} description={labels.orderStatusDesc} checked={preferences.order_status_notifications} onChange={(value) => setPreferences((current) => ({ ...current, order_status_notifications: value }))} icon={<ListChecks className="h-5 w-5" />} />
              <PreferenceToggle label={labels.autoRefresh} description={labels.autoRefreshDesc} checked={preferences.auto_refresh_orders} onChange={(value) => setPreferences((current) => ({ ...current, auto_refresh_orders: value }))} icon={<RefreshCw className="h-5 w-5" />} />
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-amber-50">{labels.interval}</p><p className="mt-1 text-xs text-amber-100/50">10–300</p></div><select value={preferences.refresh_interval_seconds} onChange={(event) => setPreferences((current) => ({ ...current, refresh_interval_seconds: Number(event.target.value) }))} className="rounded-xl border border-amber-300/25 bg-[#24170a] px-4 py-2 text-sm font-bold text-amber-100 outline-none focus:border-amber-300"><option value={10}>10</option><option value={30}>30</option><option value={60}>60</option><option value={120}>120</option><option value={300}>300</option></select></div>
              <PreferenceToggle label={labels.compact} description={labels.compactDesc} checked={preferences.compact_mode} onChange={(value) => setPreferences((current) => ({ ...current, compact_mode: value }))} icon={<LayoutPanelTop className="h-5 w-5" />} />
              <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center"><button type="button" onClick={savePreferences} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-600 px-5 text-sm font-black text-[#2a1704] shadow-[0_8px_20px_rgba(245,158,11,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? labels.saving : labels.save}</button>{feedback && <p className={`inline-flex items-center gap-2 text-sm ${feedback === "saved" ? "text-emerald-300" : "text-rose-300"}`}>{feedback === "saved" && <Check className="h-4 w-4" />}{feedback === "saved" ? labels.saved : labels.error}</p>}</div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function PreferenceToggle({ label, description, checked, onChange, icon }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; icon: React.ReactNode }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4 transition hover:border-amber-300/30"><span className="flex min-w-0 items-start gap-3"><span className="mt-0.5 shrink-0 text-amber-300/80">{icon}</span><span><span className="block text-sm font-bold text-amber-50">{label}</span><span className="mt-1 block text-xs leading-5 text-amber-100/50">{description}</span></span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-amber-400" /></label>;
}
