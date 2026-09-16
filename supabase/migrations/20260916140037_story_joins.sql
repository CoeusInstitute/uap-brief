-- Wave 2: score components on the public story, entity names, match watermark.

grant select (components, methodology_version)
  on table public.story_scores to anon, authenticated;

alter table public.stories
  add column if not exists matched_at timestamptz;

drop view if exists public.stories_public;

create view public.stories_public
with (security_invoker = true) as
select
  s.story_id,
  s.canonical_url,
  s.title,
  s.published_at,
  s.excerpt,
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

create or replace view public.story_entities_public
with (security_invoker = true) as
select
  se.story_id,
  se.entity_type,
  se.entity_id,
  coalesce(p.name, o.org_name, pod.podcast_name) as name
from public.story_entities se
join public.stories s on s.story_id = se.story_id
left join public.people p
  on se.entity_type = 'person' and p.person_id = se.entity_id
left join public.organizations o
  on se.entity_type = 'organization' and o.org_id = se.entity_id
left join public.podcasts pod
  on se.entity_type = 'podcast' and pod.podcast_id = se.entity_id
where s.status = 'ready'
  and coalesce(p.name, o.org_name, pod.podcast_name) is not null;

revoke all on table public.stories_public from public, anon, authenticated;
revoke all on table public.story_entities_public from public, anon, authenticated;
grant select on table public.stories_public to anon, authenticated;
grant select on table public.story_entities_public to anon, authenticated;
