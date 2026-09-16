-- UAP Brief P1: registry, operating tables, public views, RLS, column grants.

create or replace function public.iso_date_sort(value text)
returns date
language sql
immutable
as $$
  select case
    when value ~ '^\d{4}-\d{2}-\d{2}$' then to_date(value, 'YYYY-MM-DD')
    when value ~ '^\d{4}-\d{2}$' then to_date(value || '-01', 'YYYY-MM-DD')
    when value ~ '^\d{4}$' then to_date(value || '-01-01', 'YYYY-MM-DD')
    else null
  end;
$$;

revoke all on function public.iso_date_sort(text) from public, anon, authenticated;

create table if not exists public.people (
  person_id text primary key,
  name text not null,
  aliases text[] not null default '{}',
  birth_date text,
  death_date text,
  status text,
  primary_role text,
  role_tags text[] not null default '{}',
  prominence_tier text,
  country_or_region text,
  activity_period text,
  first_uap_activity_year text,
  last_uap_activity_year text,
  key_event_dates text[] not null default '{}',
  affiliations text[] not null default '{}',
  positions_or_titles text,
  works_or_platforms text[] not null default '{}',
  stance_category text,
  stance_seed text,
  position_statement_summary text,
  key_claims_or_contributions text,
  evidence_basis text[] not null default '{}',
  claim_status text,
  seed_claim_status text,
  record_confidence text,
  seed_confidence text,
  controversies_or_counterpoints text,
  first_public_date text,
  associated_podcast_ids text[] not null default '{}',
  source_1_title text,
  source_1_url text,
  source_1_type text,
  source_2_title text,
  source_2_url text,
  source_2_type text,
  source_count integer,
  data_sources text,
  census_id text,
  seed_id text,
  merge_note text,
  last_verified text,
  date_precision_notes text,
  research_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.person_aliases (
  normalized_alias text not null,
  person_id text not null references public.people (person_id) on delete cascade,
  primary key (normalized_alias, person_id)
);

create index if not exists person_aliases_person_id_idx
  on public.person_aliases (person_id);

create table if not exists public.podcasts (
  podcast_id text primary key,
  podcast_name text not null,
  aliases text[] not null default '{}',
  host_names text[] not null default '{}',
  network_producer text,
  country text,
  launch_date text,
  date_precision text,
  status text,
  cadence text,
  avg_length_min text,
  focus_tags text[] not null default '{}',
  reach_tier text,
  category text,
  primary_url text,
  feed_url text,
  apple_lookup text,
  youtube_url text,
  feed_discovery_status text,
  notable_recurring_guests text[] not null default '{}',
  notes text,
  confidence text,
  last_verified text,
  subscribers integer,
  checked_at timestamptz
);

create table if not exists public.organizations (
  org_id text primary key,
  org_name text not null,
  aliases text[] not null default '{}',
  org_type text,
  country text,
  founded_date text,
  date_precision text,
  dissolved_date text,
  status text,
  key_people text[] not null default '{}',
  role_in_discourse text,
  url text,
  confidence text
);

create table if not exists public.org_aliases (
  normalized_alias text not null,
  org_id text not null references public.organizations (org_id) on delete cascade,
  primary key (normalized_alias, org_id)
);

create index if not exists org_aliases_org_id_idx
  on public.org_aliases (org_id);

create table if not exists public.appearances (
  appearance_id text primary key,
  person_id text not null references public.people (person_id),
  person_name text,
  podcast_id text not null references public.podcasts (podcast_id),
  podcast_name text,
  role text,
  episode_title text,
  episode_date text,
  episode_date_sort date generated always as (public.iso_date_sort(episode_date)) stored,
  date_precision text,
  topic_tags text[] not null default '{}',
  source_url text,
  confidence text,
  provenance text
);

create index if not exists appearances_person_id_idx
  on public.appearances (person_id);
create index if not exists appearances_podcast_id_idx
  on public.appearances (podcast_id);

create table if not exists public.timeline (
  record_id text primary key,
  record_type text not null,
  category text,
  date text,
  date_precision text,
  date_sort date generated always as (public.iso_date_sort(date)) stored,
  title text not null,
  actors text,
  person_id text references public.people (person_id),
  venue text,
  summary text,
  significance text,
  claim_status text,
  topic_tags text[] not null default '{}',
  source_url text,
  confidence text,
  provenance text
);

create index if not exists timeline_person_id_idx
  on public.timeline (person_id);
create index if not exists timeline_date_sort_idx
  on public.timeline (date_sort);

create table if not exists public.x_accounts (
  x_handle text primary key,
  x_user_id text,
  ref_type text,
  ref_id text,
  display_name text,
  followers integer,
  followers_note text,
  verified boolean,
  last_checked text,
  source_url text,
  found_via text,
  all_refs text
);

create table if not exists public.entity_match_candidates (
  candidate_id uuid primary key default gen_random_uuid(),
  raw_name text not null,
  normalized_name text not null,
  seen_in_type text not null check (seen_in_type in ('story', 'episode', 'harvest', 'seed_alias')),
  seen_in_id text,
  status text not null default 'open' check (status in ('open', 'merged', 'rejected')),
  suggested_person_id text references public.people (person_id),
  suggested_org_id text references public.organizations (org_id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.episodes (
  episode_id uuid primary key default gen_random_uuid(),
  podcast_id text not null references public.podcasts (podcast_id),
  title text not null,
  pub_date timestamptz,
  url text,
  duration text,
  guests jsonb not null default '[]'::jsonb,
  relevance jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists episodes_url_uidx
  on public.episodes (url)
  where url is not null;
create index if not exists episodes_podcast_pub_idx
  on public.episodes (podcast_id, pub_date desc);

create table if not exists public.sources (
  source_id uuid primary key default gen_random_uuid(),
  name text not null,
  homepage_url text not null unique,
  rss_url text unique,
  kind text not null check (kind in ('news', 'podcast', 'x')),
  active boolean not null default true,
  last_fetch_at timestamptz,
  fetch_policy jsonb not null default '{}'::jsonb
);

create table if not exists public.stories (
  story_id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  source_id uuid not null references public.sources (source_id),
  title text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  excerpt text,
  form text check (form in ('news', 'analysis', 'opinion', 'press_release', 'podcast', 'video')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'review', 'ready', 'failed')),
  cluster_id uuid,
  dedupe_hash text,
  attempts integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stories_status_published_at_idx
  on public.stories (status, published_at desc);
create unique index if not exists stories_dedupe_hash_uidx
  on public.stories (dedupe_hash)
  where dedupe_hash is not null;
create index if not exists stories_source_id_idx
  on public.stories (source_id);
create index if not exists stories_cluster_id_idx
  on public.stories (cluster_id);
create index if not exists stories_published_at_idx
  on public.stories (published_at);

create table if not exists public.story_scores (
  story_id uuid not null references public.stories (story_id) on delete cascade,
  tag text not null,
  score numeric not null check (score >= 0 and score <= 10),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  rationale text not null,
  components jsonb not null default '{}'::jsonb,
  methodology_version text not null,
  prompt_version text not null,
  model text not null,
  primary key (story_id, tag)
);

create index if not exists story_scores_tag_idx
  on public.story_scores (tag);

create table if not exists public.story_entities (
  story_id uuid not null references public.stories (story_id) on delete cascade,
  entity_type text not null check (entity_type in ('person', 'organization', 'podcast', 'event')),
  entity_id text not null,
  match_method text,
  confidence text,
  primary key (story_id, entity_type, entity_id)
);

create index if not exists story_entities_entity_idx
  on public.story_entities (entity_type, entity_id);

create table if not exists public.x_posts (
  post_id text primary key,
  handle text not null,
  person_id text references public.people (person_id),
  posted_at timestamptz,
  url text,
  text text,
  engagement jsonb not null default '{}'::jsonb
);

create unique index if not exists x_posts_url_uidx
  on public.x_posts (url)
  where url is not null;
create index if not exists x_posts_person_posted_idx
  on public.x_posts (person_id, posted_at);

create table if not exists public.ingest_runs (
  run_id uuid primary key default gen_random_uuid(),
  function text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  counts jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb
);

create table if not exists public.review_queue (
  item_type text not null,
  item_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected')),
  reviewer text,
  decided_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  primary key (item_type, item_id, reason)
);

create table if not exists public.methodology_versions (
  version text primary key,
  status text not null check (status in ('draft', 'active', 'retired')),
  weights jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

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
    order by s.created_at
    limit greatest(1, least(coalesce(max_n, 5), 20))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_pending_stories(text, integer) from public, anon, authenticated;
grant execute on function public.claim_pending_stories(text, integer) to service_role;

create view public.people_public
with (security_invoker = true) as
select
  person_id, name, aliases, status, primary_role, role_tags, prominence_tier,
  country_or_region, activity_period, affiliations, positions_or_titles,
  works_or_platforms, stance_category, position_statement_summary,
  key_claims_or_contributions, evidence_basis, claim_status, record_confidence,
  controversies_or_counterpoints, associated_podcast_ids,
  source_1_title, source_1_url, source_1_type,
  source_2_title, source_2_url, source_2_type,
  source_count, data_sources, last_verified
from public.people;

create view public.podcasts_public
with (security_invoker = true) as
select
  podcast_id, podcast_name, aliases, host_names, network_producer, country,
  status, cadence, focus_tags, reach_tier, category, primary_url, feed_url, youtube_url,
  feed_discovery_status, notable_recurring_guests, notes, confidence
from public.podcasts;

create view public.organizations_public
with (security_invoker = true) as
select org_id, org_name, aliases, org_type, country, status, key_people, role_in_discourse, url, confidence
from public.organizations;

create view public.timeline_public
with (security_invoker = true) as
select
  record_id, record_type, category, date, date_precision, date_sort, title, actors, person_id,
  venue, summary, significance, claim_status, source_url, confidence
from public.timeline;

create view public.appearances_public
with (security_invoker = true) as
select
  appearance_id, person_id, person_name, podcast_id, podcast_name, role,
  episode_title, episode_date, episode_date_sort, topic_tags, source_url, confidence
from public.appearances;

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
          'rationale', sc.rationale
        )
        order by sc.tag
      ),
      '[]'::jsonb
    )
    from public.story_scores sc
    where sc.story_id = s.story_id
  ) as scores
from public.stories s
join public.sources src on src.source_id = s.source_id
where s.status = 'ready';

create view public.story_scores_public
with (security_invoker = true) as
select sc.story_id, sc.tag, sc.score, sc.confidence, sc.rationale
from public.story_scores sc
join public.stories s on s.story_id = sc.story_id
where s.status = 'ready';

create view public.graph_edges
with (security_invoker = true) as
select
  appearance_id as edge_id,
  'person'::text as source_kind,
  person_id as source_id,
  'podcast'::text as target_kind,
  podcast_id as target_id,
  'appearance'::text as kind
from public.appearances;

create view public.tag_stats
with (security_invoker = true) as
select sc.tag, count(*)::integer as n, avg(sc.score) as avg_score
from public.story_scores sc
join public.stories s on s.story_id = sc.story_id
where s.status = 'ready'
group by sc.tag;

create view public.tag_trends
with (security_invoker = true) as
select date_trunc('week', s.published_at) as week, sc.tag, count(*)::integer as n
from public.story_scores sc
join public.stories s on s.story_id = sc.story_id
where s.status = 'ready'
group by 1, 2;

create view public.source_stats
with (security_invoker = true) as
select src.source_id, src.name, src.homepage_url, count(s.story_id)::integer as ready_stories
from public.sources src
left join public.stories s on s.source_id = src.source_id and s.status = 'ready'
group by src.source_id, src.name, src.homepage_url;

create view public.entity_stats
with (security_invoker = true) as
select se.entity_type, se.entity_id, count(*)::integer as n
from public.story_entities se
join public.stories s on s.story_id = se.story_id
where s.status = 'ready'
group by se.entity_type, se.entity_id;

alter table public.people enable row level security;
alter table public.person_aliases enable row level security;
alter table public.podcasts enable row level security;
alter table public.organizations enable row level security;
alter table public.org_aliases enable row level security;
alter table public.appearances enable row level security;
alter table public.timeline enable row level security;
alter table public.x_accounts enable row level security;
alter table public.entity_match_candidates enable row level security;
alter table public.episodes enable row level security;
alter table public.sources enable row level security;
alter table public.stories enable row level security;
alter table public.story_scores enable row level security;
alter table public.story_entities enable row level security;
alter table public.x_posts enable row level security;
alter table public.ingest_runs enable row level security;
alter table public.review_queue enable row level security;
alter table public.methodology_versions enable row level security;

create policy "Public can read people"
  on public.people for select to anon, authenticated using (true);
create policy "Public can read podcasts"
  on public.podcasts for select to anon, authenticated using (true);
create policy "Public can read organizations"
  on public.organizations for select to anon, authenticated using (true);
create policy "Public can read appearances"
  on public.appearances for select to anon, authenticated using (true);
create policy "Public can read timeline"
  on public.timeline for select to anon, authenticated using (true);
create policy "Public can read active sources"
  on public.sources for select to anon, authenticated using (active = true);
create policy "Public can read ready stories"
  on public.stories for select to anon, authenticated using (status = 'ready');
create policy "Public can read scores for ready stories"
  on public.story_scores for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.story_id = story_scores.story_id and s.status = 'ready'));
