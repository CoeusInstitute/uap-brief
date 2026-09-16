export function words(value?: string | null): string | undefined {
  return value ? value.replaceAll("_", " ") : undefined;
}

export function displayWords(value?: string | null, fallback = "unknown"): string {
  return words(value) ?? fallback;
}

export function shortDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function decadeOf(date?: string | null): string {
  const year = Number((date ?? "").slice(0, 4));
  if (!Number.isFinite(year) || year < 1000) return "undated";
  return `${Math.floor(year / 10) * 10}s`;
}

export function tierLabel(tier?: string | null): string {
  if (tier === "1_core") return "core";
  if (tier === "2_major") return "major";
  if (tier === "3_notable") return "notable";
  return tier ? words(tier) ?? "untiered" : "untiered";
}
