# ADR 0002: Scoring methodology mix_v1

- Status: superseded
- Date: 2026-09-16
- Deciders: owner instruction to start P2/P3/P6; formulas from `SYSTEM_BRIEF.md` §5
- Superseded by: [0003-tag-set-mix-v2.md](0003-tag-set-mix-v2.md)

## Context

P3 scoring was blocked until a methodology ADR existed. The intended-system brief already specified the tag set, hybrid mix, review thresholds, and model. The owner unblocked the pipeline on 2026-09-16.

## Decision

Adopt `mix_v1` / prompt `score_v1` as the first active methodology.

- Score the material, not the person.
- Tags: `PSYOP`, `WOO`, `NONSENSE`, `INTERESTING`, `POTENTIAL`, `LACKING_DATA`, `VETTED`, `CREDIBLE`. Intensity 0–10 in half-point steps.
- Do not add `DEBUNKED`, `SENSATIONAL`, or `UNSUPPORTED` in this version.
- Model: OpenRouter `deepseek/deepseek-v4.1-flash`, `reasoning.effort` `high`. Do not send `temperature`.
- A score is invalid without stored rationale, components, methodology version, prompt version, and model.
- Mixture (model and components are 0–10):

| Tag | Formula |
|---|---|
| `VETTED` | `0.40*model + 0.30*evidence_chain + 0.20*corroboration + 0.10*official_record` |
| `CREDIBLE` | `0.40*model + 0.25*evidence_chain + 0.20*corroboration + 0.15*official_record` |
| `PSYOP` | `0.45*model + 0.25*narrative_coordination + 0.20*language_markers + 0.10*rehash` |
| `WOO` | `0.50*model + 0.30*language_markers + 0.20*evidence_gap` |
| `NONSENSE` | `0.55*model + 0.25*language_markers + 0.20*evidence_gap` |
| `POTENTIAL` | `0.50*model + 0.30*evidence_chain + 0.20*novelty` |
| `INTERESTING` | `0.50*model + 0.30*novelty + 0.20*evidence_chain` |
| `LACKING_DATA` | `0.50*model + 0.50*evidence_gap` |

- Review before `ready` when `PSYOP >= 7`, `WOO >= 8`, `NONSENSE >= 8`, `VETTED >= 7`, or `CREDIBLE >= 7`.
- Language reads “assessed as”, never “proven”.

## Consequences

- Scoring Edge Function code may land.
- Proposed extra tags still need a new ADR.
- Changing a weight is a methodology version bump.

## Changelog

- 2026-09-16: Review routing is floors only. The “model vs mix differs by more than 3” rule is dropped. Mix formulas and `mix_v1` row versions are unchanged.
- 2026-09-16: Superseded by ADR 0003 (`mix_v2`). Keeper formulas are unchanged; `NONSENSE` and `POTENTIAL` leave the live set.
