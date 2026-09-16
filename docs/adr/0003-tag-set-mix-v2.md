# ADR 0003: Tag set mix_v2 and assessment poles

- Status: accepted
- Date: 2026-09-16
- Deciders: owner instruction to drop `NONSENSE` and `POTENTIAL` and pair caution with substance on the feed

## Context

`mix_v1` scored eight tags and the feed showed the top chips at intensity ≥ 4. Those chips hid the tension the desk needs: why to slow down versus why to keep reading. `NONSENSE` overlapped `WOO`. `POTENTIAL` overlapped `INTERESTING`. ADR 0002 remains the historical eight-tag mix.

## Decision

Adopt `mix_v2` / prompt `score_v2` as the live methodology.

- Score the material, not the person.
- Live tags: `PSYOP`, `WOO`, `INTERESTING`, `LACKING_DATA`, `VETTED`, `CREDIBLE`. Intensity 0–10 in half-point steps.
- Feed and story lead show one **assessment line**: highest caution tag (`PSYOP`, `WOO`, `LACKING_DATA`) paired with highest substance tag (`VETTED`, `CREDIBLE`, `INTERESTING`). Ties: `PSYOP > WOO > LACKING_DATA` and `VETTED > CREDIBLE > INTERESTING`.
- Retired tags `NONSENSE` and `POTENTIAL` are not scored. Incoherent or unfalsifiable mystical claims raise `WOO`. Uncheckable material raises `LACKING_DATA`. A checkable lead raises `INTERESTING` and may raise `CREDIBLE`. Do not invent a replacement tag.
- Keeper mix formulas are unchanged from `mix_v1`.
- Review before `ready` when `PSYOP >= 7`, `WOO >= 8`, `VETTED >= 7`, or `CREDIBLE >= 7`.
- Model: OpenRouter `deepseek/deepseek-v4.1-flash`, `reasoning.effort` `high`. Do not send `temperature`.
- A score is invalid without stored rationale, components, methodology version, prompt version, and model.
- No mass rescore. Existing keeper scores stay. `score-stories` deletes retired tag rows when it upserts a story.

## Consequences

- Changing a keeper weight is a new methodology version.
- Adding a tag still needs a new ADR.
- Historical `mix_v1` rows and retired `story_scores` may remain until a story is rescored.

## Changelog

- 2026-09-16: Accepted. Live tag set is six tags. Feed uses the assessment line.
