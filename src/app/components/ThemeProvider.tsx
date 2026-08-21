"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveRefresh } from "./useLiveRefresh";

export interface SiteSettings {
  siteName: string;
  brandMediaUrl: string;
  brandMediaType: "image" | "video";
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
  refresh: () => void | Promise<void>;
  update: (next: Partial<SiteSettings>) => void;
}

export const BRANDING_REFRESH_KEY = "smmnine:branding-updated";

export const defaultSettings: SiteSettings = {
  siteName: "follower",
  brandMediaUrl: "",
  brandMediaType: "image",
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
  update: () => {},
});

function normalizeSettings(value: unknown): SiteSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const source: Record<string, unknown> = {
    ...raw,
    siteName: raw.siteName ?? raw.site_name,
    siteDescription: raw.siteDescription ?? raw.site_description,
    brandMediaUrl: raw.brandMediaUrl ?? raw.brand_media_url,
    brandMediaType: raw.brandMediaType ?? raw.brand_media_type,
  };
  const stringValue = (key: keyof SiteSettings, fallback: string) => {
    const candidate = source[key];
    return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
  };
  return {
    siteName: stringValue("siteName", defaultSettings.siteName),
    brandMediaUrl: typeof source.brandMediaUrl === "string" ? source.brandMediaUrl : defaultSettings.brandMediaUrl,
    brandMediaType: source.brandMediaType === "video" ? "video" : "image",
    siteDescription: stringValue("siteDescription", defaultSettings.siteDescription),
    defaultCurrency: stringValue("defaultCurrency", defaultSettings.defaultCurrency),
    primaryColor: stringValue("primaryColor", defaultSettings.primaryColor),
    secondaryColor: stringValue("secondaryColor", defaultSettings.secondaryColor),
    primaryLight: stringValue("primaryLight", defaultSettings.primaryLight),
    backgroundColor: stringValue("backgroundColor", defaultSettings.backgroundColor),
    cardColor: stringValue("cardColor", defaultSettings.cardColor),
    surfaceColor: stringValue("surfaceColor", defaultSettings.surfaceColor),
    borderColor: stringValue("borderColor", defaultSettings.borderColor),
  };
}

export function broadcastBrandingUpdate() {
  if (typeof window === "undefined") return;
  const stamp = String(Date.now());
  window.localStorage.setItem(BRANDING_REFRESH_KEY, stamp);
  window.dispatchEvent(new Event(BRANDING_REFRESH_KEY));
}

export function ThemeProvider({ children, initialSettings }: { children: ReactNode; initialSettings?: Partial<SiteSettings> }) {
  const normalizedInitialSettings = normalizeSettings(initialSettings);
  const [settings, setSettings] = useState<SiteSettings>(() => normalizedInitialSettings);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchSettings = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await fetch("/api/settings", { cache: "no-store", signal: controller.signal });
      const data = await res.json() as { settings?: unknown };
      if (!res.ok || requestId !== requestIdRef.current) return;
      if (data.settings) setSettings(normalizeSettings(data.settings));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestId === requestIdRef.current) console.error(error);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onBrandingUpdate = () => { void fetchSettings(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === BRANDING_REFRESH_KEY) onBrandingUpdate();
    };
    window.addEventListener(BRANDING_REFRESH_KEY, onBrandingUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BRANDING_REFRESH_KEY, onBrandingUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [fetchSettings]);

  useLiveRefresh(fetchSettings, { intervalMs: 30000 });

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
    if (settings.siteName) {
      document.title = settings.siteName;
      document.documentElement.dataset.siteName = settings.siteName;
      setMetaContent("description", settings.siteDescription);
      setMetaContent("og:title", settings.siteName);
      setMetaContent("og:description", settings.siteDescription);
      setMetaContent("twitter:title", settings.siteName);
      setMetaContent("twitter:description", settings.siteDescription);
      if (settings.brandMediaUrl && settings.brandMediaType === "image") {
        setIconLink("icon", settings.brandMediaUrl);
        setIconLink("shortcut icon", settings.brandMediaUrl);
      }
    }
  }, [settings]);

  const update = useCallback((next: Partial<SiteSettings>) => {
    setSettings((current) => normalizeSettings({ ...current, ...next }));
  }, []);

  return (
    <ThemeContext.Provider value={{ settings, loading, refresh: fetchSettings, update }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

function setMetaContent(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(name.startsWith("og:") ? "property" : "name", name);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setIconLink(rel: string, href: string) {
  let element = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

function darken(hex: string, percent: number) {
  const num = parseInt(hex.replace("#", ""), 16);
  if (!Number.isFinite(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00ff) - amt, 0);
  const B = Math.max((num & 0x0000ff) - amt, 0);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
