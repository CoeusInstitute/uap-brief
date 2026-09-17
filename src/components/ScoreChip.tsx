import { tagLabel } from "@/lib/assessment";
import type { ScoreTag } from "@/lib/types";

export function formatScore(score: number): string {
  const rounded = Math.round(score * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function ScoreChip({ tag, score }: { tag: ScoreTag; score?: number }) {
  const name = tagLabel(tag);
  const label = score === undefined ? name : `${name} ${formatScore(score)}`;
  return (
    <span className="g-badge g-badge--pill">
      <span className="g-mono">{label}</span>
    </span>
  );
}
