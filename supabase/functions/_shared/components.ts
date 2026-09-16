import { countHits, EVIDENCE, OFFICIAL, scoreFromHits, SENSATIONAL } from "./lexicon.ts";
import type { MixComponents } from "./score-mix.ts";

export function deterministicComponents(title: string, excerpt: string, corroboration: number): MixComponents {
  const text = `${title}\n${excerpt}`;
  const evidence_chain = scoreFromHits(countHits(text, EVIDENCE));
  const official_record = scoreFromHits(countHits(text, OFFICIAL), 3);
  const language_markers = scoreFromHits(countHits(text, SENSATIONAL), 3);
  const rehash = 0;
  const narrative_coordination = 0;
  const evidence_gap = Math.max(0, 10 - evidence_chain);
  const novelty = 10 - rehash;
  return {
    evidence_chain,
    corroboration: Math.max(0, Math.min(10, corroboration)),
    official_record,
    language_markers,
    narrative_coordination,
    rehash,
    evidence_gap,
    novelty,
  };
}