create policy "Public can read entities for ready stories"
  on public.story_entities for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.story_id = story_entities.story_id and s.status = 'ready'));

revoke all on table public.people from public, anon, authenticated;
revoke all on table public.person_aliases from public, anon, authenticated;
revoke all on table public.podcasts from public, anon, authenticated;
revoke all on table public.organizations from public, anon, authenticated;
revoke all on table public.org_aliases from public, anon, authenticated;
revoke all on table public.appearances from public, anon, authenticated;
revoke all on table public.timeline from public, anon, authenticated;
revoke all on table public.x_accounts from public, anon, authenticated;
revoke all on table public.entity_match_candidates from public, anon, authenticated;
revoke all on table public.episodes from public, anon, authenticated;
revoke all on table public.sources from public, anon, authenticated;
revoke all on table public.stories from public, anon, authenticated;
revoke all on table public.story_scores from public, anon, authenticated;
revoke all on table public.story_entities from public, anon, authenticated;
revoke all on table public.x_posts from public, anon, authenticated;
revoke all on table public.ingest_runs from public, anon, authenticated;
revoke all on table public.review_queue from public, anon, authenticated;
revoke all on table public.methodology_versions from public, anon, authenticated;

grant select (
  person_id, name, aliases, status, primary_role, role_tags, prominence_tier,
  country_or_region, activity_period, affiliations, positions_or_titles,
  works_or_platforms, stance_category, position_statement_summary,
  key_claims_or_contributions, evidence_basis, claim_status, record_confidence,
  controversies_or_counterpoints, associated_podcast_ids,
  source_1_title, source_1_url, source_1_type,
  source_2_title, source_2_url, source_2_type,
  source_count, data_sources, last_verified
) on table public.people to anon, authenticated;

