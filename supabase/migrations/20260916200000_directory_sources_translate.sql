-- Directory sources + English translate. Timestamp after story_topic_gate.

alter table public.stories
  add column if not exists language text not null default 'und',
  add column if not exists title_original text,
  add column if not exists translation_status text not null default 'pending'
    check (translation_status in ('pending', 'original', 'translated', 'failed')),
  add column if not exists translate_attempts integer not null default 0;

create index if not exists stories_translate_claim_idx
  on public.stories (translation_status, relevance_status, status, published_at desc);

update public.stories
set language = 'en',
    translation_status = 'original'
where translation_status = 'pending';

create or replace function public.claim_translate_stories(worker_id text, max_n integer default 5)
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
    where s.relevance_status = 'accepted'
      and s.translation_status = 'pending'
      and s.status in ('pending', 'ready', 'review')
      and (s.locked_at is null or s.locked_at < now() - interval '10 minutes')
      and (s.translate_attempts < 3 or s.status in ('ready', 'review'))
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

revoke all on function public.claim_translate_stories(text, integer) from public, anon, authenticated;
grant execute on function public.claim_translate_stories(text, integer) to service_role;

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
      and s.translation_status in ('original', 'translated')
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
      and s.translation_status in ('original', 'translated')
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
      and coalesce(s.last_error, '') not in ('evergreen_gate', 'off_topic', 'translate_failed')
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
      and s.translation_status in ('original', 'translated')
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
    'gate-stories',
    'translate-stories'
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
  for r in select jobid from cron.job where jobname in ('uap-translate-stories', 'uap-ingest-news')
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end
$jobs$;

select cron.schedule(
  'uap-translate-stories',
  '*/5 * * * *',
  $$select public.uap_scheduler_tick('translate-stories')$$
);

select cron.schedule(
  'uap-ingest-news',
  '*/15 * * * *',
  $$select public.uap_scheduler_tick('ingest-news')$$
);

update public.sources set homepage_url = 'https://www.newsnationnow.com/space/ufo/', rss_url = null
  where homepage_url = 'https://www.newsnationnow.com/';
update public.sources set homepage_url = 'https://www.space.com/tag/ufos-extraterrestrials', rss_url = null
  where homepage_url = 'https://www.space.com/';
update public.sources set homepage_url = 'https://www.twz.com/category/uap', rss_url = null
  where homepage_url = 'https://www.twz.com/';
update public.sources set homepage_url = 'https://defensescoop.com/tag/uap/', rss_url = null
  where homepage_url = 'https://defensescoop.com/';
update public.sources set
    name = 'Ask a Pol UAP',
    homepage_url = 'https://www.askapoluaps.com/',
    rss_url = null
  where homepage_url = 'https://www.askapol.com/';

