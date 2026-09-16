-- Activate mix_v2 (ADR 0003). Keeper formulas unchanged. Public stats hide retired tags.

insert into public.methodology_versions (version, status, weights, notes)
values (
  'mix_v2',
  'active',
  '{
    "prompt_version": "score_v2",
    "model": "deepseek/deepseek-v4.1-flash",
    "poles": {
      "caution": ["PSYOP", "WOO", "LACKING_DATA"],
      "substance": ["VETTED", "CREDIBLE", "INTERESTING"]
    },
    "retired": ["NONSENSE", "POTENTIAL"],
    "review": {
      "PSYOP": 7,
      "WOO": 8,
      "VETTED": 7,
      "CREDIBLE": 7
    },
    "VETTED": "0.40*model + 0.30*evidence_chain + 0.20*corroboration + 0.10*official_record",
    "CREDIBLE": "0.40*model + 0.25*evidence_chain + 0.20*corroboration + 0.15*official_record",
    "PSYOP": "0.45*model + 0.25*narrative_coordination + 0.20*language_markers + 0.10*rehash",
    "WOO": "0.50*model + 0.30*language_markers + 0.20*evidence_gap",
    "INTERESTING": "0.50*model + 0.30*novelty + 0.20*evidence_chain",
    "LACKING_DATA": "0.50*model + 0.50*evidence_gap"
  }'::jsonb,
  'Accepted 2026-09-16. ADR 0003. Six live tags. Feed pairs caution with substance. Keeper formulas unchanged from mix_v1.'
)
on conflict (version) do update
set
  status = excluded.status,
  weights = excluded.weights,
  notes = excluded.notes;

update public.methodology_versions
set status = 'retired'
where version <> 'mix_v2'
  and status = 'active';

create or replace view public.tag_stats
with (security_invoker = true) as
select sc.tag, count(*)::integer as n, avg(sc.score) as avg_score
from public.story_scores sc
join public.stories s on s.story_id = sc.story_id
where s.status = 'ready'
  and sc.score >= 4
  and sc.tag in ('PSYOP', 'WOO', 'INTERESTING', 'LACKING_DATA', 'VETTED', 'CREDIBLE')
group by sc.tag;

create or replace view public.tag_trends
with (security_invoker = true) as
select date_trunc('week', s.published_at) as week, sc.tag, count(*)::integer as n
from public.story_scores sc
join public.stories s on s.story_id = sc.story_id
where s.status = 'ready'
  and sc.tag in ('PSYOP', 'WOO', 'INTERESTING', 'LACKING_DATA', 'VETTED', 'CREDIBLE')
group by 1, 2;
