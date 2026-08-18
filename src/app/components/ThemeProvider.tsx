"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLiveRefresh } from "./useLiveRefresh";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  defaultCurrency: string;
  primaryColor: string;
  secondaryColor: string;
  primaryLight: string;
  backgroundColor: string;
  cardColor: string;
  surfaceColor: string;
  borderColor: string;
}

interface ThemeContextType {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => void;
}

const defaultSettings: SiteSettings = {
  siteName: "Follower",
  siteDescription: "منصة خدمات تسويق اجتماعي احترافية",
  defaultCurrency: "USD",
  primaryColor: "var(--color-primary)",
  secondaryColor: "#fbbf24",
  primaryLight: "#fdba74",
  backgroundColor: "var(--color-bg)",
  cardColor: "var(--color-card)",
  surfaceColor: "var(--color-surface)",
  borderColor: "var(--color-border)",
};

const ThemeContext = createContext<ThemeContextType>({
  settings: defaultSettings,
  loading: true,
  refresh: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json();
      if (data.settings) {
        setSettings({ ...defaultSettings, ...data.settings });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSettings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useLiveRefresh(fetchSettings, { intervalMs: 60000 });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", settings.primaryColor);
    root.style.setProperty("--color-primary-dark", darken(settings.primaryColor, 15));
    root.style.setProperty("--color-gold", settings.secondaryColor);
    root.style.setProperty("--color-gold-bright", settings.primaryLight);
    root.style.setProperty("--color-bg", settings.backgroundColor);
    root.style.setProperty("--color-card", settings.cardColor);
    root.style.setProperty("--color-surface", settings.surfaceColor);
    root.style.setProperty("--color-border", settings.borderColor);
    if (settings.siteName) document.title = settings.siteName;
  }, [settings]);

  return (
    <ThemeContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

function darken(hex: string, percent: number) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00ff) - amt, 0);
  const B = Math.max((num & 0x0000ff) - amt, 0);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
