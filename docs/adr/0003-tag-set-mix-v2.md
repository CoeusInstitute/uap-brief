# ADR 0003: Tag set mix_v2 and assessment poles

- Status: accepted
- Date: 2026-09-16
- Deciders: owner instruction to drop `NONSENSE` and `POTENTIAL` and pair caution with substance on the feed

## Context

`mix_v1` scored eight tags and the feed showed the top chips at intensity ≥ 4. Those chips hid the tension the desk needs: why to slow down versus why to keep reading. `NONSENSE` overlapped `WOO`. `POTENTIAL` overlapped `INTERESTING`. ADR 0002 remains the historical eight-tag mix.

## Decision

Adopt `mix_v2` with live prompt `score_v3`.

- Score the material, not the person.
- Live tags: `PSYOP`, `WOO`, `INTERESTING`, `LACKING_DATA`, `VETTED`, `CREDIBLE`. Intensity 0–10 in half-point steps.
- Feed and story lead show one **assessment line**: highest caution tag (`PSYOP`, `WOO`, `LACKING_DATA`) paired with highest substance tag (`VETTED`, `CREDIBLE`, `INTERESTING`). Ties: `PSYOP > WOO > LACKING_DATA` and `VETTED > CREDIBLE > INTERESTING`. `LACKING_DATA` is residual on the line: `PSYOP`/`WOO` must be ≥ 4 and not more than 1.0 behind `LACKING_DATA`.
- `LACKING_DATA` and `INTERESTING` are residual on their poles. `PSYOP` is influence-function (perception management, limited hangout, coordinated leak, official disclosure theater), not disbelief or clickbait. Incoherent or unfalsifiable mystical claims raise `WOO`. Uncheckable material raises `LACKING_DATA`. A checkable lead raises `CREDIBLE` and may raise `VETTED`; `INTERESTING` only when the lead is novel. Do not invent a replacement tag.
- Retired tags `NONSENSE` and `POTENTIAL` are not scored.
- Keeper mix formulas are unchanged from `mix_v1`.
- Review before `ready` when `PSYOP >= 7`, `WOO >= 8`, `VETTED >= 7`, or `CREDIBLE >= 7`.
- Model: OpenRouter `deepseek/deepseek-v4.1-flash`, `reasoning.effort` `high`. Do not send `temperature`.
- A score is invalid without stored rationale, components, methodology version, prompt version, and model.
- `score-stories` deletes retired tag rows when it upserts a story.
- Owner 2026-09-16 authorized in-place rescore of Ready/review rows onto `score_v3` via `claim_rescore_prompt` (status stays public until the new scores write).

## Consequences

- Changing a keeper weight is a new methodology version.
- Adding a tag still needs a new ADR.
- Historical `mix_v1` rows and retired `story_scores` may remain until a story is rescored.

## Changelog

- 2026-09-16: Prompt `score_v3`. Novelty/rehash/narrative_coordination are computed (lexicon + cluster coverage + optional model signals). Owner authorized in-place Ready rescore. Mix weights unchanged. Assessment line treats `LACKING_DATA` as residual (must lead PSYOP/WOO by more than 1.0).
- 2026-09-16: Accepted. Live tag set is six tags. Feed uses the assessment line.
