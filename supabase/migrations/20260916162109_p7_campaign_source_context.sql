-- P7 campaign additions: per-record context excerpt + link liveness tracking. Hermes campaign 2026-09-16.
alter table public.person_sources add column if not exists excerpt text not null default '';
alter table public.person_sources add column if not exists url_ok boolean;
alter table public.person_sources add column if not exists url_checked_at timestamptz;

revoke all on table public.person_sources from public, anon, authenticated;
grant select (
  source_row_id, person_id, url, title, outlet, domain, source_type, role,
  published_date, date_precision, confidence, notes, discovered_via, created_at, excerpt
) on table public.person_sources to anon, authenticated;

create or replace view public.person_sources_public
with (security_invoker = true) as
select
  source_row_id, person_id, url, title, outlet, domain, source_type, role,
  published_date, date_precision, confidence, notes, discovered_via, created_at, excerpt
from public.person_sources;

revoke all on table public.person_sources_public from public, anon, authenticated;
grant select on table public.person_sources_public to anon, authenticated;
