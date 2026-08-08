"use client";

import { LanguageProvider, type Locale } from "./LanguageProvider";
import { ThemeProvider } from "./ThemeProvider";

export default function Providers({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <ThemeProvider>{children}</ThemeProvider>
    </LanguageProvider>
  );
}
