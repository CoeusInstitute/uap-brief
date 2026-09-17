-- Topic gate: classify news before score/match/brief. Lock-only claims.

alter table public.stories
  add column if not exists relevance_status text not null default 'pending'
    check (relevance_status in ('pending', 'accepted', 'rejected')),
  add column if not exists gate_attempts integer not null default 0;

create index if not exists stories_gate_claim_idx
  on public.stories (relevance_status, status, published_at desc);

-- Score was mid-claim on ungated rows; return them to the gate queue.
update public.stories
set
  status = 'pending',
  locked_at = null,
  locked_by = null,
  updated_at = now()
where status = 'processing'
  and relevance_status = 'pending';

create or replace function public.claim_gate_stories(worker_id text, max_n integer default 5)
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
    where s.relevance_status = 'pending'
      and s.status in ('pending', 'ready', 'review')
      and (s.locked_at is null or s.locked_at < now() - interval '10 minutes')
      and (s.gate_attempts < 3 or s.status in ('ready', 'review'))
    order by
      case when s.status in ('ready', 'review') then 0 else 1 end,
      s.published_at desc nulls last,
      s.created_at desc
    limit greatest(1, least(coalesce(max_n, 5), 8))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_gate_stories(text, integer) from public, anon, authenticated;
grant execute on function public.claim_gate_stories(text, integer) to service_role;

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
      s.relevance_status = 'accepted'
      and s.attempts < 3
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
      and s.relevance_status = 'accepted'
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
      and coalesce(s.last_error, '') not in ('evergreen_gate', 'off_topic')
    order by s.updated_at desc nulls last
    limit greatest(1, least(coalesce(max_n, 5), 20))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_rescore_stories(text, integer) from public, anon, authenticated;
grant execute on function public.claim_rescore_stories(text, integer) to service_role;

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
      and s.relevance_status = 'accepted'
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
    'gate-stories'
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
  for r in select jobid from cron.job where jobname = 'uap-gate-stories'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end
$jobs$;

select cron.schedule(
  'uap-gate-stories',
  '*/5 * * * *',
  $$select public.uap_scheduler_tick('gate-stories')$$
);
