"use client";

import { Zap, ShieldCheck, BadgeDollarSign, HeadphonesIcon, RefreshCcw, LayoutDashboard } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const features = [
  {
    icon: Zap,
    title: "تنفيذ فوري",
    desc: "يبدأ تنفيذ طلبك في ثوانٍ من لحظة الدفع بدون انتظار.",
    bg: "#e3f2fd",
    color: "#1565c0",
  },
  {
    icon: ShieldCheck,
    title: "أمان تام",
    desc: "خدماتنا آمنة 100% ولا تنتهك سياسات المنصات.",
    bg: "#e8f5e9",
    color: "#2e7d32",
  },
  {
    icon: BadgeDollarSign,
    title: "أسعار منافسة",
    desc: "أقل الأسعار في السوق مع ضمان الجودة العالية.",
    bg: "#fff3e0",
    color: "#ef6c00",
  },
  {
    icon: HeadphonesIcon,
    title: "دعم 24/7",
    desc: "فريق دعم متخصص على مدار الساعة لمساعدتك.",
    bg: "#f3e5f5",
    color: "#7b1fa2",
  },
  {
    icon: RefreshCcw,
    title: "ضمان استرداد",
    desc: "إذا لم تكتمل الخدمة نسترد رصيدك فوراً.",
    bg: "#fce4ec",
    color: "#c2185b",
  },
  {
    icon: LayoutDashboard,
    title: "واجهة ذكية",
    desc: "تابع جميع طلباتك ومعاملاتك من مكان واحد.",
    bg: "#e0f7fa",
    color: "#00838f",
  },
];

export default function Features() {
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  return (
    <section id="features" className="px-5 py-20 lg:py-[80px]">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-[clamp(1.7rem,3vw,2.4rem)] font-black text-[#0a2463]">
            لماذا تختار {brandName}؟
          </h2>
          <p className="mx-auto max-w-[500px] text-base text-[#6b7280]">
            نوفر لك كل ما تحتاجه لتنمية حسابك بأمان وسرعة
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="rounded-[20px] border border-[#e8edf5] bg-white p-6 text-center shadow-[0_4px_20px_rgba(21,101,192,0.08)] transition-all hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(21,101,192,0.16)]"
            >
              <div
                className="mx-auto mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-[18px] text-2xl"
                style={{ backgroundColor: feature.bg, color: feature.color }}
              >
                <feature.icon size={28} />
              </div>
              <h3 className="mb-2 text-base font-extrabold text-[#0a2463]">{feature.title}</h3>
              <p className="text-sm leading-[1.65] text-[#6b7280]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
