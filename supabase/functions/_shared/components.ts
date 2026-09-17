import { UAP_TERMS } from "./uap-terms.ts";
import {
  COORDINATION,
  EVIDENCE,
  NOVELTY,
  OFFICIAL,
  REHASH,
  SENSATIONAL,
  THIN,
  WOO_MARKERS,
  countHits,
  scoreFromHits,
} from "./lexicon.ts";
import type { MixComponents } from "./score-mix.ts";

export type ModelSignals = {
  novelty?: number;
  rehash?: number;
  narrative_coordination?: number;
  evidence_gap?: number;
};

export type ComponentHints = {
  corroboration: number;
  clusterSize?: number;
  signals?: ModelSignals;
};

export function deterministicComponents(title: string, excerpt: string, hints: ComponentHints): MixComponents {
  const text = `${title}\n${excerpt}`;
  const evidence_chain = scoreFromHits(countHits(text, EVIDENCE));
  const official_record = scoreFromHits(countHits(text, OFFICIAL), 3);
  const sensational = scoreFromHits(countHits(text, SENSATIONAL), 3);
  const wooLex = scoreFromHits(countHits(text, WOO_MARKERS), 4);
  const language_markers = clamp(0.65 * sensational + 0.35 * wooLex);

  const coordLex = scoreFromHits(countHits(text, COORDINATION), 3);
  const corroboration = clamp(hints.corroboration);
  const cluster = Math.max(1, hints.clusterSize ?? 1);
  const recapLex = scoreFromHits(countHits(text, REHASH), 3);
  const clusterRehash = cluster >= 4 ? 8 : cluster >= 3 ? 5 : cluster === 2 ? 2 : 0;
  const rehashCode = Math.max(recapLex, clusterRehash);

  const noveltyLex = scoreFromHits(countHits(text, NOVELTY), 3);
  const uapHit = UAP_TERMS.some((term) => text.toLowerCase().includes(term));
  let noveltyCode = uapHit ? Math.max(noveltyLex, 3) : Math.min(3, noveltyLex);
  noveltyCode = clamp(noveltyCode - 0.7 * rehashCode);
  if (!uapHit) noveltyCode = Math.min(noveltyCode, 3);

  const thin = scoreFromHits(countHits(text, THIN), 3);
  const evidenceGapCode = clamp(0.55 * (10 - evidence_chain) + 0.35 * thin - 0.25 * official_record);

  const coordCode = Math.max(coordLex, corroboration >= 7.5 && coordLex >= 2 ? 7 : 0);
  const signals = hints.signals ?? {};

  return {
    evidence_chain,
    corroboration,
    official_record,
    language_markers,
    narrative_coordination: takeMax(coordCode, signals.narrative_coordination),
    rehash: takeMax(rehashCode, signals.rehash),
    evidence_gap: blend(evidenceGapCode, signals.evidence_gap, 0.4),
    novelty: blend(noveltyCode, signals.novelty, 0.4),
  };
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, value));
}

function takeMax(code: number, model: number | undefined): number {
  if (model == null || !Number.isFinite(model)) return clamp(code);
  return Math.max(clamp(code), clamp(model));
}

function blend(code: number, model: number | undefined, modelWeight: number): number {
  if (model == null || !Number.isFinite(model)) return clamp(code);
  return clamp((1 - modelWeight) * code + modelWeight * clamp(model));
}
