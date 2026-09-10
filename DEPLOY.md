# 🚀 دليل النشر على Vercel

## رابط المشروع
- **الإنتاج (Production):** https://smmnine-landing.vercel.app
- **Git Repository:** https://github.com/wahaca9693/smmnine-landing

## كيف يعمل النشر التلقائي؟

تم ربط مستودع GitHub بـ Vercel مسبقًا. لذلك:

1. أي تحديث تدفعه إلى فرع `main` على GitHub → سيتم نشره تلقائيًا على Vercel خلال ثوانٍ
2. أي PR يتم فتحه → سيتم إنشاء رابط معاينة (Preview) تلقائيًا

## متغيرات البيئة المطلوبة على Vercel

يجب تعيين هذه المتغيرات في لوحة تحكم Vercel → Project → Settings → Environment Variables:

```env
# ربط قاعدة البيانات Turso
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
USE_LOCAL_DB=0

# مفتاح الجلسات (يجب أن يكون 32 حرفًا على الأقل)
SESSION_SECRET=change-this-to-a-strong-random-secret-32chars

# SMM Nine API
SMMNINE_API_URL=https://smmnine.com/api/v2
SMMNINE_API_KEY=your-smmnine-api-key

# إعدادات Asiacell (اختياري - للدفع عبر Asiacell)
# ASIACELL_PROXY_URL=http://your-proxy-server:3000
# ASIACELL_PROXIES=...
```

## ✅ فحص صحة النشر

بعد أي نشر، افتح:

```
https://smmnine-landing.vercel.app/api/health
```

يُرجع مثلًا:

```json
{ "status": "ok", "db": "connected", "smmnineKeyConfigured": true, "counts": { "users": 12, "orders": 40, "tickets": 3, "crypto_deposits": 0 } }
```

- `status: "ok"` + `db: "connected"` ← قاعدة البيانات شغّالة ومتغيّرات Turso مضبوطة.
- `db: "error"` ← `TURSO_DATABASE_URL` أو `TURSO_AUTH_TOKEN` ناقصة/غلط على فيرسل.
- `smmnineKeyConfigured: false` ← ما حطيت `SMMNINE_API_KEY` في Environment Variables.
- النقطة تنفّذ أيضًا `CREATE TABLE IF NOT EXISTS crypto_deposits` فتُصلح البنية الناقصة تلقائيًا على القواعد القديمة.

> لا يُنشَر أي سر من هذه النقطة — حالة الاتصال والعدّادات فقط.

## أمر النشر اليدوي (إذا احتجت)

```bash
# 1. ثبّت Vercel CLI
npm i -g vercel

# 2. سجّل الدخول بالمفتاح (استخدم متغير VERCEL_TOKEN)
export VERCEL_TOKEN=<مفتاح_فيرسل_الخاص_بك>
echo $VERCEL_TOKEN | vercel login --token

# 3. اربط المشروع (أول مرة فقط)
vercel link

# 4. اسحب متغيرات البيئة
vercel env pull

# 5. انشر على الإنتاج
vercel --prod
```

## سكربت النشر السريع

```bash
VERCEL_TOKEN=<مفتاح_فيرسل> bash scripts/deploy.sh "رسالة توضح التحديث"
```

## سير العمل من داخل المساعد (أنا)

عندما تطلب مني رفع التحديثات، أقوم تلقائيًا بـ:
1. `git add .`
2. `git commit -m "..."`
3. إنشاء PR من فرع التحديثات إلى `main`
4. دمج الـ PR → Vercel سيبني المشروع وينشره تلقائيًا
5. أزوّدك برابط النشر

## بيانات الدخول الافتراضية (بعد seed)

| المستخدم | كلمة المرور | الدور |
|---|---|---|
| admin | Admin@123 | admin |
| koooookook1 | User@123 | user |

## 🔒 ملاحظة أمنية هامة

لا تقم بوضع مفتاح Vercel مباشرة داخل أي ملف في المشروع (مثل `DEPLOY.md` أو `deploy.sh`).
استخدم دومًا متغير بيئي `VERCEL_TOKEN` أو GitHub Secrets أو Vercel Environment Variables.
