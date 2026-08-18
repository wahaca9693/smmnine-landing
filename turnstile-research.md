# مراجع حماية Turnstile

تمت مراجعة وثائق Cloudflare الرسمية في 18 أغسطس 2026.

تؤكد وثائق التحقق الخادمي أن استدعاء Siteverify إلزامي؛ واجهة Turnstile في المتصفح وحدها لا تحمي المسار لأن الرموز يمكن تزويرها. الرمز صالح لمدة 300 ثانية (5 دقائق) ويُستخدم مرة واحدة فقط، وإعادة استخدامه تُرفض عادةً بالخطأ `timeout-or-duplicate`.

نقطة التحقق الرسمية هي:
`POST https://challenges.cloudflare.com/turnstile/v0/siteverify`

المعطيات المطلوبة هي `secret` و`response`، ويمكن إرسال `remoteip` اختياريًا. يرسل المتصفح الرمز عادةً في الحقل `cf-turnstile-response`، ويجب على الخادم رفض الطلب إذا لم تنجح نتيجة Siteverify.

توصي وثائق التضمين باستخدام الرابط الدقيق للسكريبت:
`https://challenges.cloudflare.com/turnstile/v0/api.js`

المراجع الرسمية:
1. https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
2. https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
3. https://developers.cloudflare.com/turnstile/tutorials/login-pages/
