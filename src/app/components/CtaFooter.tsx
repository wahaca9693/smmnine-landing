"use client";

import { ArrowLeft } from "lucide-react";

export default function CtaFooter() {
  return (
    <section id="cta" className="relative overflow-hidden bg-gradient-to-br from-[#0a2463] via-[#1565c0] to-[#2196f3] px-5 py-[70px] text-center hero-bg-pattern">
      <div className="relative z-10 mx-auto max-w-[800px]">
        <h2 className="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-black text-white">
          جاهز للنمو؟
        </h2>
        <p className="mb-8 text-base text-white/85">
          انضم لآلاف المستخدمين وابدأ رحلتك معنا اليوم
        </p>
        <a
          href="/login"
          className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-8 text-base font-extrabold text-[#1565c0] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#e8f0fe]"
        >
          إنشاء حساب مجاني
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        </a>
      </div>
    </section>
  );
}