grant select (
  podcast_id, podcast_name, aliases, host_names, network_producer, country,
  status, cadence, focus_tags, reach_tier, category, primary_url, feed_url, youtube_url,
  feed_discovery_status, notable_recurring_guests, notes, confidence
) on table public.podcasts to anon, authenticated;

grant select (
  org_id, org_name, aliases, org_type, country, status, key_people, role_in_discourse, url, confidence
) on table public.organizations to anon, authenticated;

grant select (
  appearance_id, person_id, person_name, podcast_id, podcast_name, role,
  episode_title, episode_date, episode_date_sort, topic_tags, source_url, confidence
) on table public.appearances to anon, authenticated;

grant select (
  record_id, record_type, category, date, date_precision, date_sort, title, actors, person_id,
  venue, summary, significance, claim_status, source_url, confidence
) on table public.timeline to anon, authenticated;

grant select (source_id, name, homepage_url, active)
  on table public.sources to anon, authenticated;

grant select (story_id, canonical_url, title, published_at, excerpt, form, source_id, cluster_id, status)
  on table public.stories to anon, authenticated;

grant select (story_id, tag, score, confidence, rationale)
  on table public.story_scores to anon, authenticated;

grant select (story_id, entity_type, entity_id)
  on table public.story_entities to anon, authenticated;

