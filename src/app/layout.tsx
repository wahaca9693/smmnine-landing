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
  metadataBase: new URL("https://follower-ty.duckdns.org"),
  title: { default: "Follower", template: "%s | Follower" },
  description: "Follower - خدمات السوشيال ميديا",
  icons: {
    icon: "/logo-icon.png",
    shortcut: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
  openGraph: {
    title: "Follower",
    description: "Follower - خدمات السوشيال ميديا",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Follower",
    description: "Follower - خدمات السوشيال ميديا",
    images: ["/og-image.png"],
  },
};

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
