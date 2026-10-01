-- One sitewide feed (Fox, Euronews, and similar) was occupying every gate
-- slot because claim ordered by published_at alone. Take the newest pending
-- story from each source, then the sources that have waited longest.

create or replace function public.claim_gate_stories(worker_id text, max_n integer default 5)
returns setof public.stories
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with newest as (
    select distinct on (s.source_id)
      s.story_id,
      s.source_id,
      s.status,
      s.published_at,
      s.created_at
    from public.stories s
    where s.relevance_status = 'pending'
      and s.status in ('pending', 'ready', 'review')
      and (s.locked_at is null or s.locked_at < now() - interval '10 minutes')
      and (s.gate_attempts < 3 or s.status in ('ready', 'review'))
    order by s.source_id, s.published_at desc nulls last, s.created_at desc
  ),
  ranked as (
    select n.story_id
    from newest n
    left join (
      select source_id, max(updated_at) as last_gated
      from public.stories
      where relevance_status <> 'pending'
      group by source_id
    ) g on g.source_id = n.source_id
    order by
      case when n.status in ('ready', 'review') then 0 else 1 end,
      g.last_gated asc nulls first,
      n.published_at desc nulls last,
      n.created_at desc
    limit greatest(1, least(coalesce(max_n, 5), 8))
  ),
  locked as (
    select s.story_id
    from public.stories s
    join ranked r on r.story_id = s.story_id
    for update of s skip locked
  )
  update public.stories
  set
    locked_at = now(),
    locked_by = worker_id,
    updated_at = now()
  where story_id in (select story_id from locked)
  returning *;
end;
$$;

revoke all on function public.claim_gate_stories(text, integer) from public, anon, authenticated;
grant execute on function public.claim_gate_stories(text, integer) to service_role;
