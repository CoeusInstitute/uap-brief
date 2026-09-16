-- Wave 1 honesty: SELECT-only public views, tag_stats floor, evergreen fail,
-- floors-only review reclassify, service_role review_decide.

create or replace view public.tag_stats
with (security_invoker = true) as
select sc.tag, count(*)::integer as n, avg(sc.score) as avg_score
from public.story_scores sc
join public.stories s on s.story_id = sc.story_id
where s.status = 'ready' and sc.score >= 4
group by sc.tag;

revoke all on table public.people_public from public, anon, authenticated;
revoke all on table public.podcasts_public from public, anon, authenticated;
revoke all on table public.organizations_public from public, anon, authenticated;
revoke all on table public.timeline_public from public, anon, authenticated;
revoke all on table public.appearances_public from public, anon, authenticated;
revoke all on table public.stories_public from public, anon, authenticated;
revoke all on table public.story_scores_public from public, anon, authenticated;
revoke all on table public.graph_edges from public, anon, authenticated;
revoke all on table public.tag_stats from public, anon, authenticated;
revoke all on table public.tag_trends from public, anon, authenticated;
revoke all on table public.source_stats from public, anon, authenticated;
revoke all on table public.entity_stats from public, anon, authenticated;
revoke all on table public.episodes_public from public, anon, authenticated;
revoke all on table public.x_posts_public from public, anon, authenticated;

grant select on table public.people_public to anon, authenticated;
grant select on table public.podcasts_public to anon, authenticated;
grant select on table public.organizations_public to anon, authenticated;
grant select on table public.timeline_public to anon, authenticated;
grant select on table public.appearances_public to anon, authenticated;
grant select on table public.stories_public to anon, authenticated;
grant select on table public.story_scores_public to anon, authenticated;
grant select on table public.graph_edges to anon, authenticated;
grant select on table public.tag_stats to anon, authenticated;
grant select on table public.tag_trends to anon, authenticated;
grant select on table public.source_stats to anon, authenticated;
grant select on table public.entity_stats to anon, authenticated;
grant select on table public.episodes_public to anon, authenticated;
grant select on table public.x_posts_public to anon, authenticated;

update public.methodology_versions
set
  weights = jsonb_set(
    weights,
    '{review}',
    '{
      "PSYOP": 7,
      "WOO": 8,
      "NONSENSE": 8,
      "VETTED": 7,
      "CREDIBLE": 7
    }'::jsonb
  ),
  notes = 'Accepted 2026-09-16. ADR 0002. Review floors only as of 2026-09-16. Formulas from SYSTEM_BRIEF section 5.'
where version = 'mix_v1';

update public.stories
set
  status = 'failed',
  last_error = 'evergreen_gate',
  locked_at = null,
  locked_by = null,
  updated_at = now()
where status in ('ready', 'review', 'pending')
  and (
    title ~ '^(About Our|About our|About FOIA)'
    or canonical_url ~* '/(about|contact|privacy|terms)(/|$)'
  );

update public.stories s
set
  status = 'ready',
  last_error = null,
  locked_at = null,
  locked_by = null,
  updated_at = now()
where s.status = 'review'
  and not exists (
    select 1
    from public.story_scores sc
    where sc.story_id = s.story_id
      and (
        (sc.tag = 'PSYOP' and sc.score >= 7)
        or (sc.tag = 'WOO' and sc.score >= 8)
        or (sc.tag = 'NONSENSE' and sc.score >= 8)
        or (sc.tag = 'VETTED' and sc.score >= 7)
        or (sc.tag = 'CREDIBLE' and sc.score >= 7)
      )
  );

update public.review_queue q
set
  status = 'rejected',
  notes = 'floors_only_rule',
  decided_at = now()
where q.status = 'open'
  and (
    q.reason in ('INTERESTING', 'POTENTIAL', 'LACKING_DATA')
    or (
      q.reason in ('PSYOP', 'WOO', 'NONSENSE', 'VETTED', 'CREDIBLE')
      and not exists (
        select 1
        from public.story_scores sc
        where sc.story_id::text = q.item_id
          and sc.tag = q.reason
          and (
            (q.reason = 'PSYOP' and sc.score >= 7)
            or (q.reason = 'WOO' and sc.score >= 8)
            or (q.reason = 'NONSENSE' and sc.score >= 8)
            or (q.reason = 'VETTED' and sc.score >= 7)
            or (q.reason = 'CREDIBLE' and sc.score >= 7)
          )
      )
    )
  );

create or replace function public.review_decide(
  item_id uuid,
  action text,
  reviewer text,
  notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if action is null or action not in ('approve', 'reject') then
    raise exception 'review_decide action must be approve or reject';
  end if;

  if action = 'approve' then
    update public.stories
    set
      status = 'ready',
      last_error = null,
      locked_at = null,
      locked_by = null,
      updated_at = now()
    where story_id = item_id;

    update public.review_queue
    set
      status = 'approved',
      reviewer = review_decide.reviewer,
      notes = review_decide.notes,
      decided_at = now()
    where item_type = 'story'
      and review_queue.item_id = review_decide.item_id::text
      and status = 'open';
  else
    update public.stories
    set
      status = 'failed',
      last_error = coalesce(nullif(review_decide.notes, ''), 'review_rejected'),
      locked_at = null,
      locked_by = null,
      updated_at = now()
    where story_id = item_id;

    update public.review_queue
    set
      status = 'rejected',
      reviewer = review_decide.reviewer,
      notes = review_decide.notes,
      decided_at = now()
    where item_type = 'story'
      and review_queue.item_id = review_decide.item_id::text
      and status = 'open';
  end if;
end;
$$;

revoke all on function public.review_decide(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.review_decide(uuid, text, text, text) to service_role;
