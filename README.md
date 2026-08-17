# Follower Dashboard

لوحة تحكم كاملة لمنصة Follower لخدمات السوشيال ميديا، مطابقة لتصميم الموقع الرسمي (الوضع الداكن والبرتقالي) مع ربط قاعدة بيانات Turso وواجهة Follower API.

## التقنيات المستخدمة

- Next.js 16
- React + TypeScript
- Tailwind CSS v4
- Google Fonts: Tajawal
- @libsql/client (Turso)
- iron-session (مصادقة الجلسات)
- bcryptjs (تشفير كلمات المرور)
- lucide-react + SVG Icons

## المميزات

### المصادقة
- تسجيل دخول وإنشاء حساب
- جلسات آمنة باستخدام iron-session
- تسجيل الدخول باسم المستخدم أو البريد الإلكتروني
- إلزام البريد الإلكتروني عند التسجيل
- شروط استخدام قوية مع موافقة المستخدم
- شاشة تحميل احترافية بشعار المنصة
- معالجة كاملة لمشكلة `BigInt` في قاعدة البيانات

### تصميم مطابق للرسمي
- شريط علوي: شعار Follower على اليمين، أيقونات الجرس والملف والقائمة على اليسار
- شريط تنقل سفلي من اليمين لليسار: خدمات | شحن الرصيد | طلب جديد | طلباتي | الدعم الفني
- أيقونات SVG حقيقية لكل منصة
- بطاقات دفع مرتبة واحدة في كل صف

### الصفحات
- `/dashboard` — مركز الدعم (فني + ذكاء اصطناعي)
- `/orders` — طلباتك مع فلترة حسب الحالة
- `/orders/new` — إنشاء طلب جديد مع حاسبة سعر ذكية حسب الكمية
- `/deposit` — شحن الرصيد بطرق دفع متعددة
- `/services` — تصفح الخدمات حسب المنصة والنوع والفئة
- `/terms` — شروط الاستخدام والتعويض
- `/admin` — لوحة الأدمن لإضافة/خصم رصيد المستخدمين

### تصفية الخدمات الذكية
- عند اختيار منصة (إنستغرام، تيك توك، يوتيوب...) تظهر خدماتها فقط.
- تصفية إضافية حسب نوع الخدمة: متابعين، لايكات، مشاهدات، تعليقات، مشاركات، حفظ، تصويت، ستوريات، ريلز...
- كل خدمة لها شروطها الخاصة (min/max/الرابط المطلوب).

### الربط بالسيرفرات
- جلب جميع الخدمات من Follower API
- إنشاء طلبات حقيقية عبر Follower API
- خصم الرصيد تلقائيًا عند إنشاء الطلب
- تتبع حالة الطلب وتحديثها
- تسجيل جميع الطلبات والمعاملات في Turso
- حاسبة سعر ذكية: تحسب التكلفة لأي عدد (100، 500، 1000...) مع عرض min/max

## إعداد قاعدة البيانات

```bash
npm install
npx dotenv-cli -e .env.local -- npm run db:init
npx dotenv-cli -e .env.local -- npm run seed
```

## متغيرات البيئة

```env
SMMNINE_API_URL=https://your-domain.example/api/v2
SMMNINE_API_KEY=<user-api-key>

TURSO_DATABASE_URL=libsql://your-database.turso.io
# اضبط رمز مصادقة Turso كمتغير سري محمي في الاستضافة، ولا تكتبه في Git
USE_LOCAL_DB=0

SESSION_SECRET=<random-secret-at-least-32-chars>
```

## التشغيل محليًا

يستخدم المشروع قاعدة Turso عند ضبط `TURSO_DATABASE_URL` و`TURSO_AUTH_TOKEN` مع `USE_LOCAL_DB=0` أو عند حذف `USE_LOCAL_DB`. لاستخدام SQLite محليًا للاختبارات فقط، اضبط `USE_LOCAL_DB=1` و`LOCAL_DB_PATH`، ثم لا تستخدم ذلك الإعداد في الإنتاج.

```bash
npm run dev
```

افتح `http://localhost:3000`

## بيانات الدخول الافتراضية

| اسم المستخدم | كلمة المرور | الدور |
|---|---|---|
| admin | Admin@123 | admin |
| koooookook1 | User@123 | user |

## البناء للإنتاج

```bash
npm run build
```

## روابط النشر

- https://smmnine-landing.vercel.app
- https://smmnine-landing-97m42xe49-kalodhs-projects.vercel.app

## ملاحظات أمنية

- مفتاح Follower API يُستخدم فقط في الخادم.
- SESSION_SECRET يجب تغييره في الإنتاج.
- لا تشارك بيانات Turso أو مفاتيح API.
