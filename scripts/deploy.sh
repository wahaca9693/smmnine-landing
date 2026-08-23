#!/usr/bin/env bash
# ============================================================
# 🚀 سكربت نشر سريع على Vercel عبر GitHub
# ============================================================
# الاستخدام:
#   VERCEL_TOKEN=your_token_here bash scripts/deploy.sh "رسالة الـ commit"
# أو قم بتصدير المفتاح مسبقًا:
#   export VERCEL_TOKEN=your_token_here
#   bash scripts/deploy.sh
# ============================================================
set -e

if [ -z "$VERCEL_TOKEN" ]; then
  echo "⚠️  متغير VERCEL_TOKEN غير معيّن."
  echo "   سيتم الدفع إلى GitHub فقط، وسيقوم Vercel بالنشر التلقائي."
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🌿 الفرع الحالي: $BRANCH"

echo ""
echo "📦 حفظ التغييرات..."
git add -A

if git diff --cached --quiet; then
  echo "✅ لا توجد تغييرات جديدة للحفظ."
else
  MSG="${1:-تحديث تلقائي: $(date '+%Y-%m-%d %H:%M')}"
  git commit -m "$MSG"
  echo "✅ تم إنشاء commit: $MSG"
fi

echo ""
echo "🚀 دفع التغييرات إلى GitHub..."
git push origin "$BRANCH"

echo ""
echo "============================================"
echo "✅ تم الدفع! سيقوم Vercel بالنشر تلقائيًا خلال ثوانٍ."
echo ""
echo "🔗 روابط المشروع:"
echo "   الإنتاج:  https://smmnine-landing.vercel.app"
echo "   المعاينة: ستظهر في صفحة الـ PR على GitHub"
echo "============================================"

# محاولة النشر عبر Vercel CLI إذا كان المفتاح متوفرًا
if [ -n "$VERCEL_TOKEN" ] && command -v vercel &> /dev/null; then
  echo ""
  echo "🔧 محاولة النشر المباشر عبر Vercel CLI..."
  if vercel deploy --prod --token="$VERCEL_TOKEN" --yes 2>/dev/null; then
    echo "✅ تم النشر المباشر بنجاح!"
  else
    echo "ℹ️  تعذر الاتصال مباشرة بـ Vercel (متوقع في بيئات محمية)."
    echo "   النشر عبر GitHub سيكتمل تلقائيًا."
  fi
fi
