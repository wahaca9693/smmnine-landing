"use client";

const steps = [
  {
    number: "1",
    title: "إنشاء حساب",
    desc: "سجّل مجاناً في أقل من دقيقة بدون أي إجراءات معقدة.",
  },
  {
    number: "2",
    title: "شحن الرصيد",
    desc: "أضف رصيداً بطريقة الدفع المناسبة لك.",
  },
  {
    number: "3",
    title: "اختر الخدمة",
    desc: "تصفّح مئات الخدمات واختر ما يناسب حسابك.",
  },
  {
    number: "4",
    title: "استمتع بالنتائج",
    desc: "شاهد نمو حسابك بسرعة وموثوقية تامة.",
  },
];

export default function HowItWorks() {
  return (
    <section id="steps" className="bg-gradient-to-br from-[#f0f4ff] to-[#e8f0fe] px-5 py-20 lg:py-[80px]">
      <div className="mx-auto max-w-[950px]">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-[clamp(1.7rem,3vw,2.4rem)] font-black text-[#0a2463]">
            كيف تبدأ؟
          </h2>
          <p className="mx-auto max-w-[500px] text-base text-[#6b7280]">
            4 خطوات بسيطة وطلبك في الطريق
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="rounded-[20px] bg-white/70 p-7 text-center shadow-sm backdrop-blur-sm">
              <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-[#1565c0] to-[#2196f3] text-xl font-black text-white shadow-[0_6px_20px_rgba(21,101,192,0.3)]">
                {step.number}
              </div>
              <h4 className="mb-2 text-base font-extrabold text-[#0a2463]">{step.title}</h4>
              <p className="text-sm leading-[1.6] text-[#6b7280]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
