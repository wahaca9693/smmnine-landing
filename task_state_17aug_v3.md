# حالة المهمة — 17 أغسطس (جلسة إعادة التصميم للمرجع)

## المطلوب من المستخدم (رسالة آخر صورة)

1. صفحة تسجيل الدخول مثل الصورة المرجعية `1000166535.jpg` — **تم إنجازها** (تحقق: shots_v3/01_login_ref.png ممتاز)
2. الصفحة الرئيسية مثل الصورة المرجعية `1000166534.jpg` — قيد التنفيذ
3. "بوابة Asus" — المستخدم يقول كانت هناك بوابة دفع خاصة بها أزلتها. لا يوجد في المحادثات السابقة ذكر لـ "Asus"؛ الأرجح أنه يقصد بوابة الشحن بالعملات الرقمية الحالية (USDT/BTC/BNB) التي لم تُزَل. يجب سؤاله أو توضيح أن بوابة العملات ما زالت موجودة.

## حالة الإنجاز

| البند | الحالة |
|---|---|
| login/page.tsx مطابقة للمرجع | ✅ تم (زر إنشاء حساب أعلى، مرحبًا بعودتك، حقول، زر ذهبي بتاج، رابط تسجيل، بطاقتان سفليتان) |
| صفحة home = redirect إلى /services | معلومة مؤكدة |
| DashboardLayout + Header/BottomNav/Sidebar | موجودة في src/app/components |
| صفحة deposit بالعملات الستة + QR | موجودة وفعّالة (لم تُزَل) |
| شعارات العملات في public/coins | موجودة (coin-usdt.png, coin-bnb.png, coin-btc.png) |
| نافذة شروط إنستغرام بالصور المؤشر عليها | موجودة وفعّالة |
| admin/providers محسّنة | موجودة |
| رفع GitHub | ممنوع حتى موافقة صريحة |

## المراجع

- الصور المرجعية: /home/ubuntu/upload/1000166534.jpg (الرئيسية) و /home/ubuntu/upload/1000166535.jpg (login)
- تحليل المرجع: /home/ubuntu/smmnine/reference_design_analysis.md
- فحص login: /home/ubuntu/smmnine/login_v3_check.md
- ملاحظات اللقطات السابقة: /home/ubuntu/smmnine/verification_notes_v2.md

## الخطوات المتبقية

1. تعديل الصفحة الرئيسية (services/page.tsx) لتصبح بألوان أكثر دفئًا مطابقة للمرجع: الهيدر بخلفية ذهبية داكنة دافئة، بطاقات فئات بإطارات ذهبية خافتة وأيقونات ذهبية
2. مراجعة Header.tsx وBottomNav.tsx وSidebar.tsx — الهيدر في المرجع فاتح/ذهبي داكن (خلفية ذهبية فاتحة للأزرار) وليست سوداء
3. التأكد من بوابة العملات (deposit) تعمل وتُعرض بوصف BSC/TRON
4. لقطات 390px + عرض نهائي للمستخدم

## الخادم المحلي

- يعمل: cd /home/ubuntu/smmnine && USE_LOCAL_DB=1 LOCAL_DB_PATH=/home/ubuntu/smmnine-data/local.db pnpm dev (على :3000)
- تسجيل دخول curl: curl -c /tmp/adm.txt -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123456"}'
