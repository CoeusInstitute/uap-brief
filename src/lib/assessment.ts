import { isScoreTag, type ScoreTag } from "@/lib/types";

export const CAUTION_TAGS = ["PSYOP", "WOO", "LACKING_DATA"] as const;
export const SUBSTANCE_TAGS = ["VETTED", "CREDIBLE", "INTERESTING"] as const;

const CAUTION_RANK: Record<(typeof CAUTION_TAGS)[number], number> = {
  PSYOP: 0,
  WOO: 1,
  LACKING_DATA: 2,
};

const SUBSTANCE_RANK: Record<(typeof SUBSTANCE_TAGS)[number], number> = {
  VETTED: 0,
  CREDIBLE: 1,
  INTERESTING: 2,
};

export type AssessmentPole = {
  tag: ScoreTag;
  score: number;
};

export type AssessmentPair = {
  caution: AssessmentPole;
  substance: AssessmentPole;
};

export type MarkerTone = "caution" | "substance" | "tie";

const TAG_LABEL: Record<ScoreTag, string> = {
  PSYOP: "PSYOP",
  WOO: "Woo",
  LACKING_DATA: "Lacking data",
  CREDIBLE: "Credible",
  INTERESTING: "Interesting",
  VETTED: "Vetted",
};

export function tagLabel(tag: ScoreTag): string {
  return TAG_LABEL[tag];
}

export function formatAssessmentScore(score: number): string {
  const value = Math.min(Math.max(Number(score) || 0, 0), 10);
  return value.toFixed(1);
}

export function assessmentPercent(caution: number, substance: number): number {
  const left = clamp10(caution);
  const right = clamp10(substance);
  return 50 + ((right - left) / 10) * 46;
}

export function markerTone(caution: number, substance: number): MarkerTone {
  if (Math.abs(substance - caution) < 1) return "tie";
  return substance > caution ? "substance" : "caution";
}

export function storyAssessment(story: {
  scores?: { tag: string; score?: number | null }[];
}): AssessmentPair | null {
  const scores = new Map<ScoreTag, number>();
  for (const row of story.scores ?? []) {
    if (!isScoreTag(row.tag)) continue;
    const value = typeof row.score === "number" && Number.isFinite(row.score) ? row.score : null;
    if (value == null) continue;
    scores.set(row.tag, value);
  }
  if (scores.size === 0) return null;
  return {
    caution: pickPole(CAUTION_TAGS, scores, CAUTION_RANK),
    substance: pickPole(SUBSTANCE_TAGS, scores, SUBSTANCE_RANK),
  };
}

function pickPole<T extends ScoreTag>(
  tags: readonly T[],
  scores: Map<ScoreTag, number>,
  rank: Record<T, number>,
): AssessmentPole {
  let best = tags[0];
  let bestScore = scores.get(best) ?? 0;
  for (const tag of tags.slice(1)) {
    const score = scores.get(tag) ?? 0;
    if (score > bestScore || (score === bestScore && rank[tag] < rank[best])) {
      best = tag;
      bestScore = score;
    }
  }
  return { tag: best, score: bestScore };
}

function clamp10(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, value));
}
