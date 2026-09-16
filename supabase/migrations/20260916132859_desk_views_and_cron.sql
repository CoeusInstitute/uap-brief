-- Public desk rails for stored episodes and X posts, plus hosted cron ticks.

create or replace view public.episodes_public
with (security_invoker = true) as
select
  e.episode_id,
  e.podcast_id,
  p.podcast_name,
  e.title,
  e.pub_date,
  e.url,
  e.guests
from public.episodes e
join public.podcasts p on p.podcast_id = e.podcast_id;

create or replace view public.x_posts_public
with (security_invoker = true) as
select post_id, handle, person_id, posted_at, url, text
from public.x_posts;

create policy "Public can read episodes"
  on public.episodes for select to anon, authenticated
  using (true);

create policy "Public can read x posts"
  on public.x_posts for select to anon, authenticated
  using (true);

grant select (episode_id, podcast_id, title, pub_date, url, guests)
  on table public.episodes to anon, authenticated;

grant select (post_id, handle, person_id, posted_at, url, text)
  on table public.x_posts to anon, authenticated;

grant select on table public.episodes_public to anon, authenticated;
grant select on table public.x_posts_public to anon, authenticated;

create extension if not exists pg_cron;
create extension if not exists pg_net;

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
    'ingest-x'
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
declare
  r record;
begin
  for r in select jobid from cron.job where jobname like 'uap-%'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end
$jobs$;

select cron.schedule('uap-ingest-news', '5 */2 * * *', $$select public.uap_scheduler_tick('ingest-news')$$);
select cron.schedule('uap-match-entities', '20 */2 * * *', $$select public.uap_scheduler_tick('match-entities')$$);
select cron.schedule('uap-score-stories', '*/15 * * * *', $$select public.uap_scheduler_tick('score-stories')$$);
select cron.schedule('uap-ingest-podcasts', '10 */6 * * *', $$select public.uap_scheduler_tick('ingest-podcasts')$$);
select cron.schedule('uap-ingest-x', '40 * * * *', $$select public.uap_scheduler_tick('ingest-x')$$);
