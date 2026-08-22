"use client";

import { createContext, useContext } from "react";
import { LanguageProvider, type Locale } from "./LanguageProvider";
import { ThemeProvider, type SiteSettings } from "./ThemeProvider";
import type { ClientAuthUser } from "./auth-client";

const InitialAuthContext = createContext<ClientAuthUser | null>(null);

export function useInitialAuthUser(): ClientAuthUser | null {
  return useContext(InitialAuthContext);
}

export default function Providers({ children, initialLocale, initialBranding, initialUser }: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialBranding?: Partial<SiteSettings>;
  initialUser: ClientAuthUser | null;
}) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <ThemeProvider initialSettings={initialBranding}>
        <InitialAuthContext.Provider value={initialUser}>{children}</InitialAuthContext.Provider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
