"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import { useCountUp } from "../hooks/useCountUp";

const socialIcons = [
  { icon: "instagram", color: "#E4405F", top: "15%", right: "8%", delay: "0s", size: 36 },
  { icon: "tiktok", color: "#ffffff", top: "25%", left: "10%", delay: "2s", size: 32 },
  { icon: "youtube", color: "#FF0000", top: "55%", right: "5%", delay: "4s", size: 34 },
  { icon: "twitter", color: "#1DA1F2", top: "65%", left: "7%", delay: "1s", size: 30 },
  { icon: "facebook", color: "#1877F2", top: "40%", right: "12%", delay: "3s", size: 28 },
  { icon: "snapchat", color: "#FFFC00", top: "75%", right: "15%", delay: "5s", size: 30 },
];

const stats = [
  { value: "105K+", label: "مستخدم نشط" },
  { value: "2,500+", label: "خدمة متاحة" },
  { value: "14.8M+", label: "طلب مكتمل" },
  { value: "24/7", label: "دعم فني" },
];

function formatCount(count: number, suffix: string) {
  if (suffix === "24/7") return "24/7";
  if (Number.isInteger(count)) return `${Math.round(count)}${suffix}`;
  return `${count}${suffix}`;
}

function StatChip({ value, label }: { value: string; label: string }) {
  const { count, suffix, ref } = useCountUp(value, 2200);
  return (
    <div
      ref={ref}
      className="min-w-[130px] rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-md"
    >
      <div className="text-[1.8rem] font-black text-white">
        {value === "24/7" ? value : formatCount(count, suffix)}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-white/75">{label}</div>
    </div>
  );
}

function SocialIcon({
  color,
  top,
  right,
  left,
  delay,
  size,
  icon,
}: {
  color: string;
  top: string;
  right?: string;
  left?: string;
  delay: string;
  size: number;
  icon: string;
}) {
  const paths: Record<string, string> = {
    instagram:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    tiktok:
      "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    youtube:
      "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
    twitter:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    facebook:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    snapchat:
      "M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.42.42 0 01.17-.029c.111 0 .163.029.18.06.048.089.03.19-.094.307-.36.34-.939.717-1.549.723-.216.016-.427-.027-.63-.103-.133.123-.347.354-.612.564a.42.42 0 00-.096.047c.202.589.258 1.213.162 1.832l-.004.034c-.075.479-.213.891-.418 1.254-.19.337-.45.629-.772.868-.316.235-.67.415-1.054.535a3.94 3.94 0 01-.608.138c-.054.26-.147.55-.28.858a.42.42 0 01-.358.237c-.335.012-.63-.21-.819-.403a4.68 4.68 0 01-.566-.82c-.186.073-.385.132-.596.176a.42.42 0 01-.123.018c-.254 0-.49-.131-.638-.354a1.09 1.09 0 01-.153-.38c-.043-.18-.06-.365-.052-.55.005-.11.018-.22.038-.328a3.94 3.94 0 01-.597-.138 3.15 3.15 0 01-1.053-.535 2.57 2.57 0 01-.773-.868c-.204-.363-.343-.775-.418-1.254l-.004-.034c-.096-.619-.04-1.243.162-1.832a.42.42 0 00-.096-.047c-.265-.21-.479-.441-.612-.564-.203.076-.414.119-.63.103-.61-.006-1.189-.383-1.549-.723-.124-.117-.142-.218-.094-.307.017-.031.069-.06.18-.06a.42.42 0 01.17.029c.374.181.733.285 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.449 1.069 11.805.793 12.206.793z",
  };

  const animationDuration = 14 + (icon.charCodeAt(0) % 10);

  return (
    <div
      className="absolute rounded-2xl flex items-center justify-center text-white pointer-events-none"
      style={{
        top,
        right,
        left,
        width: size,
        height: size,
        backgroundColor: color,
        opacity: 0.14,
        animation: `floatIcon ${animationDuration}s linear infinite`,
        animationDelay: delay,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="white">
        <path d={paths[icon]} />
      </svg>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-br from-[#0a2463] via-[#1565c0] to-[#2196f3] px-5 pt-[90px] pb-[100px] text-center"
    >
      {/* Background circles */}
      <div className="absolute -top-[150px] -right-[100px] h-[500px] w-[500px] rounded-full bg-white/5" />
      <div className="absolute -bottom-[100px] -left-[80px] h-[350px] w-[350px] rounded-full bg-white/5" />
      <div className="absolute top-[40%] left-[10%] h-[200px] w-[200px] rounded-full bg-white/5" />

      {/* Floating icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {socialIcons.map((icon, idx) => (
          <SocialIcon key={idx} {...icon} />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-[800px]">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-5 py-1.5 text-sm font-bold text-white animate-fadeDown"
          style={{ animationDelay: "0s" }}
        >
          <Sparkles size={16} />
          منصة خدمات السوشيال ميديا الاحترافية
        </div>

        <h1
          className="mb-5 text-[clamp(2.2rem,5vw,3.8rem)] font-black leading-[1.15] text-white animate-fadeDown"
          style={{ animationDelay: "0.1s" }}
        >
          نمِّي حضورك على السوشيال ميديا{" "}
          <span className="bg-gradient-to-r from-[#90caf9] to-[#e3f2fd] bg-clip-text text-transparent">
            بسرعة وموثوقية
          </span>
        </h1>

        <p
          className="mx-auto mb-9 max-w-[580px] text-base leading-[1.75] text-white/85 animate-fadeDown"
          style={{ animationDelay: "0.18s" }}
        >
          أكبر منصة عربية لخدمات التواصل الاجتماعي — متابعين، مشاهدات، إعجابات وأكثر بأسعار
          تنافسية وتنفيذ فوري.
        </p>

        <div
          className="flex flex-wrap items-center justify-center gap-3.5 animate-fadeDown"
          style={{ animationDelay: "0.26s" }}
        >
          <a
            href="/login"
            className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-8 text-base font-extrabold text-[#1565c0] shadow-[0_8px_24px_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#e8f0fe] hover:shadow-[0_12px_32px_rgba(255,255,255,0.3)]"
          >
            ابدأ الآن مجاناً
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          </a>
          <a
            href="/login"
            className="inline-flex h-[52px] items-center justify-center rounded-full border-2 border-white/40 bg-white/10 px-8 text-base font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-white/20"
          >
            تسجيل الدخول
          </a>
        </div>

        <div
          className="mt-14 flex flex-wrap items-center justify-center gap-5 animate-fadeUp"
          style={{ animationDelay: "0.4s" }}
        >
          {stats.map((stat, idx) => (
            <StatChip key={idx} value={stat.value} label={stat.label} />
          ))}
        </div>
      </div>
    </section>
  );
}
