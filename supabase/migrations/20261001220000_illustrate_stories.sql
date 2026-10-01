-- Illustrations for Ready stories that have no source image.
-- image_status stays pending | stored | placeholder. Origin says who made the file.

alter table public.stories
  add column if not exists image_origin text
    check (image_origin is null or image_origin in ('fetched', 'generated')),
  add column if not exists illustrate_attempts integer not null default 0;

grant select (image_origin) on table public.stories to anon, authenticated;

create or replace view public.stories_public
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
  ) as entities,
  s.image_origin
from public.stories s
join public.sources src on src.source_id = s.source_id
where s.status = 'ready';

revoke all on table public.stories_public from public, anon, authenticated;
grant select on table public.stories_public to anon, authenticated;

create or replace function public.claim_illustrate_stories(worker_id text, max_n integer default 2)
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
      and s.image_status = 'placeholder'
      and s.summary is not null
      and btrim(s.summary) <> ''
      and s.illustrate_attempts < 2
      and (s.locked_at is null or s.locked_at < now() - interval '20 minutes')
    order by s.published_at desc nulls last, s.created_at desc
    limit greatest(1, least(coalesce(max_n, 2), 2))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_illustrate_stories(text, integer) from public, anon, authenticated;
grant execute on function public.claim_illustrate_stories(text, integer) to service_role;

create or replace function public.uap_scheduler_tick(fn text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  job_secret text;
  allowed text[] := array[
    'ingest-news',
    'match-entities',
    'score-stories',
    'ingest-podcasts',
    'ingest-x',
    'gate-stories',
    'translate-stories',
    'enrich-dossier',
    'illustrate-stories'
  ];
begin
  if fn is null or not (fn = any (allowed)) then
    return;
  end if;

  begin
    select decrypted_secret into job_secret
    from vault.decrypted_secrets
    where name = 'uap_scheduler_secret'
    limit 1;
  exception when others then
    return;
  end;

  if job_secret is null or job_secret = '' then
    return;
  end if;

  perform net.http_post(
    url := 'https://agrijbcilmymfsnkdpoh.supabase.co/functions/v1/' || fn,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-uap-scheduler-secret', job_secret
    ),
    timeout_milliseconds := 150000
  );
end;
$$;

revoke all on function public.uap_scheduler_tick(text) from public, anon, authenticated;
grant execute on function public.uap_scheduler_tick(text) to service_role;

do $jobs$
declare r record;
begin
  for r in select jobid from cron.job where jobname = 'uap-illustrate-stories'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end
$jobs$;

select cron.schedule(
  'uap-illustrate-stories',
  '*/15 * * * *',
  $$select public.uap_scheduler_tick('illustrate-stories')$$
);
