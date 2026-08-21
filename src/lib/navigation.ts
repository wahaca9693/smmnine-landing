export const NAVIGATION_ICONS = ["Zap", "Globe2", "Gift", "Wallet", "ShoppingCart", "Boxes", "Bell", "FileText", "KeyRound", "RefreshCw", "Star", "Sparkles"] as const;
export const NAVIGATION_AUDIENCES = ["user", "admin", "both"] as const;
export const NAVIGATION_BADGE_COLORS = ["gold", "green", "blue", "red"] as const;

export type NavigationAudience = typeof NAVIGATION_AUDIENCES[number];
export type NavigationIcon = typeof NAVIGATION_ICONS[number];
export type NavigationBadgeColor = typeof NAVIGATION_BADGE_COLORS[number];

export type NavigationItem = {
  id: number;
  label_ar: string;
  label_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  href: string;
  icon: NavigationIcon;
  badge: string | null;
  badge_color: NavigationBadgeColor;
  audience: NavigationAudience;
  is_active: number;
  sort_order: number;
};

export function validNavigationHref(value: unknown): string | null {
  const href = String(value ?? "").trim();
  if (!href || href.length > 160 || !href.startsWith("/") || href.startsWith("//") || href.includes("\\") || /[\r\n]/.test(href)) return null;
  if (href.startsWith("/api/") || href.startsWith("/admin/navigation")) return null;
  return href;
}

export function navigationIcon(value: unknown): NavigationIcon {
  const icon = String(value ?? "Zap");
  return (NAVIGATION_ICONS as readonly string[]).includes(icon) ? icon as NavigationIcon : "Zap";
}

export function navigationAudience(value: unknown): NavigationAudience {
  const audience = String(value ?? "user");
  return (NAVIGATION_AUDIENCES as readonly string[]).includes(audience) ? audience as NavigationAudience : "user";
}

export function navigationBadgeColor(value: unknown): NavigationBadgeColor {
  const color = String(value ?? "gold");
  return (NAVIGATION_BADGE_COLORS as readonly string[]).includes(color) ? color as NavigationBadgeColor : "gold";
}
