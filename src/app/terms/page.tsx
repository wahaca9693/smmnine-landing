"use client";

import Link from "next/link";
import { useTheme } from "../components/ThemeProvider";
import { Shield, AlertTriangle, CheckCircle, RefreshCw, XCircle } from "lucide-react";

export default function TermsPage() {
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-5 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Shield className="text-[var(--color-primary)]" size={32} />
          <h1 className="text-2xl font-black">شروط الاستخدام</h1>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <CheckCircle size={20} />
              القبول العام
            </h2>
            <p className="leading-relaxed text-zinc-400">
              باستخدامك لمنصة {brandName}، فإنك توافق على جميع الشروط والأحكام المذكورة هنا. يجب قراءة هذه الشروط بعناية قبل إنشاء أي طلب. المنصة مخصصة لتقديم خدمات تنمية الحضور الرقمي بشكل قانوني وآمن.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <AlertTriangle size={20} />
              مسؤولية المستخدم
            </h2>
            <ul className="list-inside list-disc space-y-2 text-zinc-400">
              <li>يجب أن يكون الحساب الذي تقدم عليه الخدمة خاصاً بك أو أن تملك إذناً صريحاً بإدارته.</li>
              <li>لا تستخدم المنصة لأي غرض مخالف للقانون أو ينتهك حقوق الآخرين.</li>
              <li>أنت المسؤول عن صحة الرابط أو اسم المستخدم المدخل في الطلب.</li>
              <li>لا يجب تقديم طلبات مكررة على نفس الرابط إلا بعد اكتمال الطلب السابق.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <RefreshCw size={20} />
              سياسة التعويض والاسترداد
            </h2>
            <p className="leading-relaxed text-zinc-400">
              التعويض يخضع لشروط كل خدمة على حدة. إذا واجهت مشكلة في الخدمة وكنت قد التزمت بجميع الشروط (رابط صحيح، حساب عام، عدم تغيير الرابط أثناء التنفيذ)، فسيتم مراجعة طلبك والتعويض المناسب. التعويض يكون عادةً بإعادة التنفيذ أو استرداد الرصيد حسب حالة الطلب لدى مزود الخدمة.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <XCircle size={20} />
              حالات لا يتم فيها التعويض
            </h2>
            <ul className="list-inside list-disc space-y-2 text-zinc-400">
              <li>تقديم رابط خاطئ أو حساب خاص.</li>
              <li>تغيير اسم المستخدم أو الرابط بعد إرسال الطلب.</li>
              <li>حذف المنشور أو تغيير إعدادات الخصوصية.</li>
              <li>عدم الالتزام بالحد الأدنى والحد الأقصى للكمية.</li>
              <li>انتهاك سياسات المنصة المستهدفة.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <CheckCircle size={20} />
              شروط الخدمات
            </h2>
            <p className="leading-relaxed text-zinc-400">
              كل خدمة لها وصف وشروطها الخاصة المعروضة قبل الطلب. يجب قراءة الوصف جيداً والتأكد من min و max والرابط المطلوب. بعض الخدمات تتطلب حساباً عاماً، وبعضها تتطلب رابط منشور محدد. أي طلب يُرسل بدون الالتزام بالشروط يكون على مسؤولية المستخدم.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[var(--color-primary)]">
              <RefreshCw size={20} />
              متابعة الطلب وإلغاؤه
            </h2>
            <ul className="list-inside list-disc space-y-2 text-zinc-400">
              <li>يمكن للمستخدم فتح زر «متابعة الطلب» لمشاهدة الحالة الحالية، والكمية المنفذة، والكمية المتبقية، وعدد البداية، والرابط، وآخر تحديث من مزود الخدمة.</li>
              <li>يُسمح بطلب الإلغاء فقط عندما تكون حالة الطلب معلقاً، أو قيد المراجعة، أو متوقفاً، أو متوقفاً مؤقتاً.</li>
              <li>إذا أصبحت الحالة «جاري التنفيذ» أو «قيد التنفيذ» أو «جزئي» أو «مكتمل»، فلن يظهر الإلغاء أو سيتم رفضه؛ لأن الطلب بدأ العمل لدى المزود.</li>
              <li>لا يُعاد رصيد الطلب بمجرد الضغط على زر الإلغاء. تتم إعادة الرصيد فقط بعد أن يؤكد الخادم الرسمي للمزود نجاح الإلغاء.</li>
              <li>إذا لم يرسل المزود تأكيداً صريحاً، يبقى الرصيد محفوظاً ولا تُعتبر العملية ملغاة، ويمكن التواصل مع الدعم عند الحاجة.</li>
              <li>عند نجاح الإلغاء وتأكيده، تُسجل العملية في الحساب ويُعاد مبلغ الطلب مرة واحدة فقط إلى محفظة المستخدم.</li>
            </ul>
          </section>
        </div>

        <Link
          href="/dashboard"
          className="mt-8 block w-full rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 text-center font-black text-white"
        >
          العودة إلى المنصة
        </Link>
      </div>
    </div>
  );
}
