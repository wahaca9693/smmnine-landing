# حالة المهمة — 17 أغسطس 2026 (الجلسة 4)

## طلب المستخدم الحالي (غير مكتمل بعد)
1. اختبار بشري كامل: تسجيل حساب جديد واستعمال كل شيء كإنسان (أزرار، شحن، API)
2. تحسين التصميم: أزرار طبيعية ليست كبيرة، تدرج ذهبي أفخم، رسائل حالة احترافية (جاري التنفيذ بعداد، جاري المعاينة بعين متحركة)
3. نظام لغات: عربي 🇦🇪 (علم الإمارات) / إنجليزي 🇺🇸 (علم أمريكا) — مبدل في الإعدادات، كل النصوص تتغير
4. صفحة API احترافية مفهومة (أمثلة كود، معلومات الخادم: رصيد، خدمات، منصات، استقرار)
5. واجهة دعم جميلة ومتطورة (تذاكر)
6. استقطاع API من محفظة المستخدم (ليس admin) — محقق ومختبر سابقًا
7. رسائل خطأ واضحة عند عدم وجود رصيد

## حالة المشروع
- المسار: /home/ubuntu/smmnine (Next.js 3000 شغّال: USE_LOCAL_DB=1 LOCAL_DB_PATH=/home/ubuntu/smmnine-data/local.db)
- قاعدة البيانات: /home/ubuntu/smmnine-data/local.db
- الأدمن: admin / (كلمة مرور أعيد ضبطها بـ bcryptjs — آخر تسجيل دخول curl -c /tmp/adm3.txt)
- المستخدم التجريبي API: tester99 / tester99pass@gmail.com (مفتاح API في /tmp/apikey.txt)
- المزودين: id1 مزود تجريبي محلي، id2 مزود تجريبي — أرصدتهما: 450/1200 (ضبطت يدويًا)
- لم يُرفع أي شيء لـ GitHub (ممنوع بدون موافقة صريحة)

## نظام اللغات الحالي
- ملف: src/app/components/LanguageProvider.tsx — يعمل بكوكي follower-locale، قاموس ar/en صغير (sidebar/bottomNav/header/dashboard/common فقط)
- يجب توسيع القاموس لكل النصوص + إضافة أعلام (🇦🇪 للعربية، 🇺🇸 للإنجليزية) في مبدل الإعدادات

## الملفات المهمة
- globals.css: نظام الألوان (يجب تدفئة التدرجات الذهبية أكثر)
- src/app/api-access/page.tsx + ApiDemo.tsx: بوابة API (إعادة تصميمها)
- src/app/orders/page.tsx: الطلبات (رسائل الحالة)
- لا توجد صفحة tickets داخل app؟ (جدول tickets موجود في db) — يوجد dashboard.supportCenter في LanguageProvider، يجب إيجاد صفحة التذاكر: ربما src/app/dashboard أو components/SupportCenter
- BottomNav.tsx: عنصر "الدعم الفني"
- Header.tsx, Sidebar, DashboardLayout

## اللقطات السابقة
- /home/ubuntu/shots_v3/01_login_ref.png, /home/ubuntu/shots_v3/05_login.png — تسجيل الدخول المرجعي ممتاز
- /home/ubuntu/shots_warm/01_services.png — الرئيسية
- /home/ubuntu/shots_api/13b_admin_providers_clean.png — لوحة المزودين نظيفة

## الخطوات المتبقية
1. إيجاد صفحة التذاكر/الدعم وواجهة الإعدادات الحالية
2. توسيع dictionary وإضافة مبدل لغة بأعلام
3. إعادة تصميم api-access
4. تحسين رسائل الحالة في orders/deposit (عدّاد متحرك، عين متحركة)
5. اختبار بشري كامل بسكربت Playwright مع لقطات
6. عرض النتائج
