"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, Mail, User, Lock, Shield, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    if (!/[A-Za-z]/.test(pass)) return "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل";
    if (!/[0-9]/.test(pass)) return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isLogin) {
      if (!email) {
        setError("البريد الإلكتروني مطلوب");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("البريد الإلكتروني غير صالح");
        return;
      }
      const passError = validatePassword(password);
      if (passError) {
        setError(passError);
        return;
      }
      if (!termsAccepted) {
        setError("يجب الموافقة على شروط الاستخدام");
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin ? { username, password } : { username, email, password, termsAccepted };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حدث خطأ");
        setLoading(false);
        return;
      }

      router.push("/services");
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
      setLoading(false);
    }
  };

  if (showSplash) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[var(--color-bg)]">
        <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-3xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-2xl shadow-orange-500/30">
          <Zap size={48} fill="currentColor" />
        </div>
        <h1 className="mt-6 text-3xl font-black text-white">Follower</h1>
        <p className="mt-2 text-sm text-zinc-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-5 py-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-orange-500/30">
          <Zap size={30} fill="currentColor" />
        </span>
        <span className="text-3xl font-black text-white">Follower</span>
      </div>

      <div className="w-full max-w-sm rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl">
        <h1 className="mb-1 text-center text-2xl font-black text-white">
          {isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500">
          {isLogin ? "أدخل بياناتك للوصول إلى لوحة التحكم" : "سجل حسابك الجديد الآن"}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-center text-sm font-bold text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-zinc-400">اسم المستخدم</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-10 text-white outline-none focus:border-[var(--color-primary)]"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="mb-1 block text-sm font-bold text-zinc-400">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-10 text-white outline-none focus:border-[var(--color-primary)]"
                  placeholder="example@email.com"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-bold text-zinc-400">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-10 pl-10 text-white outline-none focus:border-[var(--color-primary)]"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!isLogin && (
              <p className="mt-1 text-xs text-zinc-600">8 أحرف على الأقل، تحتوي على حروف وأرقام</p>
            )}
          </div>

          {!isLogin && (
            <label className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
              />
              <div className="text-xs text-zinc-400 leading-relaxed">
                أوافق على{" "}
                <Link href="/terms" target="_blank" className="font-bold text-[var(--color-primary)] hover:underline">
                  شروط الاستخدام
                </Link>{" "}
                وسياسة التعويض. أقر بأنني قرأت شروط كل خدمة قبل الطلب.
              </div>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 text-base font-black text-white shadow-lg shadow-orange-500/25 transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            {loading ? "جاري..." : isLogin ? "دخول" : "إنشاء الحساب"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
          }}
          className="mt-5 w-full text-center text-sm font-bold text-[var(--color-primary)] hover:underline"
        >
          {isLogin ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب؟ سجل الدخول"}
        </button>
      </div>
    </div>
  );
}
