-- Feed briefs: model-written 2-5 sentence summary and a stored og:image per story.

alter table public.stories
  add column if not exists summary text,
  add column if not exists image_url text,
  add column if not exists image_status text not null default 'pending'
    check (image_status in ('pending', 'stored', 'placeholder'));

grant select (summary, image_url, image_status)
  on table public.stories to anon, authenticated;

drop view if exists public.stories_public;

create view public.stories_public
with (security_invoker = true) as
select
  s.story_id,
  s.canonical_url,
  s.title,
  s.published_at,
  s.excerpt,
  s.summary,
  s.image_url,
  s.image_status,
  s.form,
  src.name as source_name,
  src.homepage_url,
  s.cluster_id,
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'tag', sc.tag,
          'score', sc.score,
          'confidence', sc.confidence,
          'rationale', sc.rationale,
          'components', sc.components,
          'methodology_version', sc.methodology_version
        )
        order by sc.tag
      ),
      '[]'::jsonb
    )
    from public.story_scores sc
    where sc.story_id = s.story_id
  ) as scores,
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'entity_type', se.entity_type,
          'entity_id', se.entity_id,
          'name', coalesce(p.name, o.org_name, pod.podcast_name)
        )
        order by se.entity_type, coalesce(p.name, o.org_name, pod.podcast_name)
      ),
      '[]'::jsonb
    )
    from public.story_entities se
    left join public.people p
      on se.entity_type = 'person' and p.person_id = se.entity_id
    left join public.organizations o
      on se.entity_type = 'organization' and o.org_id = se.entity_id
    left join public.podcasts pod
      on se.entity_type = 'podcast' and pod.podcast_id = se.entity_id
    where se.story_id = s.story_id
      and coalesce(p.name, o.org_name, pod.podcast_name) is not null
  ) as entities
from public.stories s
join public.sources src on src.source_id = s.source_id
where s.status = 'ready';

revoke all on table public.stories_public from public, anon, authenticated;
grant select on table public.stories_public to anon, authenticated;

-- Public bucket for stored story images (Edge Functions write with service role).
insert into storage.buckets (id, name, public)
values ('story-images', 'story-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read story images" on storage.objects;
create policy "Public read story images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'story-images');

-- Ready stories that still lack a brief or an image are picked up by score-stories.
create or replace function public.claim_brief_backfill(worker_id text, max_n integer default 4)
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
    where s.status = 'ready'
      and (s.summary is null or s.image_status = 'pending')
      and (s.locked_at is null or s.locked_at < now() - interval '20 minutes')
    order by s.published_at desc nulls last
    limit greatest(1, least(coalesce(max_n, 4), 20))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_brief_backfill(text, integer) from public, anon, authenticated;
grant execute on function public.claim_brief_backfill(text, integer) to service_role;
