"use client";

import { useState } from "react";
import { Check, Languages, ShieldCheck, Sparkles } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { LOCALES, LOCALE_META, type Locale, useLanguage } from "../../components/LanguageProvider";
import { useTheme } from "../../components/ThemeProvider";

export default function LanguageSettingsPage() {
  const { locale, setLocale, t } = useLanguage();
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  const [saved, setSaved] = useState(false);

  const handleLocaleChange = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-0 pb-8" dir="inherit">
        <section className="relative overflow-hidden rounded-[2rem] border border-amber-400/30 bg-[#211507] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-yellow-600/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-300/40 bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-700 text-[#2a1704] shadow-[0_8px_24px_rgba(245,158,11,0.22)]">
              <Languages className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300/75">{brandName}</p>
              <h1 className="text-2xl font-black text-amber-50 sm:text-3xl">{t("language.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-100/65">{t("language.subtitle")}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] border border-amber-400/25 bg-[#191108] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.2)] sm:mt-6 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-amber-300/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-amber-50">{t("settings.languageTitle")}</h2>
                <p className="mt-1 text-sm leading-6 text-amber-100/60">{t("settings.languageDescription")}</p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/20 bg-[#2b1a08] px-3 py-2 text-xs font-bold text-amber-200">
              <span className="text-base">{LOCALE_META[locale].flag}</span>
              <span>{LOCALE_META[locale].nativeName}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOCALES.map((item) => {
              const meta = LOCALE_META[item];
              const active = locale === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleLocaleChange(item)}
                  aria-pressed={active}
                  className={`group relative flex min-h-[78px] items-center gap-3 rounded-2xl border px-4 py-3 text-start transition-all duration-200 ${
                    active
                      ? "border-amber-300 bg-gradient-to-br from-amber-500/25 to-yellow-800/25 shadow-[0_8px_24px_rgba(245,158,11,0.14)]"
                      : "border-amber-300/15 bg-[#24170a] hover:border-amber-300/45 hover:bg-[#2d1d0b]"
                  }`}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-[#160d05] text-2xl shadow-inner">{meta.flag}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-amber-50">{t(`language.${item}`)}</span>
                    <span className="mt-1 block text-xs font-semibold text-amber-200/55">{meta.nativeName}</span>
                  </span>
                  {active && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 text-[#241300]">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/5 px-4 py-3 text-sm leading-6 text-emerald-100/75">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <span>{saved ? t("settings.languageSaved") : t("settings.languageNote")}</span>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

