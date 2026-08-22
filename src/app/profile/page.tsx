"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Boxes, KeyRound, ListChecks, UserRound, WalletCards } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { useLanguage } from "../components/LanguageProvider";
import { useTheme } from "../components/ThemeProvider";

type UserData = {
  username: string;
  email?: string;
  balance: number;
  role: string;
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  const [user, setUser] = useState<UserData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [profileForm, setProfileForm] = useState({ username: "", email: "", currentPassword: "", securityCode: "" });

  useEffect(() => {
    let active = true;
    fetch("/api/user", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.user) {
          setUser(data.user);
          setProfileForm((current) => ({ ...current, username: data.user.username || "", email: data.user.email || "" }));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const roleLabel = user?.role === "admin" ? "Admin" : "User";

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setEditMessage("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; user?: { username: string; email: string | null }; requiresEmailVerification?: boolean };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ بيانات الحساب");
      if (user && data.user) setUser({ ...user, username: data.user.username, email: data.user.email || "" });
      setProfileForm((current) => ({ ...current, currentPassword: "", securityCode: "" }));
      setEditing(false);
      setEditMessage(data.requiresEmailVerification ? "تم حفظ البيانات. تحقق من البريد الجديد لإكمال التغيير." : "تم حفظ بيانات الحساب بنجاح.");
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-0 pb-8" dir="inherit">
        <section className="relative overflow-hidden rounded-[2rem] border border-amber-400/30 bg-[#211507] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-amber-300/45 bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-700 text-[#2a1704] shadow-[0_8px_24px_rgba(245,158,11,0.22)]">
              <UserRound className="h-8 w-8" strokeWidth={2.1} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300/75">{brandName}</p>
              <h1 className="truncate text-2xl font-black text-amber-50 sm:text-3xl">{t("profile.title")}</h1>
              <p className="mt-1 text-sm text-amber-100/65">{t("profile.subtitle")}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-4">
          {[
            ["profile.username", user?.username || "—"],
            ["profile.email", user?.email || "—"],
            ["profile.role", roleLabel],
            ["profile.balance", `$ ${Number(user?.balance || 0).toFixed(4)}`],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-2xl border border-amber-300/20 bg-[#191108] p-4">
              <p className="text-xs font-semibold text-amber-100/50">{t(label)}</p>
              <p className="mt-2 truncate text-sm font-black text-amber-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-[2rem] border border-amber-400/25 bg-[#191108] p-4 sm:mt-6 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-amber-50">بيانات الحساب</h2>
              <p className="mt-1 text-xs leading-6 text-amber-100/55">يمكنك تعديل اسم المستخدم أو البريد. نطلب كلمة المرور ورمز الأمان عند تفعيل 2FA.</p>
            </div>
            <button type="button" onClick={() => { setEditing((value) => !value); setEditMessage(""); }} className="shrink-0 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-200">{editing ? "إلغاء" : "تعديل"}</button>
          </div>
          {editing && <form onSubmit={saveProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input required value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} placeholder="اسم المستخدم" className="rounded-xl border border-amber-300/20 bg-[#24170a] px-3 py-3 text-sm text-white outline-none focus:border-amber-300/60" />
            <input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} placeholder="البريد الإلكتروني" className="rounded-xl border border-amber-300/20 bg-[#24170a] px-3 py-3 text-sm text-white outline-none focus:border-amber-300/60" />
            <input required type="password" value={profileForm.currentPassword} onChange={(event) => setProfileForm({ ...profileForm, currentPassword: event.target.value })} placeholder="كلمة المرور الحالية" className="rounded-xl border border-amber-300/20 bg-[#24170a] px-3 py-3 text-sm text-white outline-none focus:border-amber-300/60" />
            <input inputMode="numeric" maxLength={6} value={profileForm.securityCode} onChange={(event) => setProfileForm({ ...profileForm, securityCode: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="رمز الأمان عند تفعيله" className="rounded-xl border border-amber-300/20 bg-[#24170a] px-3 py-3 text-sm tracking-[0.25em] text-white outline-none focus:border-amber-300/60" />
            <button disabled={saving} className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-3 text-sm font-black text-[#2a1704] disabled:opacity-60 sm:col-span-2">{saving ? "جارٍ الحفظ..." : "حفظ بيانات الحساب"}</button>
          </form>}
          {editMessage && <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100" aria-live="polite">{editMessage}</p>}
        </section>

        <section className="mt-5 rounded-[2rem] border border-amber-400/25 bg-[#191108] p-4 sm:mt-6 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-amber-50">{t("profile.availableTools")}</h2>
            <p className="mt-1 text-sm leading-6 text-amber-100/55">{t("profile.platformsDesc")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link href="/services" className="group flex items-center justify-between rounded-2xl border border-amber-300/20 bg-[#24170a] p-4 hover:border-amber-300/55">
              <span className="flex items-center gap-3"><Boxes className="h-5 w-5 text-amber-300" /><span className="text-sm font-bold text-amber-50">{t("profile.platforms")}</span></span>
              <ArrowLeft className="h-4 w-4 text-amber-300/60" />
            </Link>
            <Link href="/api-access" className="group flex items-center justify-between rounded-2xl border border-amber-300/20 bg-[#24170a] p-4 hover:border-amber-300/55">
              <span className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-amber-300" /><span className="text-sm font-bold text-amber-50">{t("settings.apiCard")}</span></span>
              <ArrowLeft className="h-4 w-4 text-amber-300/60" />
            </Link>
            <Link href="/orders" className="group flex items-center justify-between rounded-2xl border border-amber-300/20 bg-[#24170a] p-4 hover:border-amber-300/55">
              <span className="flex items-center gap-3"><ListChecks className="h-5 w-5 text-amber-300" /><span className="text-sm font-bold text-amber-50">{t("settings.ordersCard")}</span></span>
              <ArrowLeft className="h-4 w-4 text-amber-300/60" />
            </Link>
          </div>
        </section>

        <div className="mt-4 flex justify-end">
          <Link href="/deposit" className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-400/20">
            <WalletCards className="h-4 w-4" />
            {t("bottomNav.deposit")}
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
