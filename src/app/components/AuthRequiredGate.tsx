"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, LockKeyhole, LogIn, Sparkles, UserPlus } from "lucide-react";
import BrandMark from "./BrandMark";
import { useLanguage } from "./LanguageProvider";
import { useTheme } from "./ThemeProvider";

const copy = {
  ar: {
    title: "هذه المساحة مخصصة للحسابات",
    description: "يمكنك تصفح الخدمات والأسعار بحرية. لإنشاء الطلبات أو فتح المحفظة أو استخدام إعدادات الحساب، سجّل الدخول أو أنشئ حسابًا مجانيًا.",
    login: "تسجيل الدخول",
    register: "إنشاء حساب مجاني",
    browse: "متابعة تصفح الخدمات",
    privateArea: "منطقة آمنة",
    privateAreaDesc: "نحافظ على رصيدك وبياناتك وإعدادات API داخل حسابك فقط.",
    fastAccess: "وصول سريع",
    fastAccessDesc: "بعد تسجيل الدخول ستعود تلقائيًا إلى الصفحة التي طلبتها.",
  },
  en: {
    title: "This area is for account holders",
    description: "You can browse services and prices freely. To create orders, open your wallet, or use account settings, log in or create a free account.",
    login: "Log in",
    register: "Create a free account",
    browse: "Continue browsing services",
    privateArea: "Secure area",
    privateAreaDesc: "Your balance, data, and API settings stay protected inside your account.",
    fastAccess: "Quick access",
    fastAccessDesc: "After signing in, you will return automatically to the page you requested.",
  },
  ru: {
    title: "Этот раздел доступен владельцам аккаунтов",
    description: "Вы можете свободно просматривать услуги и цены. Для заказов, кошелька и настроек аккаунта войдите или создайте бесплатный аккаунт.",
    login: "Войти",
    register: "Создать бесплатный аккаунт",
    browse: "Продолжить просмотр услуг",
    privateArea: "Защищённый раздел",
    privateAreaDesc: "Баланс, данные и настройки API защищены внутри вашего аккаунта.",
    fastAccess: "Быстрый доступ",
    fastAccessDesc: "После входа вы автоматически вернётесь к запрошенной странице.",
  },
  zh: {
    title: "此区域仅供账户用户使用",
    description: "您可以自由浏览服务和价格。要创建订单、打开钱包或使用账户设置，请登录或免费创建账户。",
    login: "登录",
    register: "免费创建账户",
    browse: "继续浏览服务",
    privateArea: "安全区域",
    privateAreaDesc: "您的余额、数据和 API 设置仅在账户内受到保护。",
    fastAccess: "快速访问",
    fastAccessDesc: "登录后，您将自动返回刚才请求的页面。",
  },
  hi: {
    title: "यह क्षेत्र खाताधारकों के लिए है",
    description: "आप सेवाओं और कीमतों को स्वतंत्र रूप से देख सकते हैं। ऑर्डर बनाने, वॉलेट खोलने या अकाउंट सेटिंग्स के लिए लॉगिन करें या मुफ़्त अकाउंट बनाएँ।",
    login: "लॉगिन",
    register: "मुफ़्त अकाउंट बनाएँ",
    browse: "सेवाएँ देखना जारी रखें",
    privateArea: "सुरक्षित क्षेत्र",
    privateAreaDesc: "आपका बैलेंस, डेटा और API सेटिंग्स आपके अकाउंट में सुरक्षित रहती हैं।",
    fastAccess: "त्वरित पहुँच",
    fastAccessDesc: "लॉगिन के बाद आप अपने अनुरोधित पेज पर वापस लौट जाएँगे।",
  },
} as const;

export default function AuthRequiredGate() {
  const { locale } = useLanguage();
  const { settings } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const text = copy[locale] || copy.en;
  const query = searchParams.toString();
  const nextPath = `${pathname || "/dashboard"}${query ? `?${query}` : ""}`;
  const encodedNext = encodeURIComponent(nextPath);
  const loginHref = `/login?next=${encodedNext}`;
  const registerHref = `/login?next=${encodedNext}#register`;
  const isRTL = locale === "ar";
  const brandName = settings.siteName?.trim() || "follower";

  return (
    <section dir={isRTL ? "rtl" : "ltr"} className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-xl items-center justify-center px-1 py-8">
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-[var(--color-gold)]/30 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_44%),linear-gradient(145deg,#2b1f0b,#171005_66%,#100d09)] p-6 shadow-[0_24px_90px_-28px_rgba(212,175,55,0.6)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--color-gold)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-amber-700/10 blur-3xl" />

        <div className="relative text-center">
          <div className="mx-auto mb-5 flex w-fit items-center justify-center rounded-3xl border border-[var(--color-gold)]/35 bg-black/25 p-3 shadow-[0_0_35px_-10px_rgba(212,175,55,0.8)]">
            <BrandMark size="lg" showName={false} imageClassName="!h-16 !w-16 rounded-2xl" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/25 bg-[var(--color-gold)]/10 px-3 py-1 text-[10px] font-black text-[var(--color-gold-bright)]">
            <LockKeyhole size={13} />
            {text.privateArea}
          </div>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">{text.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-300">{text.description}</p>
          <p className="mt-2 text-xs font-bold text-[var(--color-gold-pale)]">{brandName}</p>
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
          <Link href={loginHref} className="group flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)] px-4 py-3 text-sm font-black text-black shadow-[0_10px_28px_-12px_rgba(212,175,55,0.9)] transition hover:-translate-y-0.5 hover:brightness-110">
            <LogIn size={18} />
            {text.login}
          </Link>
          <Link href={registerHref} className="group flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--color-gold)]/45 bg-black/20 px-4 py-3 text-sm font-black text-[var(--color-gold-bright)] transition hover:-translate-y-0.5 hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)]/10">
            <UserPlus size={18} />
            {text.register}
          </Link>
        </div>

        <div className="relative mt-6 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-black text-white"><KeyRound size={14} className="text-[var(--color-gold)]" />{text.privateArea}</div>
            <p className="text-[10px] leading-5 text-zinc-500">{text.privateAreaDesc}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-black text-white"><Sparkles size={14} className="text-[var(--color-gold)]" />{text.fastAccess}</div>
            <p className="text-[10px] leading-5 text-zinc-500">{text.fastAccessDesc}</p>
          </div>
        </div>

        <Link href="/services" className="relative mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-black/20 px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-[var(--color-gold)]/50 hover:text-white">
          {isRTL ? <ArrowLeft size={14} /> : <ArrowLeft size={14} className="rotate-180" />}
          {text.browse}
        </Link>
      </div>
    </section>
  );
}
