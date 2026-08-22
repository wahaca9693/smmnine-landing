export type CatalogPlatform = {
  id: string;
  label_ar: string;
  label_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  service_ids: string[];
  is_active: boolean;
  sort_order: number;
};

export function cleanPlatformText(value: unknown, maxLength: number): string {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

export function safePlatformLogo(value: unknown): string | null {
  const logo = cleanPlatformText(value, 500);
  if (!logo) return null;
  if (logo.startsWith("/")) return logo;
  try {
    const url = new URL(logo);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parsePlatformServiceIds(value: unknown): string[] {
  const source = Array.isArray(value) ? value : (() => {
    try {
      const parsed = JSON.parse(String(value || "[]"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  return [...new Set(source
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry && entry.length <= 160 && !entry.startsWith("provider:"))
  )].slice(0, 20_000);
}

export function platformSlug(value: unknown): string {
  const base = cleanPlatformText(value, 60)
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45);
  return base || "platform";
}

export function publicCatalogPlatform(row: Record<string, unknown>): CatalogPlatform {
  return {
    id: `catalog-${Number(row.id)}`,
    label_ar: cleanPlatformText(row.label_ar, 80),
    label_en: row.label_en ? cleanPlatformText(row.label_en, 80) : null,
    description_ar: row.description_ar ? cleanPlatformText(row.description_ar, 160) : null,
    description_en: row.description_en ? cleanPlatformText(row.description_en, 160) : null,
    logo_url: safePlatformLogo(row.logo_url),
    service_ids: parsePlatformServiceIds(row.service_ids),
    is_active: Number(row.is_active) === 1,
    sort_order: Number(row.sort_order) || 0,
  };
}
