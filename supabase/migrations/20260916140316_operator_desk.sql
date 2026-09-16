-- Wave 3: operator rescore claim and public methodology view.

create or replace function public.claim_rescore_stories(worker_id text, max_n integer default 5)
returns setof public.stories
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.stories
  set
    status = 'pending',
    attempts = 0,
    locked_at = null,
    locked_by = null,
    last_error = null,
    updated_at = now()
  where story_id in (
    select s.story_id
    from public.stories s
    where s.status = 'failed'
      and coalesce(s.last_error, '') is distinct from 'evergreen_gate'
    order by s.updated_at desc nulls last
    limit greatest(1, least(coalesce(max_n, 5), 20))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_rescore_stories(text, integer) from public, anon, authenticated;
grant execute on function public.claim_rescore_stories(text, integer) to service_role;

create policy "Public can read methodology versions"
  on public.methodology_versions for select to anon, authenticated
  using (true);

grant select (version, status, notes)
  on table public.methodology_versions to anon, authenticated;

create or replace view public.methodology_public
with (security_invoker = true) as
select version, status, notes
from public.methodology_versions;

revoke all on table public.methodology_public from public, anon, authenticated;
grant select on table public.methodology_public to anon, authenticated;
