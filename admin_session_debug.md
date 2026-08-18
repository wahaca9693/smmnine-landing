# تشخيص جلسة الأدمن (17 أغسطس)

## المشكلة الحالية
- تسجيل دخول الأدمن من النموذج يرجع 401: «اسم المستخدم أو كلمة المرور غير صحيحة»
- المستخدم admin موجود: id=1, role=admin, is_banned=0 (من python3 sqlite3 /home/ubuntu/smmnine-data/local.db)
- كلمة المرور التي نجحت سابقًا كانت "Admin123456!" لكنها تفشل الآن
- /tmp/adm.txt (كوكي curl قديمة) يرجع 401 أيضًا
- ملاحظة: تسجيل دخول apitest_user نجح سابقًا بـ password="Test123456" (capture_api.mts)

## الخطوة التالية
- فحص hash كلمة مرور الأدمن في جدول users أو إعادة ضبطها عبر API register (admin محظور من إعادة التسجيل على نفس الاسم؟)
- الحل: تحديث password_hash مباشرة عبر سكربت Python (bcrypt مع salt round 10) — أو استخدام /api/auth/login مباشرة عبر curl لمعرفة الخطأ الدقيق

## نجاحات سابقة اليوم (تحتاج فقط لقطات admin providers)
1. User API كامل يعمل: مفتاح عشوائي smm-..., استقطاع من محفظة المستخدم (50→49.883), طلب مسجل في orders + transactions (api_order)
2. إصلاح خطأ 500 في src/app/api/v2/route.ts: إزالة عمود via، استرجاع الرصيد عند الفشل، تسجيل معاملة خصم
3. لقطات shots_api/01..04 ممتازة (صفحة API، طلباتي، شحن الرصيد)
4. صفحة login الجديدة تعمل (isLogin=true, placeholders: "أدخل اسم المستخدم")

## أوامر مفيدة
- الخادم: cd /home/ubuntu/smmnine && source /home/ubuntu/.user_env && USE_LOCAL_DB=1 LOCAL_DB_PATH=/home/ubuntu/smmnine-data/local.db pnpm dev (log: /tmp/dev.log)
- لقطات: npx tsx <script.mts> من داخل /home/ubuntu/smmnine
- لا يوجد sqlite3 CLI — استخدم python3 + sqlite3
