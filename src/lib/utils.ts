export function safeJson(data: unknown): string {
  return JSON.stringify(data, (_, value: unknown) => (typeof value === "bigint" ? Number(value) : value));
}

export function normalizeRow(row: unknown): unknown {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = typeof value === "bigint" ? Number(value) : value;
  }
  return normalized;
}
