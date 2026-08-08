import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "./components/Providers";
import type { Locale } from "./components/LanguageProvider";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Follower - لوحة التحكم",
  description: "لوحة تحكم Follower لخدمات السوشيال ميديا",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("follower-locale")?.value;
  const initialLocale: Locale = savedLocale === "en" ? "en" : "ar";

  return (
    <html lang={initialLocale} dir={initialLocale === "ar" ? "rtl" : "ltr"} className={`${tajawal.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--color-bg)] text-white">
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
