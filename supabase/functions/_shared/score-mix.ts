export const TAGS = [
  "PSYOP",
  "WOO",
  "INTERESTING",
  "LACKING_DATA",
  "VETTED",
  "CREDIBLE",
] as const;

export type Tag = (typeof TAGS)[number];

export const RETIRED_TAGS = ["NONSENSE", "POTENTIAL"] as const;

export type MixComponents = {
  evidence_chain: number;
  corroboration: number;
  official_record: number;
  language_markers: number;
  narrative_coordination: number;
  rehash: number;
  evidence_gap: number;
  novelty: number;
};

export type ModelScores = Record<Tag, number>;

export const REVIEW_IF: Record<Tag, number | null> = {
  PSYOP: 7,
  WOO: 8,
  INTERESTING: null,
  LACKING_DATA: null,
  VETTED: 7,
  CREDIBLE: 7,
};

export function halfPoint(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value * 2) / 2));
}

export function mixTag(tag: Tag, model: number, c: MixComponents): number {
  const m = clamp10(model);
  switch (tag) {
    case "VETTED":
      return halfPoint(0.4 * m + 0.3 * c.evidence_chain + 0.2 * c.corroboration + 0.1 * c.official_record);
    case "CREDIBLE":
      return halfPoint(0.4 * m + 0.25 * c.evidence_chain + 0.2 * c.corroboration + 0.15 * c.official_record);
    case "PSYOP":
      return halfPoint(0.45 * m + 0.25 * c.narrative_coordination + 0.2 * c.language_markers + 0.1 * c.rehash);
    case "WOO":
      return halfPoint(0.5 * m + 0.3 * c.language_markers + 0.2 * c.evidence_gap);
    case "INTERESTING":
      return halfPoint(0.5 * m + 0.3 * c.novelty + 0.2 * c.evidence_chain);
    case "LACKING_DATA":
      return halfPoint(0.5 * m + 0.5 * c.evidence_gap);
  }
}

export function needsReview(tag: Tag, mixed: number): boolean {
  const floor = REVIEW_IF[tag];
  return floor != null && mixed >= floor;
}

function clamp10(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, value));
}

export function confidenceFrom(c: MixComponents): "high" | "medium" | "low" {
  if (c.corroboration >= 5 && c.evidence_chain >= 5) return "high";
  if (c.evidence_chain >= 3) return "medium";
  return "low";
}
