-- P7 dossier enrichment: person_sources, person_links, enrichment_queue, views, RPCs, seed backfill.
-- Mainstream news rows were homepage HTTP 200-checked 2026-09-16 before insert. rss_url stays null.

create table public.person_sources (
  source_row_id uuid primary key default gen_random_uuid(),
  person_id text not null references public.people (person_id),
  url text not null,
  title text not null default '',
  outlet text not null default '',
  domain text not null default '',
  source_type text not null default 'other'
    check (source_type in (
      'mainstream_press', 'podcast', 'youtube', 'radio', 'tv', 'x',
      'linkedin', 'official', 'scholarly', 'archive', 'other'
    )),
  role text not null default '',
  published_date date,
  date_precision text not null default 'unknown'
    check (date_precision in ('unknown', 'day', 'month', 'year')),
  confidence text not null default 'medium'
    check (confidence in ('high', 'medium', 'low')),
  notes text not null default '',
  discovered_via text not null default '',
  created_at timestamptz not null default now(),
  unique (person_id, url),
  constraint person_sources_url_http check (url ~* '^https?://')
);

create index person_sources_person_idx on public.person_sources (person_id);
create index person_sources_domain_idx on public.person_sources (domain);

create table public.person_links (
  link_id uuid primary key default gen_random_uuid(),
  person_id text not null references public.people (person_id),
  link_type text not null
    check (link_type in (
      'website', 'wikipedia', 'wikidata', 'imdb', 'linkedin', 'youtube_channel', 'x', 'other'
    )),
  url text not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (person_id, link_type, url),
  constraint person_links_url_http check (url ~* '^https?://')
);

create index person_links_person_idx on public.person_links (person_id);

create table public.enrichment_queue (
  queue_id uuid primary key default gen_random_uuid(),
  person_id text not null references public.people (person_id),
  wave int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  last_error text,
  worker text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id)
);

create index enrichment_queue_status_wave_idx
  on public.enrichment_queue (status, wave, created_at);

alter table public.person_sources enable row level security;
alter table public.person_links enable row level security;
alter table public.enrichment_queue enable row level security;

create policy "Public can read person sources"
  on public.person_sources for select to anon, authenticated using (true);
create policy "Public can read person links"
  on public.person_links for select to anon, authenticated using (true);

revoke all on table public.person_sources from public, anon, authenticated;
revoke all on table public.person_links from public, anon, authenticated;
revoke all on table public.enrichment_queue from public, anon, authenticated;

grant select (
  source_row_id, person_id, url, title, outlet, domain, source_type, role,
  published_date, date_precision, confidence, notes, discovered_via, created_at
) on table public.person_sources to anon, authenticated;

grant select (
  link_id, person_id, link_type, url, label, created_at
) on table public.person_links to anon, authenticated;

create view public.person_sources_public
with (security_invoker = true) as
select
  source_row_id, person_id, url, title, outlet, domain, source_type, role,
  published_date, date_precision, confidence, notes, discovered_via, created_at
from public.person_sources;

create view public.person_links_public
with (security_invoker = true) as
select link_id, person_id, link_type, url, label, created_at
from public.person_links;

revoke all on table public.person_sources_public from public, anon, authenticated;
revoke all on table public.person_links_public from public, anon, authenticated;
grant select on table public.person_sources_public to anon, authenticated;
grant select on table public.person_links_public to anon, authenticated;

create or replace function public.claim_enrichment_batch(worker_id text, max_n integer default 15)
returns setof public.enrichment_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.enrichment_queue
  set
    status = 'processing',
    attempts = enrichment_queue.attempts + 1,
    locked_at = now(),
    worker = worker_id,
    updated_at = now()
  where queue_id in (
    select q.queue_id
    from public.enrichment_queue q
    where
      q.attempts < 3
      and (
        q.status = 'pending'
        or (q.status = 'processing' and q.locked_at < now() - interval '15 minutes')
      )
    order by q.wave asc, q.created_at asc
    limit greatest(1, least(coalesce(max_n, 15), 15))
    for update skip locked
  )
  returning *;
end;
$$;

