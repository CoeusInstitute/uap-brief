export const SENSATIONAL = [
  "bombshell",
  "shocking",
  "secret space program",
  "ancient aliens",
  "starseed",
  "galactic federation",
  "reptilian",
  "disclosure now",
  "they don't want you to know",
  "cover-up exposed",
];

export const EVIDENCE = [
  "document",
  "declassified",
  "foia",
  "hearing",
  "transcript",
  "photograph",
  "radar",
  "sensor",
  "footage",
  "report",
  "affidavit",
];

export const OFFICIAL = [
  "congress",
  "house",
  "senate",
  "dod",
  "aaro",
  "gao",
  "nasa",
  "odni",
  "pentagon",
  "navy",
  "air force",
];

export function countHits(text: string, terms: string[]): number {
  const hay = text.toLowerCase();
  return terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
}

export function scoreFromHits(hits: number, cap = 4): number {
  return Math.min(10, hits * (10 / cap));
}
