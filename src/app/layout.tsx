import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { cookies } from "next/headers";
import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ClientAuthUser } from "./components/auth-client";
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
const fallbackBranding = { siteName: "follower", siteDescription: "منصة خدمات تسويق اجتماعي احترافية", brandMediaUrl: "", brandMediaType: "image" } as const;

type Branding = { siteName: string; siteDescription: string; brandMediaUrl: string; brandMediaType: "image" | "video" };
type BrandingRow = { siteName?: unknown; siteDescription?: unknown; brandMediaUrl?: unknown; brandMediaType?: unknown };

async function getInitialUser(): Promise<ClientAuthUser | null> {
  try {
    await initDb();
    const session = await getSession();
    if (!session.isLoggedIn || typeof session.userId !== "number" || !session.username || !session.role) return null;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        db.execute({
          sql: "SELECT balance, role, is_2fa_enabled, two_fa_user_configured, email_verified FROM users WHERE id = ? LIMIT 1",
          args: [session.userId],
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Initial user lookup timeout")), 1500);
        }),
      ]);
      const row = result.rows[0] as { balance?: unknown; role?: unknown; is_2fa_enabled?: unknown; two_fa_user_configured?: unknown; email_verified?: unknown } | undefined;
      if (!row) return null;
      const is2faEnabled = Number(row.is_2fa_enabled || 0) === 1 && Number(row.two_fa_user_configured || 0) === 1;
      return {
        username: session.username,
        balance: Number(row.balance || 0),
        role: typeof row.role === "string" ? row.role : session.role,
        is2faEnabled,
        is2faVerified: is2faEnabled ? session.is2faVerified === true : true,
        emailVerified: Number(row.email_verified) === 1,
      };
    } catch {
      return {
        username: session.username,
        balance: Number(session.balance || 0),
        role: session.role,
        is2faEnabled: Boolean(session.is2faEnabled),
        is2faVerified: session.is2faVerified !== false,
        emailVerified: session.emailVerified !== false,
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  } catch {
    return null;
  }
}

async function getBranding(): Promise<Branding> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      db.execute("SELECT siteName, siteDescription, brandMediaUrl, brandMediaType FROM site_settings LIMIT 1"),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("branding lookup timeout")), 1500);
      }),
    ]);
    const row = result.rows[0] as BrandingRow | undefined;
    return {
      siteName: typeof row?.siteName === "string" && row.siteName.trim() ? row.siteName.trim() : fallbackBranding.siteName,
      siteDescription: typeof row?.siteDescription === "string" && row.siteDescription.trim() ? row.siteDescription.trim() : fallbackBranding.siteDescription,
      brandMediaUrl: typeof row?.brandMediaUrl === "string" ? row.brandMediaUrl : fallbackBranding.brandMediaUrl,
      brandMediaType: row?.brandMediaType === "video" ? "video" : "image",
    };
  } catch {
    return fallbackBranding;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const mediaIcon = "/logo.gif"; // Fixed official brand logo icon
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
  const branding = await getBranding();
  const initialUser = await getInitialUser();
  const initialLocale: Locale = ["ar", "en", "ru", "zh", "hi"].includes(savedLocale as Locale) ? (savedLocale as Locale) : "ar";

  return (
    <html lang={initialLocale} dir={initialLocale === "ar" ? "rtl" : "ltr"} className={`${tajawal.variable} h-full antialiased`} data-locale={initialLocale}>
      <body className="min-h-full bg-[var(--color-bg)] text-white">
        <Providers initialLocale={initialLocale} initialBranding={branding} initialUser={initialUser}>{children}</Providers>
      </body>
    </html>
  );
}
