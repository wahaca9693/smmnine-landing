"use client";

import { LanguageProvider, type Locale } from "./LanguageProvider";
import { ThemeProvider, type SiteSettings } from "./ThemeProvider";

export default function Providers({ children, initialLocale, initialBranding }: { children: React.ReactNode; initialLocale: Locale; initialBranding?: Partial<SiteSettings> }) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <ThemeProvider initialSettings={initialBranding}>{children}</ThemeProvider>
    </LanguageProvider>
  );
}