insert into public.sources (name, homepage_url, kind, active, fetch_policy)
values
  ('The Debrief', 'https://thedebrief.org/', 'news', true, '{"interval":"2h","directory_n":1,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Liberation Times', 'https://www.liberationtimes.com/', 'news', true, '{"interval":"2h","directory_n":2,"check":"B","language":"en","category":"specialist"}'::jsonb),
  ('The Black Vault', 'https://www.theblackvault.com/', 'news', true, '{"interval":"2h","directory_n":3,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Ask a Pol UAP', 'https://www.askapoluaps.com/', 'news', true, '{"interval":"2h","directory_n":4,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Paradigm', 'https://www.paradigm.news/', 'news', true, '{"interval":"2h","directory_n":5,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('UAP Media UK', 'https://www.uapmedia.uk/', 'news', true, '{"interval":"2h","directory_n":6,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('UAP Check', 'https://www.uapcheck.com/', 'news', true, '{"interval":"2h","directory_n":7,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('UAP News Center', 'https://uapnewscenter.com/', 'news', true, '{"interval":"2h","directory_n":8,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('The UFO Chronicles', 'https://www.theufochronicles.com/', 'news', true, '{"interval":"2h","directory_n":9,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Open Minds', 'https://openminds.tv/', 'news', true, '{"interval":"2h","directory_n":10,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Sentinel News', 'https://www.sentinel-news.org/', 'news', true, '{"interval":"2h","directory_n":11,"check":"B","language":"en","category":"specialist"}'::jsonb),
  ('Silva Record', 'https://silvarecord.com/', 'news', true, '{"interval":"2h","directory_n":12,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('UFO Joe / Joe Murgia', 'https://www.ufojoe.net/', 'news', true, '{"interval":"2h","directory_n":13,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('UFO Explorations', 'https://www.ufoexplorations.com/', 'news', true, '{"interval":"2h","directory_n":14,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Earthfiles', 'https://www.earthfiles.com/', 'news', true, '{"interval":"2h","directory_n":15,"check":"B","language":"en","category":"specialist"}'::jsonb),
  ('Unknown Country', 'https://unknowncountry.com/', 'news', true, '{"interval":"2h","directory_n":16,"check":"C","language":"en","category":"specialist"}'::jsonb),
  ('Coast to Coast AM', 'https://www.coasttocoastam.com/', 'news', true, '{"interval":"2h","directory_n":17,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Unexplained Mysteries', 'https://www.unexplained-mysteries.com/', 'news', true, '{"interval":"2h","directory_n":18,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Mysterious Universe', 'https://mysteriousuniverse.org/', 'news', true, '{"interval":"2h","directory_n":19,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('The Daily Grail', 'https://www.dailygrail.com/', 'news', true, '{"interval":"2h","directory_n":20,"check":"B","language":"en","category":"specialist"}'::jsonb),
  ('Higgypop', 'https://www.higgypop.com/', 'news', true, '{"interval":"2h","directory_n":21,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Anomalien', 'https://anomalien.com/', 'news', true, '{"interval":"2h","directory_n":22,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Latest UFO Sightings', 'https://www.latest-ufo-sightings.net/', 'news', true, '{"interval":"2h","directory_n":23,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('UFO Digest', 'https://www.ufodigest.com/', 'news', true, '{"interval":"2h","directory_n":24,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('UFO Casebook', 'https://www.ufocasebook.com/', 'news', true, '{"interval":"2h","directory_n":25,"check":"C","language":"en","category":"specialist"}'::jsonb),
  ('Fortean Times', 'https://www.forteantimes.com/', 'news', true, '{"interval":"2h","directory_n":26,"check":"C","language":"en","category":"specialist"}'::jsonb),
  ('Podcast UFO', 'https://podcastufo.com/', 'news', true, '{"interval":"2h","directory_n":27,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Trail of the Saucers', 'https://medium.com/on-the-trail-of-the-saucers', 'news', true, '{"interval":"2h","directory_n":28,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Grenzwissenschaft-Aktuell / GreWi', 'https://www.grewi.de/', 'news', true, '{"interval":"2h","directory_n":29,"check":"A","language":"de","category":"specialist"}'::jsonb),
  ('Revista UFO', 'https://ufo.com.br/', 'news', true, '{"interval":"2h","directory_n":30,"check":"A","language":"pt","category":"specialist"}'::jsonb),
  ('OVNI Hoje', 'https://www.ovnihoje.com/', 'news', true, '{"interval":"2h","directory_n":31,"check":"A","language":"pt","category":"specialist"}'::jsonb),
  ('Inexplicata', 'https://inexplicata.blogspot.com/', 'news', true, '{"interval":"2h","directory_n":32,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('The Anomalist', 'https://www.anomalist.com/', 'news', true, '{"interval":"2h","directory_n":33,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('WEAPONIZED', 'https://www.weaponizedpodcast.com/', 'news', true, '{"interval":"2h","directory_n":34,"check":"B","language":"en","category":"specialist"}'::jsonb),
  ('Above the Norm News', 'https://www.abovethenormnews.com/', 'news', true, '{"interval":"2h","directory_n":35,"check":"A","language":"en","category":"specialist"}'::jsonb),
  ('Mystery Wire', 'https://www.mysterywire.com/', 'news', true, '{"interval":"2h","directory_n":36,"check":"C","language":"en","category":"specialist"}'::jsonb),
  ('The UFO Trail', 'https://ufotrail.blogspot.com/', 'news', true, '{"interval":"2h","directory_n":37,"check":"A","language":"en","category":"research"}'::jsonb),
  ('A Different Perspective', 'https://kevinrandle.blogspot.com/', 'news', true, '{"interval":"2h","directory_n":38,"check":"B","language":"en","category":"research"}'::jsonb),
  ('Ufology Research', 'https://uforum.blogspot.com/', 'news', true, '{"interval":"2h","directory_n":39,"check":"A","language":"en","category":"research"}'::jsonb),
  ('The Oz Files', 'https://theozfiles.blogspot.com/', 'news', true, '{"interval":"2h","directory_n":40,"check":"B","language":"en","category":"research"}'::jsonb),
  ('UFOs: Scientific Research', 'https://ufos-scientificresearch.blogspot.com/', 'news', true, '{"interval":"2h","directory_n":41,"check":"A","language":"en","category":"research"}'::jsonb),
  ('David Clarke', 'https://drdavidclarke.co.uk/', 'news', true, '{"interval":"2h","directory_n":42,"check":"B","language":"en","category":"research"}'::jsonb),
  ('UFO FOTOCAT Blog', 'https://fotocat.blogspot.com/', 'news', true, '{"interval":"2h","directory_n":43,"check":"A","language":"en","category":"research"}'::jsonb),
  ('Bad UFOs', 'https://badufos.blogspot.com/', 'news', true, '{"interval":"2h","directory_n":44,"check":"C","language":"en","category":"research"}'::jsonb),
  ('Jason Colavito', 'https://www.jasoncolavito.com/blog', 'news', true, '{"interval":"2h","directory_n":45,"check":"A","language":"en","category":"research"}'::jsonb),
  ('Metabunk', 'https://www.metabunk.org/', 'news', true, '{"interval":"2h","directory_n":46,"check":"D","language":"en","category":"research"}'::jsonb),
  ('Skeptical Inquirer', 'https://skepticalinquirer.org/', 'news', true, '{"interval":"2h","directory_n":47,"check":"A","language":"en","category":"research"}'::jsonb),
  ('Skeptic', 'https://www.skeptic.com/', 'news', true, '{"interval":"2h","directory_n":48,"check":"A","language":"en","category":"research"}'::jsonb),
  ('Snopes', 'https://www.snopes.com/', 'news', true, '{"interval":"2h","directory_n":49,"check":"A","language":"en","category":"research"}'::jsonb),
  ('Avi Loeb', 'https://avi-loeb.medium.com/', 'news', true, '{"interval":"2h","directory_n":50,"check":"C","language":"en","category":"research"}'::jsonb),
  ('Christopher Mellon', 'https://www.christophermellon.net/', 'news', true, '{"interval":"2h","directory_n":51,"check":"B","language":"en","category":"research"}'::jsonb),
  ('Richard Dolan Members', 'https://richarddolanmembers.com/', 'news', true, '{"interval":"2h","directory_n":52,"check":"B","language":"en","category":"research"}'::jsonb),
  ('NewsNation', 'https://www.newsnationnow.com/space/ufo/', 'news', true, '{"interval":"2h","directory_n":53,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('Associated Press', 'https://apnews.com/', 'news', false, '{"interval":"2h","directory_n":54,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Reuters', 'https://www.reuters.com/', 'news', false, '{"interval":"2h","directory_n":55,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('ABC News', 'https://abcnews.com/', 'news', false, '{"interval":"2h","directory_n":56,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('CBS News / 60 Minutes', 'https://www.cbsnews.com/', 'news', false, '{"interval":"2h","directory_n":57,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('NBC News', 'https://www.nbcnews.com/', 'news', false, '{"interval":"2h","directory_n":58,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('CNN', 'https://www.cnn.com/', 'news', false, '{"interval":"2h","directory_n":59,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('Fox News', 'https://www.foxnews.com/category/science/air-and-space/ufos', 'news', true, '{"interval":"2h","directory_n":60,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('PBS News / NOVA', 'https://www.pbs.org/', 'news', false, '{"interval":"2h","directory_n":61,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('NPR', 'https://www.npr.org/', 'news', false, '{"interval":"2h","directory_n":62,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('The New York Times', 'https://www.nytimes.com/', 'news', false, '{"interval":"2h","directory_n":63,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('The Washington Post', 'https://www.washingtonpost.com/', 'news', false, '{"interval":"2h","directory_n":64,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('The Wall Street Journal', 'https://www.wsj.com/', 'news', false, '{"interval":"2h","directory_n":65,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('USA Today', 'https://www.usatoday.com/', 'news', false, '{"interval":"2h","directory_n":66,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('Los Angeles Times', 'https://www.latimes.com/', 'news', false, '{"interval":"2h","directory_n":67,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('Politico', 'https://www.politico.com/', 'news', false, '{"interval":"2h","directory_n":68,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('The Hill', 'https://thehill.com/', 'news', false, '{"interval":"2h","directory_n":69,"check":"D","language":"en","category":"us_national"}'::jsonb),
  ('Axios', 'https://www.axios.com/', 'news', false, '{"interval":"2h","directory_n":70,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Newsweek', 'https://www.newsweek.com/', 'news', false, '{"interval":"2h","directory_n":71,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('TIME', 'https://time.com/', 'news', false, '{"interval":"2h","directory_n":72,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('The Atlantic', 'https://www.theatlantic.com/', 'news', false, '{"interval":"2h","directory_n":73,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('The New Yorker', 'https://www.newyorker.com/', 'news', false, '{"interval":"2h","directory_n":74,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('New York Magazine / Intelligencer', 'https://nymag.com/tags/ufos/', 'news', true, '{"interval":"2h","directory_n":75,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('New York Post', 'https://nypost.com/', 'news', false, '{"interval":"2h","directory_n":76,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Washington Examiner', 'https://www.washingtonexaminer.com/', 'news', false, '{"interval":"2h","directory_n":77,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('The Washington Times', 'https://www.washingtontimes.com/', 'news', false, '{"interval":"2h","directory_n":78,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('The Daily Beast', 'https://www.thedailybeast.com/', 'news', false, '{"interval":"2h","directory_n":79,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Vox', 'https://www.vox.com/', 'news', false, '{"interval":"2h","directory_n":80,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Slate', 'https://slate.com/', 'news', false, '{"interval":"2h","directory_n":81,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('Rolling Stone', 'https://www.rollingstone.com/', 'news', false, '{"interval":"2h","directory_n":82,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Forbes', 'https://www.forbes.com/', 'news', false, '{"interval":"2h","directory_n":83,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Business Insider', 'https://www.businessinsider.com/', 'news', false, '{"interval":"2h","directory_n":84,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Fortune', 'https://fortune.com/', 'news', false, '{"interval":"2h","directory_n":85,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Bloomberg', 'https://www.bloomberg.com/', 'news', false, '{"interval":"2h","directory_n":86,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('VICE', 'https://www.vice.com/', 'news', false, '{"interval":"2h","directory_n":87,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('404 Media', 'https://www.404media.co/', 'news', false, '{"interval":"2h","directory_n":88,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('People', 'https://people.com/', 'news', false, '{"interval":"2h","directory_n":89,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Yahoo News', 'https://news.yahoo.com/', 'news', false, '{"interval":"2h","directory_n":90,"check":"C","language":"en","category":"us_national"}'::jsonb),
  ('USA Herald', 'https://usaherald.com/', 'news', false, '{"interval":"2h","directory_n":91,"check":"A","language":"en","category":"us_national"}'::jsonb),
  ('Space.com', 'https://www.space.com/tag/ufos-extraterrestrials', 'news', true, '{"interval":"2h","directory_n":92,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Live Science', 'https://www.livescience.com/', 'news', false, '{"interval":"2h","directory_n":93,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Scientific American', 'https://www.scientificamerican.com/', 'news', false, '{"interval":"2h","directory_n":94,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Science News', 'https://www.sciencenews.org/', 'news', false, '{"interval":"2h","directory_n":95,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('ScienceAlert', 'https://www.sciencealert.com/', 'news', false, '{"interval":"2h","directory_n":96,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Discover', 'https://www.discovermagazine.com/', 'news', false, '{"interval":"2h","directory_n":97,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Popular Mechanics', 'https://www.popularmechanics.com/ufo-central/', 'news', true, '{"interval":"2h","directory_n":98,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Popular Science', 'https://www.popsci.com/', 'news', false, '{"interval":"2h","directory_n":99,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('New Scientist', 'https://www.newscientist.com/', 'news', false, '{"interval":"2h","directory_n":100,"check":"D","language":"en","category":"science_defense"}'::jsonb),
  ('Astronomy', 'https://www.astronomy.com/', 'news', false, '{"interval":"2h","directory_n":101,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('IFLScience', 'https://www.iflscience.com/', 'news', false, '{"interval":"2h","directory_n":102,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Phys.org', 'https://phys.org/', 'news', false, '{"interval":"2h","directory_n":103,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('The Conversation', 'https://theconversation.com/', 'news', false, '{"interval":"2h","directory_n":104,"check":"C","language":"en","category":"science_defense"}'::jsonb),
  ('Smithsonian Magazine', 'https://www.smithsonianmag.com/', 'news', false, '{"interval":"2h","directory_n":105,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('National Geographic', 'https://www.nationalgeographic.com/', 'news', false, '{"interval":"2h","directory_n":106,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('BBC Science Focus', 'https://www.sciencefocus.com/', 'news', false, '{"interval":"2h","directory_n":107,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Ars Technica', 'https://arstechnica.com/', 'news', false, '{"interval":"2h","directory_n":108,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('WIRED', 'https://www.wired.com/', 'news', false, '{"interval":"2h","directory_n":109,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Gizmodo', 'https://gizmodo.com/', 'news', false, '{"interval":"2h","directory_n":110,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Futurism', 'https://futurism.com/', 'news', false, '{"interval":"2h","directory_n":111,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Tech Times', 'https://www.techtimes.com/', 'news', false, '{"interval":"2h","directory_n":112,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('New Space Economy', 'https://newspaceeconomy.ca/', 'news', false, '{"interval":"2h","directory_n":113,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('The War Zone', 'https://www.twz.com/category/uap', 'news', true, '{"interval":"2h","directory_n":114,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('DefenseScoop', 'https://defensescoop.com/tag/uap/', 'news', true, '{"interval":"2h","directory_n":115,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('The Aviationist', 'https://theaviationist.com/', 'news', false, '{"interval":"2h","directory_n":116,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Military.com', 'https://www.military.com/', 'news', false, '{"interval":"2h","directory_n":117,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Military Times', 'https://www.militarytimes.com/', 'news', false, '{"interval":"2h","directory_n":118,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Army Times', 'https://www.armytimes.com/', 'news', false, '{"interval":"2h","directory_n":119,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('Breaking Defense', 'https://breakingdefense.com/', 'news', false, '{"interval":"2h","directory_n":120,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('HISTORY', 'https://www.history.com/', 'news', false, '{"interval":"2h","directory_n":121,"check":"A","language":"en","category":"science_defense"}'::jsonb),
  ('BBC News', 'https://www.bbc.com/news', 'news', false, '{"interval":"2h","directory_n":122,"check":"C","language":"en","category":"uk_ireland"}'::jsonb),
  ('The Guardian', 'https://www.theguardian.com/world/ufos', 'news', true, '{"interval":"2h","directory_n":123,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('The Independent', 'https://www.independent.co.uk/', 'news', false, '{"interval":"2h","directory_n":124,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('Sky News', 'https://news.sky.com/', 'news', false, '{"interval":"2h","directory_n":125,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('ITV News', 'https://www.itv.com/news/topic/ufo', 'news', true, '{"interval":"2h","directory_n":126,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('The Times / Sunday Times', 'https://www.thetimes.com/', 'news', false, '{"interval":"2h","directory_n":127,"check":"C","language":"en","category":"uk_ireland"}'::jsonb),
  ('The Telegraph', 'https://www.telegraph.co.uk/', 'news', false, '{"interval":"2h","directory_n":128,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('Daily Mail', 'https://www.dailymail.co.uk/', 'news', false, '{"interval":"2h","directory_n":129,"check":"C","language":"en","category":"uk_ireland"}'::jsonb),
  ('The Sun', 'https://www.thesun.co.uk/topic/aliens-ufos/', 'news', true, '{"interval":"2h","directory_n":130,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('Daily Mirror', 'https://www.mirror.co.uk/', 'news', false, '{"interval":"2h","directory_n":131,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('Daily Express', 'https://www.express.co.uk/', 'news', false, '{"interval":"2h","directory_n":132,"check":"D","language":"en","category":"uk_ireland"}'::jsonb),
  ('Metro', 'https://metro.co.uk/', 'news', false, '{"interval":"2h","directory_n":133,"check":"C","language":"en","category":"uk_ireland"}'::jsonb),
  ('Daily Star', 'https://www.dailystar.co.uk/', 'news', false, '{"interval":"2h","directory_n":134,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('Daily Record', 'https://www.dailyrecord.co.uk/', 'news', false, '{"interval":"2h","directory_n":135,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('The Scotsman', 'https://www.scotsman.com/', 'news', false, '{"interval":"2h","directory_n":136,"check":"D","language":"en","category":"uk_ireland"}'::jsonb),
  ('Irish Independent', 'https://www.independent.ie/', 'news', false, '{"interval":"2h","directory_n":137,"check":"D","language":"en","category":"uk_ireland"}'::jsonb),
  ('The Irish Times', 'https://www.irishtimes.com/', 'news', false, '{"interval":"2h","directory_n":138,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('International Business Times UK', 'https://www.ibtimes.co.uk/', 'news', false, '{"interval":"2h","directory_n":139,"check":"A","language":"en","category":"uk_ireland"}'::jsonb),
  ('CBC News', 'https://www.cbc.ca/news', 'news', false, '{"interval":"2h","directory_n":140,"check":"C","language":"en","category":"canzuk"}'::jsonb),
  ('CTV News', 'https://www.ctvnews.ca/', 'news', false, '{"interval":"2h","directory_n":141,"check":"C","language":"en","category":"canzuk"}'::jsonb),
  ('Global News', 'https://globalnews.ca/', 'news', false, '{"interval":"2h","directory_n":142,"check":"A","language":"en","category":"canzuk"}'::jsonb),
  ('National Post', 'https://nationalpost.com/', 'news', false, '{"interval":"2h","directory_n":143,"check":"D","language":"en","category":"canzuk"}'::jsonb),
  ('ABC Australia', 'https://www.abc.net.au/news', 'news', false, '{"interval":"2h","directory_n":144,"check":"A","language":"en","category":"canzuk"}'::jsonb),
  ('SBS News', 'https://www.sbs.com.au/news', 'news', false, '{"interval":"2h","directory_n":145,"check":"A","language":"en","category":"canzuk"}'::jsonb),
  ('7NEWS', 'https://7news.com.au/news/ufo', 'news', true, '{"interval":"2h","directory_n":146,"check":"A","language":"en","category":"canzuk"}'::jsonb),
  ('9News Australia', 'https://www.9news.com.au/', 'news', false, '{"interval":"2h","directory_n":147,"check":"A","language":"en","category":"canzuk"}'::jsonb),
  ('news.com.au', 'https://www.news.com.au/', 'news', false, '{"interval":"2h","directory_n":148,"check":"A","language":"en","category":"canzuk"}'::jsonb),
  ('The Sydney Morning Herald', 'https://www.smh.com.au/', 'news', false, '{"interval":"2h","directory_n":149,"check":"C","language":"en","category":"canzuk"}'::jsonb),
  ('The Age', 'https://www.theage.com.au/', 'news', false, '{"interval":"2h","directory_n":150,"check":"C","language":"en","category":"canzuk"}'::jsonb),
  ('Stuff', 'https://www.stuff.co.nz/', 'news', false, '{"interval":"2h","directory_n":151,"check":"A","language":"en","category":"canzuk"}'::jsonb),
  ('RNZ', 'https://www.rnz.co.nz/', 'news', false, '{"interval":"2h","directory_n":152,"check":"C","language":"en","category":"canzuk"}'::jsonb),
  ('The New Zealand Herald', 'https://www.nzherald.co.nz/', 'news', false, '{"interval":"2h","directory_n":153,"check":"D","language":"en","category":"canzuk"}'::jsonb),
  ('Al Jazeera', 'https://www.aljazeera.com/', 'news', false, '{"interval":"2h","directory_n":154,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Euronews', 'https://www.euronews.com/tag/ufo', 'news', true, '{"interval":"2h","directory_n":155,"check":"A","language":"en","category":"international"}'::jsonb),
  ('France 24', 'https://www.france24.com/', 'news', false, '{"interval":"2h","directory_n":156,"check":"C","language":"en","category":"international"}'::jsonb),
  ('Deutsche Welle', 'https://www.dw.com/', 'news', false, '{"interval":"2h","directory_n":157,"check":"C","language":"en","category":"international"}'::jsonb),
  ('Le Monde', 'https://www.lemonde.fr/', 'news', false, '{"interval":"2h","directory_n":158,"check":"D","language":"en","category":"international"}'::jsonb),
  ('Le Figaro', 'https://www.lefigaro.fr/', 'news', false, '{"interval":"2h","directory_n":159,"check":"C","language":"en","category":"international"}'::jsonb),
  ('Le Parisien', 'https://www.leparisien.fr/', 'news', false, '{"interval":"2h","directory_n":160,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Tagesschau', 'https://www.tagesschau.de/', 'news', false, '{"interval":"2h","directory_n":161,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Die Welt', 'https://www.welt.de/', 'news', false, '{"interval":"2h","directory_n":162,"check":"A","language":"en","category":"international"}'::jsonb),
  ('El País', 'https://elpais.com/', 'news', false, '{"interval":"2h","directory_n":163,"check":"A","language":"en","category":"international"}'::jsonb),
  ('RTVE', 'https://www.rtve.es/', 'news', false, '{"interval":"2h","directory_n":164,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Infobae', 'https://www.infobae.com/tag/ovni/', 'news', true, '{"interval":"2h","directory_n":165,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Clarín', 'https://www.clarin.com/', 'news', false, '{"interval":"2h","directory_n":166,"check":"A","language":"en","category":"international"}'::jsonb),
  ('La Nación', 'https://www.lanacion.com.ar/', 'news', false, '{"interval":"2h","directory_n":167,"check":"A","language":"en","category":"international"}'::jsonb),
  ('El Universal', 'https://www.eluniversal.com.mx/tag/ovni/', 'news', true, '{"interval":"2h","directory_n":168,"check":"A","language":"en","category":"international"}'::jsonb),
  ('El Tiempo', 'https://www.eltiempo.com/', 'news', false, '{"interval":"2h","directory_n":169,"check":"A","language":"en","category":"international"}'::jsonb),
  ('BioBioChile', 'https://www.biobiochile.cl/', 'news', false, '{"interval":"2h","directory_n":170,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Emol', 'https://www.emol.com/', 'news', false, '{"interval":"2h","directory_n":171,"check":"A","language":"en","category":"international"}'::jsonb),
  ('G1', 'https://g1.globo.com/', 'news', false, '{"interval":"2h","directory_n":172,"check":"C","language":"en","category":"international"}'::jsonb),
  ('South China Morning Post', 'https://www.scmp.com/topics/ufos-and-extraterrestrial-life', 'news', true, '{"interval":"2h","directory_n":173,"check":"A","language":"en","category":"international"}'::jsonb),
  ('The Japan Times', 'https://www.japantimes.co.jp/tag/ufo', 'news', true, '{"interval":"2h","directory_n":174,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Kyodo News', 'https://english.kyodonews.net/', 'news', false, '{"interval":"2h","directory_n":175,"check":"C","language":"en","category":"international"}'::jsonb),
  ('The Korea Times', 'https://www.koreatimes.co.kr/topic/ufo/list', 'news', true, '{"interval":"2h","directory_n":176,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Taipei Times', 'https://www.taipeitimes.com/', 'news', false, '{"interval":"2h","directory_n":177,"check":"A","language":"en","category":"international"}'::jsonb),
  ('NDTV', 'https://www.ndtv.com/topic/ufo', 'news', true, '{"interval":"2h","directory_n":178,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Times of India', 'https://timesofindia.indiatimes.com/', 'news', false, '{"interval":"2h","directory_n":179,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Hindustan Times', 'https://www.hindustantimes.com/', 'news', false, '{"interval":"2h","directory_n":180,"check":"A","language":"en","category":"international"}'::jsonb),
  ('The Indian Express', 'https://indianexpress.com/', 'news', false, '{"interval":"2h","directory_n":181,"check":"A","language":"en","category":"international"}'::jsonb),
  ('The News International', 'https://www.thenews.com.pk/', 'news', false, '{"interval":"2h","directory_n":182,"check":"A","language":"en","category":"international"}'::jsonb),
  ('IOL', 'https://iol.co.za/', 'news', false, '{"interval":"2h","directory_n":183,"check":"A","language":"en","category":"international"}'::jsonb),
  ('The Daily Star (Bangladesh)', 'https://www.thedailystar.net/', 'news', false, '{"interval":"2h","directory_n":184,"check":"A","language":"en","category":"international"}'::jsonb),
  ('Eurasia Review', 'https://www.eurasiareview.com/', 'news', false, '{"interval":"2h","directory_n":185,"check":"C","language":"en","category":"international"}'::jsonb),
  ('8 News Now / KLAS', 'https://www.8newsnow.com/', 'news', false, '{"interval":"2h","directory_n":186,"check":"C","language":"en","category":"local"}'::jsonb),
  ('Las Vegas Review-Journal', 'https://www.reviewjournal.com/', 'news', false, '{"interval":"2h","directory_n":187,"check":"A","language":"en","category":"local"}'::jsonb),
  ('KTLA', 'https://ktla.com/', 'news', false, '{"interval":"2h","directory_n":188,"check":"D","language":"en","category":"local"}'::jsonb),
  ('Arizona Republic / azcentral', 'https://www.azcentral.com/', 'news', false, '{"interval":"2h","directory_n":189,"check":"D","language":"en","category":"local"}'::jsonb),
  ('KSL', 'https://www.ksl.com/', 'news', false, '{"interval":"2h","directory_n":190,"check":"A","language":"en","category":"local"}'::jsonb),
  ('Deseret News', 'https://www.deseret.com/', 'news', false, '{"interval":"2h","directory_n":191,"check":"A","language":"en","category":"local"}'::jsonb),
  ('SFGATE', 'https://www.sfgate.com/', 'news', false, '{"interval":"2h","directory_n":192,"check":"C","language":"en","category":"local"}'::jsonb),
  ('WOSU', 'https://www.wosu.org/', 'news', false, '{"interval":"2h","directory_n":193,"check":"A","language":"en","category":"local"}'::jsonb),
  ('WBLM', 'https://wblm.com/', 'news', false, '{"interval":"2h","directory_n":194,"check":"A","language":"en","category":"local"}'::jsonb),
  ('WROK', 'https://1440wrok.com/', 'news', false, '{"interval":"2h","directory_n":195,"check":"A","language":"en","category":"local"}'::jsonb),
  ('WDTV', 'https://www.wdtv.com/', 'news', false, '{"interval":"2h","directory_n":196,"check":"A","language":"en","category":"local"}'::jsonb),
  ('FOX 13 Tampa Bay', 'https://www.fox13news.com/', 'news', false, '{"interval":"2h","directory_n":197,"check":"A","language":"en","category":"local"}'::jsonb),
  ('ABC7 New York', 'https://abc7ny.com/', 'news', false, '{"interval":"2h","directory_n":198,"check":"A","language":"en","category":"local"}'::jsonb),
  ('NBC10 Philadelphia', 'https://www.nbcphiladelphia.com/', 'news', false, '{"interval":"2h","directory_n":199,"check":"A","language":"en","category":"local"}'::jsonb),
  ('Dallas Express', 'https://dallasexpress.com/', 'news', false, '{"interval":"2h","directory_n":200,"check":"A","language":"en","category":"local"}'::jsonb),
  ('FOX 10 Phoenix', 'https://www.fox10phoenix.com/', 'news', false, '{"interval":"2h","directory_n":201,"check":"A","language":"en","category":"local"}'::jsonb),
  ('KTVU FOX 2', 'https://www.ktvu.com/', 'news', false, '{"interval":"2h","directory_n":202,"check":"A","language":"en","category":"local"}'::jsonb),
  ('NPR Illinois', 'https://www.nprillinois.org/', 'news', false, '{"interval":"2h","directory_n":203,"check":"A","language":"en","category":"local"}'::jsonb),
  ('Minot Daily News', 'https://www.minotdailynews.com/', 'news', false, '{"interval":"2h","directory_n":204,"check":"A","language":"en","category":"local"}'::jsonb),
  ('Discover Moose Jaw', 'https://www.discovermoosejaw.com/', 'news', false, '{"interval":"2h","directory_n":205,"check":"C","language":"en","category":"local"}'::jsonb),
  ('MUFON', 'https://mufon.com/', 'news', true, '{"interval":"2h","directory_n":206,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('National UFO Reporting Center (NUFORC)', 'https://nuforc.org/', 'news', true, '{"interval":"2h","directory_n":207,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('Scientific Coalition for UAP Studies', 'https://www.explorescu.org/', 'news', true, '{"interval":"2h","directory_n":208,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('Sol Foundation', 'https://thesolfoundation.org/', 'news', true, '{"interval":"2h","directory_n":209,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('Americans for Safe Aerospace', 'https://www.safeaerospace.org/', 'news', true, '{"interval":"2h","directory_n":210,"check":"B","language":"en","category":"primary"}'::jsonb),
  ('UAPx', 'https://www.uapexpedition.org/', 'news', true, '{"interval":"2h","directory_n":211,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('NARCAP', 'https://www.narcap.org/', 'news', true, '{"interval":"2h","directory_n":212,"check":"B","language":"en","category":"primary"}'::jsonb),
  ('UFO-Sverige', 'https://www.ufo.se/', 'news', true, '{"interval":"2h","directory_n":213,"check":"A","language":"sv","category":"primary"}'::jsonb),
  ('Centro Italiano Studi Ufologici (CISU)', 'https://www.cisu.org/', 'news', true, '{"interval":"2h","directory_n":214,"check":"A","language":"it","category":"primary"}'::jsonb),
  ('Centro Ufologico Nazionale (CUN)', 'https://www.cun-italia.com/', 'news', true, '{"interval":"2h","directory_n":215,"check":"A","language":"it","category":"primary"}'::jsonb),
  ('British UFO Research Association (BUFORA)', 'https://www.bufora.org.uk/', 'news', true, '{"interval":"2h","directory_n":216,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('UFO Research NSW', 'https://www.ufor.asn.au/', 'news', true, '{"interval":"2h","directory_n":217,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('GEIPAN / CNES', 'https://www.geipan.fr/', 'news', true, '{"interval":"2h","directory_n":218,"check":"B","language":"fr","category":"primary"}'::jsonb),
  ('AARO', 'https://www.aaro.mil/', 'news', true, '{"interval":"2h","directory_n":219,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('NASA UAP', 'https://science.nasa.gov/uap/', 'news', true, '{"interval":"2h","directory_n":220,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('US National Archives', 'https://www.archives.gov/research/topics/uaps', 'news', true, '{"interval":"2h","directory_n":221,"check":"A","language":"en","category":"primary"}'::jsonb),
  ('Paradigm Research Group', 'https://www.paradigmresearchgroup.org/', 'news', true, '{"interval":"2h","directory_n":222,"check":"B","language":"en","category":"primary"}'::jsonb)
on conflict (homepage_url) do update set
  name = excluded.name,
  active = excluded.active,
  fetch_policy = public.sources.fetch_policy || excluded.fetch_policy;