create or replace function public.complete_enrichment_item(
  p_queue_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('pending', 'done', 'failed') then
    raise exception 'invalid enrichment status %', p_status;
  end if;

  update public.enrichment_queue
  set
    status = p_status,
    last_error = case when p_status = 'failed' then p_error else null end,
    locked_at = null,
    updated_at = now()
  where queue_id = p_queue_id;
end;
$$;

revoke all on function public.claim_enrichment_batch(text, integer) from public, anon, authenticated;
revoke all on function public.complete_enrichment_item(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_enrichment_batch(text, integer) to service_role;
grant execute on function public.complete_enrichment_item(uuid, text, text) to service_role;

insert into public.person_sources (
  person_id, url, title, outlet, domain, source_type, role,
  published_date, date_precision, confidence, notes, discovered_via
)
select
  person_id,
  trim(source_1_url),
  coalesce(source_1_title, ''),
  '',
  lower(regexp_replace(split_part(regexp_replace(trim(source_1_url), '^https?://', '', 'i'), '/', 1), '^www\.', '', 'i')),
  case
    when trim(source_1_url) ~* 'youtube\.com|youtu\.be' then 'youtube'
    when trim(source_1_url) ~* 'linkedin\.com' then 'linkedin'
    when trim(source_1_url) ~* '(x\.com|twitter\.com)' then 'x'
    when coalesce(source_1_type, '') in ('primary_official', 'primary_or_institutional', 'primary_organization') then 'official'
    when coalesce(source_1_type, '') = 'scholarly_preprint' then 'scholarly'
    when trim(source_1_url) ~* 'wikipedia\.org|wikidata\.org|archive\.org' then 'archive'
    when coalesce(source_1_type, '') = 'appearance_record' and trim(source_1_url) ~* 'podcast|spotify\.com|apple\.com' then 'podcast'
    else 'other'
  end,
  '',
  null,
  'unknown',
  'medium',
  '',
  'seed_migration'
from public.people
where source_1_url is not null and trim(source_1_url) ~* '^https?://'
on conflict (person_id, url) do nothing;

insert into public.person_sources (
  person_id, url, title, outlet, domain, source_type, role,
  published_date, date_precision, confidence, notes, discovered_via
)
select
  person_id,
  trim(source_2_url),
  coalesce(source_2_title, ''),
  '',
  lower(regexp_replace(split_part(regexp_replace(trim(source_2_url), '^https?://', '', 'i'), '/', 1), '^www\.', '', 'i')),
  case
    when trim(source_2_url) ~* 'youtube\.com|youtu\.be' then 'youtube'
    when trim(source_2_url) ~* 'linkedin\.com' then 'linkedin'
    when trim(source_2_url) ~* '(x\.com|twitter\.com)' then 'x'
    when coalesce(source_2_type, '') in ('primary_official', 'primary_or_institutional', 'primary_organization') then 'official'
    when coalesce(source_2_type, '') = 'scholarly_preprint' then 'scholarly'
    when trim(source_2_url) ~* 'wikipedia\.org|wikidata\.org|archive\.org' then 'archive'
    when coalesce(source_2_type, '') = 'appearance_record' and trim(source_2_url) ~* 'podcast|spotify\.com|apple\.com' then 'podcast'
    else 'other'
  end,
  '',
  null,
  'unknown',
  'medium',
  '',
  'seed_migration'
from public.people
where source_2_url is not null and trim(source_2_url) ~* '^https?://'
on conflict (person_id, url) do nothing;

insert into public.sources (name, homepage_url, kind, active, fetch_policy)
values
  ('NewsNation', 'https://www.newsnationnow.com/', 'news', true, '{"interval":"2h"}'::jsonb),
  ('The Debrief', 'https://thedebrief.org/', 'news', true, '{"interval":"2h"}'::jsonb),
  ('Space.com', 'https://www.space.com/', 'news', true, '{"interval":"2h"}'::jsonb),
  ('Liberation Times', 'https://www.liberationtimes.com/', 'news', true, '{"interval":"2h"}'::jsonb),
  ('DefenseScoop', 'https://defensescoop.com/', 'news', true, '{"interval":"2h"}'::jsonb),
  ('Ask a Pol', 'https://www.askapol.com/', 'news', true, '{"interval":"2h"}'::jsonb),
  ('The War Zone', 'https://www.twz.com/', 'news', true, '{"interval":"2h"}'::jsonb),
  ('New Space Economy', 'https://newspaceeconomy.ca/', 'news', true, '{"interval":"2h"}'::jsonb),
  ('Unknown Country', 'https://unknowncountry.com/', 'news', true, '{"interval":"2h"}'::jsonb)
on conflict (homepage_url) do nothing;
