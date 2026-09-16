-- Claim the newest pending stories first so the public feed is not filled with evergreen pages.

create or replace function public.claim_pending_stories(worker_id text, max_n integer default 5)
returns setof public.stories
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.stories
  set
    status = 'processing',
    attempts = stories.attempts + 1,
    locked_at = now(),
    locked_by = worker_id,
    updated_at = now()
  where story_id in (
    select s.story_id
    from public.stories s
    where
      s.attempts < 3
      and (
        s.status = 'pending'
        or (s.status = 'processing' and s.locked_at < now() - interval '10 minutes')
      )
    order by s.published_at desc nulls last, s.created_at desc
    limit greatest(1, least(coalesce(max_n, 5), 20))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_pending_stories(text, integer) from public, anon, authenticated;
grant execute on function public.claim_pending_stories(text, integer) to service_role;
