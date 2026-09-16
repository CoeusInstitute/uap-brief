-- P2/P3: activate mix_v1 and keep open entity-match candidates unique per source row.

insert into public.methodology_versions (version, status, weights, notes)
values (
  'mix_v1',
  'active',
  '{
    "prompt_version": "score_v1",
    "model": "deepseek/deepseek-v4.1-flash",
    "review": {
      "PSYOP": 7,
      "WOO": 8,
      "NONSENSE": 8,
      "VETTED": 7,
      "CREDIBLE": 7,
      "model_delta": 3
    },
    "VETTED": "0.40*model + 0.30*evidence_chain + 0.20*corroboration + 0.10*official_record",
    "CREDIBLE": "0.40*model + 0.25*evidence_chain + 0.20*corroboration + 0.15*official_record",
    "PSYOP": "0.45*model + 0.25*narrative_coordination + 0.20*language_markers + 0.10*rehash",
    "WOO": "0.50*model + 0.30*language_markers + 0.20*evidence_gap",
    "NONSENSE": "0.55*model + 0.25*language_markers + 0.20*evidence_gap",
    "POTENTIAL": "0.50*model + 0.30*evidence_chain + 0.20*novelty",
    "INTERESTING": "0.50*model + 0.30*novelty + 0.20*evidence_chain",
    "LACKING_DATA": "0.50*model + 0.50*evidence_gap"
  }'::jsonb,
  'Accepted 2026-09-16. ADR 0002. Formulas from SYSTEM_BRIEF section 5.'
)
on conflict (version) do update
set
  status = excluded.status,
  weights = excluded.weights,
  notes = excluded.notes;

update public.methodology_versions
set status = 'retired'
where version <> 'mix_v1'
  and status = 'active';

create unique index if not exists entity_match_candidates_open_uidx
  on public.entity_match_candidates (normalized_name, seen_in_type, seen_in_id)
  where status = 'open';
