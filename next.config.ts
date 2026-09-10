import type { NextConfig } from "next";

// أصول إضافية مسموح لها بقراءة أصول وضع التطوير (HMR/dev overlay).
// مفيد عند فتح السيرفر من جهاز آخر أو عبر رابط بروكسي، مثل:
//   DEV_ALLOWED_ORIGINS=*.example.com
// لا يؤثر على الإنتاج إطلاقًا.
const extraDevOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: extraDevOrigins,
};

export default nextConfig;
