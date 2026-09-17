-- In-place rescore for score_v3. Keeps ready/review visible on the feed.

create or replace function public.claim_rescore_prompt(
  worker_id text,
  max_n integer default 5,
  want_prompt text default 'score_v3'
)
returns setof public.stories
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.stories
  set
    locked_at = now(),
    locked_by = worker_id,
    updated_at = now()
  where story_id in (
    select s.story_id
    from public.stories s
    where s.status in ('ready', 'review')
      and (
        s.locked_at is null
        or s.locked_at < now() - interval '10 minutes'
      )
      and exists (
        select 1
        from public.story_scores sc
        where sc.story_id = s.story_id
      )
      and not exists (
        select 1
        from public.story_scores sc
        where sc.story_id = s.story_id
          and sc.prompt_version = want_prompt
          and sc.tag = 'PSYOP'
      )
    order by s.published_at desc nulls last, s.created_at desc
    limit greatest(1, least(coalesce(max_n, 5), 20))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_rescore_prompt(text, integer, text) from public, anon, authenticated;
grant execute on function public.claim_rescore_prompt(text, integer, text) to service_role;

update public.methodology_versions
set
  weights = jsonb_set(coalesce(weights, '{}'::jsonb), '{prompt_version}', '"score_v3"'),
  notes = 'mix_v2 formulas unchanged. Prompt score_v3 (2026-09-16): residual LACKING_DATA/INTERESTING, PSYOP is influence-function not disbelief, novelty/rehash/coordination are computed. Owner authorized in-place rescore of Ready rows.'
where version = 'mix_v2';
