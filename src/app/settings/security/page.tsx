"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import { Shield, KeyRound, Clock, UserCheck, AlertCircle, Save, CheckCircle2, Trash2, X } from "lucide-react";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [settings, setSettings] = useState({
    loginPreference: "both",
    is2faEnabled: false,
    twoFaFrequency: "always",
    hasSecurityCode: false,
    securityCode: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [deleteForm, setDeleteForm] = useState({
    password: "",
    securityCode: ""
  });

  // securityCodeForm is reserved for future manual code updates

  useEffect(() => {
    fetch("/api/user/security")
      .then(res => res.json())
      .then(data => {
        if (data.settings) setSettings({ ...data.settings, securityCode: "" });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true); setMessage(""); setError("");
    if ((settings.is2faEnabled || settings.hasSecurityCode) && !/^\d{6}$/.test(settings.securityCode.trim())) {
      setError("أدخل رمز الأمان الحالي المكوّن من 6 أرقام قبل الحفظ");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/user/security/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حفظ الإعدادات");
      setMessage("تم حفظ إعدادات الأمان بنجاح");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("كلمات المرور الجديدة غير متطابقة");
      return;
    }
    setSaving(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/user/security/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تغيير كلمة المرور");
      setMessage("تم تغيير كلمة المرور بنجاح");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("هل أنت متأكد تماماً من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء أبداً وسيتم مسح جميع بياناتك ورصيدك.")) {
      return;
    }

    setSaving(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حذف الحساب");

      // Logout and redirect on success
      router.push("/login?deleted=true");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حذف الحساب");
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {showDeleteModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="admin-card w-full max-w-md p-6 space-y-6 border-red-500/30">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-2 text-red-500">
                <Trash2 size={20} />
                <h2 className="text-lg font-black">حذف الحساب نهائياً</h2>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs leading-6 text-red-400">
              <p className="font-bold mb-2">تحذير نهائي:</p>
              سيتم حذف جميع بياناتك، رصيدك، وطلباتك بشكل كامل. لا يمكن استعادة الحساب بعد الحذف.
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {settings.is2faEnabled && (
                <label className="block">
                  <span className="text-xs font-black text-zinc-300">رمز الأمان (2FA)</span>
                  <input
                    type="text"
                    required
                    value={deleteForm.securityCode}
                    onChange={e => setDeleteForm(d => ({ ...d, securityCode: e.target.value }))}
                    className="input-premium mt-2 w-full border-red-500/20 focus:border-red-500"
                    placeholder="123456"
                    maxLength={6}
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs font-black text-zinc-300">كلمة المرور لتأكيد الحذف</span>
                <input
                  type="password"
                  required
                  value={deleteForm.password}
                  onChange={e => setDeleteForm(d => ({ ...d, password: e.target.value }))}
                  className="input-premium mt-2 w-full border-red-500/20 focus:border-red-500"
                  placeholder="••••••••"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white font-black py-2.5 px-6 rounded-xl transition-all flex-1 active:scale-95 disabled:opacity-50"
                >
                  {saving ? "جارٍ الحذف..." : "تأكيد الحذف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <main className="max-w-4xl mx-auto space-y-6 pb-10">
        <header className="admin-card p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">إعدادات الأمان</h1>
              <p className="text-zinc-400 text-sm mt-1">تحكم في كيفية الدخول وحماية حسابك برمز أمان إضافي.</p>
            </div>
          </div>
        </header>

        {message && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-sm font-bold animate-fadeIn">
            <CheckCircle2 size={18} /> {message}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold animate-fadeIn">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Login Preferences */}
          <section className="admin-card p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
              <UserCheck size={20} className="text-[var(--color-gold)]" />
              <h2 className="text-lg font-black">تفضيلات الدخول</h2>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-zinc-500 leading-5">اختر كيف تريد تسجيل الدخول إلى حسابك. يمكنك قصر الدخول على وسيلة واحدة لزيادة الأمان.</p>

              <div className="grid gap-3">
                {[
                  { id: "both", label: "الكل (اسم المستخدم أو البريد)", desc: "يسمح بالدخول بأي منهما" },
                  { id: "username", label: "اسم المستخدم فقط", desc: "سيتم رفض الدخول بالبريد الإلكتروني" },
                  { id: "email", label: "البريد الإلكتروني فقط", desc: "سيتم رفض الدخول باسم المستخدم" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSettings(s => ({ ...s, loginPreference: opt.id }))}
                    className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-right ${
                      settings.loginPreference === opt.id
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/5"
                        : "border-[var(--color-border)] bg-black/20 hover:bg-black/40"
                    }`}
                  >
                    <span className={`text-sm font-black ${settings.loginPreference === opt.id ? "text-[var(--color-gold)]" : "text-white"}`}>{opt.label}</span>
                    <span className="text-[10px] text-zinc-500 mt-1">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2FA Security Code */}
          <section className="admin-card p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
              <Clock size={20} className="text-[var(--color-gold)]" />
              <h2 className="text-lg font-black">رمز الأمان (2FA)</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-[var(--color-border)]">
                <div>
                  <p className="text-sm font-black text-white">تفعيل التحقق الثنائي</p>
                  <p className="text-[10px] text-zinc-500 mt-1">طلب رمز الأمان عند الدخول</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, is2faEnabled: !s.is2faEnabled }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.is2faEnabled ? "bg-[var(--color-gold)]" : "bg-zinc-700"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.is2faEnabled ? "right-7" : "right-1"}`} />
                </button>
              </div>

              <label className="block">
                <span className="text-xs font-black text-zinc-300">رمز الأمان الحالي</span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={settings.securityCode}
                  onChange={(e) => setSettings(s => ({ ...s, securityCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  className="input-premium mt-2 w-full tracking-[0.35em]"
                  placeholder="أدخل 6 أرقام"
                  maxLength={6}
                  aria-describedby="security-code-help"
                />
                <span id="security-code-help" className="mt-1 block text-[10px] leading-4 text-zinc-500">يُطلب الرمز عند تفعيل أو تعطيل التحقق الثنائي، ولا يُحفظ كنص مكشوف.</span>
              </label>

              {settings.is2faEnabled && (
                <div className="space-y-4 animate-fadeIn">
                  <label className="block">
                    <span className="text-xs font-black text-zinc-300">تردد طلب الرمز</span>
                    <select
                      value={settings.twoFaFrequency}
                      onChange={(e) => setSettings(s => ({ ...s, twoFaFrequency: e.target.value }))}
                      className="input-premium mt-2 w-full"
                    >
                      <option value="always">عند كل عملية دخول</option>
                      <option value="hourly">مرة كل ساعة</option>
                      <option value="daily">مرة كل 24 ساعة</option>
                      <option value="weekly">مرة كل أسبوع</option>
                      <option value="monthly">مرة كل شهر</option>
                    </select>
                  </label>
                  <p className="text-[10px] text-zinc-500 leading-4 italic">سيُطلب هذا الرمز عند الدخول وفق التردد المحدد.</p>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save size={18} /> {saving ? "جارٍ الحفظ..." : "حفظ إعدادات الأمان"}
            </button>
          </section>
        </div>

        {/* Password & Security Code Management */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Change Password */}
          <section className="admin-card p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
              <KeyRound size={20} className="text-[var(--color-gold)]" />
              <h2 className="text-lg font-black">تغيير كلمة المرور</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <label className="block">
                <span className="text-xs font-black text-zinc-300">كلمة المرور الحالية</span>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  className="input-premium mt-2 w-full"
                  placeholder="••••••••"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black text-zinc-300">كلمة المرور الجديدة</span>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  className="input-premium mt-2 w-full"
                  placeholder="••••••••"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black text-zinc-300">تأكيد كلمة المرور الجديدة</span>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="input-premium mt-2 w-full"
                  placeholder="••••••••"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="btn-secondary w-full"
              >
                تحديث كلمة المرور
              </button>
            </form>
          </section>

          {/* Security Code Info */}
          <section className="admin-card p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
                <Shield size={20} className="text-[var(--color-gold)]" />
                <h2 className="text-lg font-black">حول رمز الأمان</h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-xs leading-6 text-zinc-300">
                  <p className="font-bold text-blue-300 mb-2 flex items-center gap-2">
                    <AlertCircle size={14} /> نصيحة أمنية
                  </p>
                  رمز الأمان (Security Code) هو طبقة حماية إضافية تمنع الوصول لحسابك حتى لو تمت سرقة كلمة المرور. تأكد من حفظ الرمز في مكان آمن وعدم مشاركته مع أحد.
                </div>
                <ul className="text-[10px] text-zinc-500 space-y-2 list-disc pr-4">
                  <li>الرمز يتكون عادة من 6 أرقام.</li>
                  <li>يتم طلبه بناءً على التردد الذي تختاره أعلاه.</li>
                  <li>يمكنك تعطيله مؤقتًا إذا كنت تملك الرمز الحالي.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl border border-[var(--color-border)] bg-black/20 text-center">
              <p className="text-xs text-zinc-400">تحتاج لتغيير الرمز؟</p>
              <p className="text-[10px] text-zinc-500 mt-1">تواصل مع الدعم الفني إذا فقدت رمز الأمان الخاص بك.</p>
            </div>
          </section>
        </div>

        {/* Danger Zone */}
        <section className="admin-card p-6 border-red-500/20 bg-red-500/[0.02]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-lg font-black text-red-500 flex items-center gap-2">
                <AlertCircle size={20} /> المنطقة الحساسة
              </h2>
              <p className="text-xs text-zinc-500 leading-5 max-w-xl">
                بمجرد حذف حسابك، لن تتمكن من استرجاعه أو الوصول إلى رصيدك أو سجل طلباتك مرة أخرى. يرجى التأكد قبل المتابعة.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 rounded-xl border border-red-500/30 text-red-500 font-black text-sm hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} /> حذف الحساب نهائياً
            </button>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
