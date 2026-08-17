"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, User, Lock, Loader2, Rocket, Zap, ArrowLeft, Crown, Sparkles } from "lucide-react";
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
    const timer = setTimeout(() => setShowSplash(false), 1600);
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
      <div className="login-gold-bg flex h-screen flex-col items-center justify-center">
        <div className="relative">
          <img
            src="/logo.gif"
            alt="Follower"
            className="h-28 w-28 rounded-3xl object-cover shadow-[0_0_80px_-10px_rgba(212,175,55,0.9)] animate-fadeIn ring-2 ring-[var(--color-gold)]/60"
          />
          <Sparkles className="absolute -top-2 -left-2 text-[var(--color-gold)] animate-pulse" size={24} />
        </div>
        <h1 className="mt-6 text-4xl font-black text-gradient-luxe">Follower</h1>
        <p className="mt-2 text-sm tracking-[0.3em] text-[var(--color-gold)]/80 font-bold">ROYAL GOLD EDITION</p>
      </div>
    );
  }

  return (
    <div className="login-gold-bg flex min-h-screen flex-col px-5 py-6">
      {/* شريط علوي: زر إنشاء حساب + الشعار */}
      <div className="flex items-center justify-between">
        <Link
          href="#register"
          onClick={(e) => {
            e.preventDefault();
            setIsLogin(false);
          }}
          className="gradient-luxe rounded-xl px-5 py-2.5 text-sm font-black text-[#111] shadow-[0_4px_24px_-4px_rgba(212,175,55,0.5)]"
        >
          إنشاء حساب
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl font-black text-white tracking-wide">Follower</span>
          <div className="relative">
            <img src="/logo.gif" alt="Follower" className="h-11 w-11 rounded-2xl object-cover ring-1 ring-[var(--color-gold)]/50" />
            <Sparkles className="absolute -top-1 -left-1 text-[var(--color-gold)]" size={14} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        {/* الترحيب */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="relative">
            <img
              src="/logo.gif"
              alt="Follower"
              className="h-20 w-20 rounded-3xl object-cover shadow-[0_0_60px_-8px_rgba(212,175,55,0.8)] ring-2 ring-[var(--color-gold)]/70"
            />
            <Sparkles className="absolute -top-2 -left-2 text-[var(--color-gold)] animate-pulse" size={22} />
          </div>
          <h1 className="text-center text-4xl font-black text-gradient-luxe">
            {isLogin ? "مرحبًا بعودتك" : "إنشاء حساب جديد"}
          </h1>
          <p className="text-center text-sm text-[var(--color-text-muted)]">
            {isLogin ? "أدخل بياناتك للدخول إلى حسابك" : "سجّل حسابك الجديد وابدأ رحلتك معنا"}
          </p>
        </div>

        {/* بطاقة الحقول */}
        <div className="glass-card w-full max-w-sm mx-auto p-6 shadow-[0_24px_80px_-20px_rgba(212,175,55,0.35)]">
          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-center text-sm font-bold text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-black text-white">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70" size={19} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 pr-11 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-gold)]/40"
                  placeholder="أدخل اسم المستخدم"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="mb-2 block text-sm font-black text-white">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70" size={19} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 pr-11 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-gold)]/40"
                    placeholder="example@email.com"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-black text-white">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70" size={19} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 pr-11 pl-11 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-gold)]/40"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
              {!isLogin && <p className="mt-1.5 text-xs text-zinc-500">8 أحرف على الأقل، تحتوي على حروف وأرقام</p>}
            </div>

            {!isLogin && (
              <label className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 cursor-pointer">
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
              className="btn-glow-pulse flex w-full items-center justify-center gap-2.5 rounded-xl gradient-luxe py-4 text-base font-black text-[#111] shadow-[0_8px_32px_-8px_rgba(212,175,55,0.6)] transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Crown size={20} />}
              {loading ? "جاري..." : isLogin ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>

          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 text-center text-sm font-black text-[var(--color-primary)]"
          >
            <ArrowLeft size={16} />
            {isLogin ? "ليس لديك حساب؟ سجّل الآن مجانًا" : "لديك حساب؟ سجل الدخول"}
          </button>
        </div>

        {/* البطاقتان السفليتان */}
        <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 ring-1 ring-[var(--color-gold)]/30">
              <Zap className="text-[var(--color-gold)]" size={22} />
            </div>
            <h3 className="text-sm font-black text-white">شحن تلقائي بالعملات</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">شحن فوري عبر BSC / TRON وغيرها</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 ring-1 ring-[var(--color-gold)]/30">
              <Rocket className="text-[var(--color-gold)]" size={22} />
            </div>
            <h3 className="text-sm font-black text-white">تنفيذ فوري</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">طلباتك تبدأ خلال ثوانٍ معدودة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
