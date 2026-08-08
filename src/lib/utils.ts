export function safeJson(data: any) {
  return JSON.stringify(data, (_, value) => (typeof value === "bigint" ? Number(value) : value));
}

export function normalizeRow(row: any) {
  if (!row) return row;
  const normalized: any = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = typeof value === "bigint" ? Number(value) : value;
  }
  return normalized;
}
