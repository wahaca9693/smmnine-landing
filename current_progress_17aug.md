# تقدم 17 أغسطس (جلسة الحالية)

## المنجز
1. شعارات العملات مولدة وخلفية شفافة (public/coins/coin-usdt.png, coin-bnb.png, coin-btc.png) — 1920x1920.
2. globals.css: نمط login-gold-bg مضاف (تدرج ذهبي فخم + نقاط ضوئية) واستخدم في login/page.tsx للـ splash والنموذج.
3. deposit/page.tsx: بطاقات العملات تعرض الشعار الدائري (h-10 w-10) + اسم الشبكة بالعربية (networkOf) + شارة الحد الأدنى — networkOf يعدّل لمطابقة ERC20/TRC20/BEP20/Polygon/X Layer/Bitcoin SegWit.
4. NewOrderContent.tsx: نافذة الشروط محسنة — شارة ذهبيّة، إطار ذهبي للصورة، تحذير أحمر "التأشير الأحمر هو الخيار الذي يجب إيقافه — لن يتم تعويضك أبدًا".

## ملاحظة مهمة: صور الشروط
- /public/ig-requirement-step1.png و step2.png هي التصاميم المؤشر عليها (دائرة حمراء + أرقام + أسهم + ترويسات ذهبية) — ممتازة ومطابقة لطلب المستخدم.
- API /api/service-requirements?category=Instagram يعيد شرطين بصور صحيحة. الصور في DB عبر image_url=https://localhost:3000/...

## حالة اللقطات v2
- 06_requirements_modal: الصور المؤشر عليها تظهر داخل إطار ذهبي + تحذير أحمر ✓ (إصلاح URL في route.ts نجح)
- 01_login_gold_bg: الخلفية داكنة شبه سوداء — التدرج الذهبي غير واضح! تحتاج تعزيز: gradient أعلى كثافة (rgba ذهبي أكبر) + طبقة ضبابية ذهبية واضحة أعلى وأسفل.
- بقية اللقطات تحت الفحص.

## المتبقي (محدّث)
1. ServiceRow في admin/providers: grid-cols-[36px_1fr_64px_70px_80px_76px] ضيق جدًا على 390px — يجب استبدالها بشبكة مرنة أو تبسيطةا (اسم+تعديل اسم، min/max، أزرار toggle/hذف، حذف عمود is_new من الصف أو جعله سطرًا منفصلًا).
2. فحص api-access أزرار (صغيرة أصلاً) + NewOrderContent.
3. admin/providers: تحسين عرض حالة الربط بعد إضافة مزود (نتيجة فحص الاتصال + الرصيد + عدد الخدمات).
4. tsc --noEmit.
5. لقطات 390px ثم تسليم + طلب موافقة الرفع.
3. tsc --noEmit.
4. لقطات 390px: login (خلفية ذهبية)، deposit (شعارات + شبكات)، orders/new (نافذة شروط بالصور)، admin/providers.
   - سكربتات: capture390e.mts (login admin/admin123456)، capture390i.mts (deposit محمية بالكوكي)، لقطات في /home/ubuntu/shots390.
   - الكوكي: capture390i يحفظه في /tmp/adm.txt (يفحص وجوده).
5. تسليم + طلب موافقة الرفع (ممنوع الرفع بدون موافقة).

## بيانات
- dev server: :3000 يعمل (pnpm dev، USE_LOCAL_DB=1 LOCAL_DB_PATH=/home/ubuntu/smmnine-data/local.db كما في سكربتات التقاط).
- admin/admin123456 لتسجيل الدخول.
