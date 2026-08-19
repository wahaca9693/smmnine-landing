import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import "./globals.css";
import Providers from "./components/Providers";
import type { Locale } from "./components/LanguageProvider";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  display: "swap",
});

const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const fallbackBranding = { siteName: "smmnine", siteDescription: "منصة خدمات السوشيال ميديا", brandMediaUrl: "", brandMediaType: "image" } as const;

type BrandingRow = { siteName?: unknown; siteDescription?: unknown; brandMediaUrl?: unknown; brandMediaType?: unknown };

async function getBranding() {
  try {
    const result = await db.execute("SELECT siteName, siteDescription, brandMediaUrl, brandMediaType FROM site_settings LIMIT 1");
    const row = result.rows[0] as BrandingRow | undefined;
    return {
      siteName: typeof row?.siteName === "string" && row.siteName.trim() ? row.siteName.trim() : fallbackBranding.siteName,
      siteDescription: typeof row?.siteDescription === "string" && row.siteDescription.trim() ? row.siteDescription.trim() : fallbackBranding.siteDescription,
      brandMediaUrl: typeof row?.brandMediaUrl === "string" ? row.brandMediaUrl : fallbackBranding.brandMediaUrl,
      brandMediaType: row?.brandMediaType === "video" ? "video" : "image",
    };
  } catch {
    return fallbackBranding;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const mediaIcon = branding.brandMediaType === "image" && branding.brandMediaUrl ? branding.brandMediaUrl : "/logo-icon.png";
  return {
    metadataBase: new URL(appUrl),
    title: { default: branding.siteName, template: `%s | ${branding.siteName}` },
    description: `${branding.siteName} - ${branding.siteDescription}`,
    icons: { icon: mediaIcon, shortcut: mediaIcon, apple: mediaIcon },
    openGraph: { title: branding.siteName, description: branding.siteDescription, images: [mediaIcon], type: "website" },
    twitter: { card: "summary_large_image", title: branding.siteName, description: branding.siteDescription, images: [mediaIcon] },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("follower-locale")?.value;
  const initialLocale: Locale = ["ar", "en", "ru", "zh", "hi"].includes(savedLocale as Locale) ? (savedLocale as Locale) : "ar";

  return (
    <html lang={initialLocale} dir={initialLocale === "ar" ? "rtl" : "ltr"} className={`${tajawal.variable} h-full antialiased`} data-locale={initialLocale}>
      <body className="min-h-full bg-[var(--color-bg)] text-white">
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
