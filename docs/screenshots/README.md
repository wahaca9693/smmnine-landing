# معرض لقطات smmnine

هذه المكتبة تضم لقطات الشاشة التي جُمعت أثناء تطوير واختبار واجهات smmnine. تم الاحتفاظ بالصور داخل المستودع لتوثيق التصميم الجديد، وليس باعتبارها بديلًا عن فحص الكود أو الاختبارات الآلية.

> بعض الصور لقطات اختبار تاريخية أو صور مقارنة قبل/بعد. لا تُستخدم أي بيانات دخول ظاهرة في الصور كبيانات إنتاج، ولا تحتوي هذه المكتبة على `.env.local` أو مفاتيح API أو رموز Turso.

## لقطات smoke على عرض 390px

| الشاشة | الصورة |
|---|---|
| تسجيل الدخول | ![login 390](smoke/login-390.png) |
| الخدمات | ![services 390](smoke/services-390.png) |

## الهوية وتسجيل الدخول

| الوصف | الصورة |
|---|---|
| شاشة الدخول النهائية | ![final login](ui/final_login.png) |
| شاشة الدخول الكاملة | ![login full](ui/login_full.png) |
| تصميم شاشة الدخول | ![login screen](ui/login_screen.png) |
| زر الدخول | ![login button](ui/login_button_new.png) |
| نسخة بدون مؤشر | ![login no cursor](ui/login_no_cursor.png) |
| نسخة الإنتاج البصرية | ![prod login](ui/prod_login.png) |

## لوحة المستخدم والخدمات والطلبات

| الوصف | الصورة |
|---|---|
| الخدمات | ![services](ui/check_services.png) |
| الطلبات | ![orders](ui/check_orders.png) |
| طلبات باللغة الإنجليزية | ![orders English](ui/orders_en.png) |
| الطلبات بالذهبي | ![orders gold](ui/orders_gold.png) |
| مستخدم بعد الدخول | ![user logged](ui/human_user_logged.png) |
| طلبات المستخدم | ![user orders](ui/human_user_orders.png) |
| خدمات المستخدم | ![site services](ui/human_site_services.png) |
| خدمة واحدة | ![one service](ui/human_site_one_service.png) |
| خدمتان | ![two services](ui/human_site_two_services.png) |
| طلب تجريبي غير مدفوع | ![site ordered](ui/human_site_ordered.png) |

## API v2

| الوصف | الصورة |
|---|---|
| صفحة API الأساسية | ![API page](ui/human_api_page.png) |
| أسفل صفحة API | ![API page bottom](ui/human_api_page_bottom.png) |
| واجهة API الذهبية | ![API gold](ui/api_gold.png) |
| API باللغة الإنجليزية | ![API English](ui/api_en.png) |
| API الكاملة | ![API full](ui/api_full.png) |
| صفحة API الجديدة | ![API new](ui/api_new.png) |
| أسفل صفحة API الجديدة | ![API new bottom](ui/api_new_bottom.png) |

## الإيداع والشحن

| الوصف | الصورة |
|---|---|
| واجهة الإيداع Royal Gold | ![deposit gold](ui/deposit_gold.png) |

العناوين الفعلية للشبكات لا تُكتب في هذا المعرض؛ تُقرأ من Turso وقت التشغيل حتى لا تنتشر إعدادات الدفع في التوثيق أو Git.

## الإدارة والمزودون

| الوصف | الصورة |
|---|---|
| دخول الإدارة في اختبار الواجهة | ![admin login](ui/human_admin_login.png) |
| لوحة مزودي الخدمات | ![admin providers](ui/human_admin_providers.png) |
| تعديل اسم أو سعر خدمة | ![admin edited](ui/human_admin_edited.png) |
| تغيير السعر | ![admin price changed](ui/human_admin_price_changed.png) |
| نتيجة تغيير السعر | ![admin after price](ui/human_admin_after_price.png) |
| إرجاع الإعداد بعد الاختبار | ![admin restored](ui/human_admin_restored.png) |
| إخفاء خدمة في واجهة المستخدم | ![site after hide](ui/human_site_after_hide.png) |
| ظهور السعر بعد التعديل | ![site after price](ui/human_site_after_price.png) |
| قبل تعديل السعر | ![site before price](ui/human_site_before_price.png) |

## الدعم واللغات والتنقل

| الوصف | الصورة |
|---|---|
| الدعم بالذهبي | ![support gold](ui/support_gold.png) |
| الدعم بالإنجليزية | ![support English](ui/support_en.png) |
| التذاكر | ![tickets](ui/tickets_gold.png) |
| لوحة اللغة | ![language panel](ui/lang_panel.png) |
| الإنجليزية | ![English](ui/lang_en.png) |
| القائمة المفتوحة | ![menu open](ui/menu_open.png) |
| التنقل النهائي | ![navigation final](ui/nav_final.png) |
| شريط التنقل السفلي | ![bottom navigation](ui/nav_bottom_new.png) |
| اختبار إخفاء التنقل | ![navigation hide](ui/nav_hide_test.png) |

## صور المقارنة والاختبارات البصرية

المجلد `ui/` يحتوي كذلك على صور المقارنة المرحلية مثل `bisect_n.png` و`blank_n.png` و`bottom_zoom.png` و`n_fixed.png` و`n_zone.png` و`no_fixed.png` وغيرها. تم الاحتفاظ بها حتى تكون كل مراحل تحسين التجاوب والتنقل قابلة للمراجعة من سجل Git.

## صورة المرجع المرفقة

![GitHub README mobile reference](reference/github-readme-mobile.jpg)

هذه الصورة مرجع مرئي لعرض README على الهاتف، وليست لقطة من بيئة الإنتاج.

## ملاحظة أمنية

لا تُدخل كلمات المرور أو مفاتيح API أو رموز Turso أو مفاتيح NOWPayments في لقطات جديدة. إذا ظهرت معلومة حساسة في لقطة اختبار، يجب حذف الصورة أو استبدالها قبل استخدامها في توثيق عام.