grant select on table public.people_public to anon, authenticated;
grant select on table public.podcasts_public to anon, authenticated;
grant select on table public.organizations_public to anon, authenticated;
grant select on table public.timeline_public to anon, authenticated;
grant select on table public.appearances_public to anon, authenticated;
grant select on table public.stories_public to anon, authenticated;
grant select on table public.story_scores_public to anon, authenticated;
grant select on table public.graph_edges to anon, authenticated;
grant select on table public.tag_stats to anon, authenticated;
grant select on table public.tag_trends to anon, authenticated;
grant select on table public.source_stats to anon, authenticated;
grant select on table public.entity_stats to anon, authenticated;

insert into public.sources (name, homepage_url, kind, active, fetch_policy)
values
  ('UAP News Center', 'https://uapnewscenter.com/', 'news', true, '{"interval": "2h"}'::jsonb),
  ('The UFO Chronicles', 'https://www.theufochronicles.com/', 'news', true, '{"interval": "2h"}'::jsonb),
  ('UFO Sightings Daily', 'https://www.ufosightingsdaily.com/', 'news', true, '{"interval": "2h"}'::jsonb),
  ('UAPs News', 'https://uapsnews.com/blog/', 'news', true, '{"interval": "2h"}'::jsonb),
  ('UFO Pulse', 'https://ufopulse.com/category/latest-news/', 'news', true, '{"interval": "2h"}'::jsonb),
  ('UFO UAP', 'https://www.ufouap.net/en/news', 'news', true, '{"interval": "2h"}'::jsonb),
  ('PBS NewsHour (UAP tag)', 'https://www.pbs.org/newshour/tag/uap', 'news', true, '{"interval": "2h"}'::jsonb),
  ('UFO News (Cristina Gomez)', 'https://www.ufonews.co/', 'news', true, '{"interval": "2h"}'::jsonb)
on conflict (homepage_url) do nothing;
