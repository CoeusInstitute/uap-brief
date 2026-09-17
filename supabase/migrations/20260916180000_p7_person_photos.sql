-- P7 Track F: person profile photos (applied 2026-09-16).
-- Storage: public bucket 'person-images' (object path '<person_id>.<ext>'); the people row carries the public URL + provenance.
alter table public.people
  add column if not exists photo_url text,
  add column if not exists photo_source_url text,
  add column if not exists photo_source_type text,
  add column if not exists photo_confidence text,
  add column if not exists photo_checked_at timestamptz,
  add column if not exists photo_notes text;
insert into storage.buckets (id, name, public) values ('person-images','person-images',true) on conflict (id) do nothing;
drop policy if exists "Public read person images" on storage.objects;
create policy "Public read person images" on storage.objects for select to anon, authenticated using (bucket_id = 'person-images');
create or replace view public.people_public as
 SELECT person_id, name, aliases, status, primary_role, role_tags, prominence_tier, country_or_region, activity_period, affiliations, positions_or_titles, works_or_platforms, stance_category, position_statement_summary, key_claims_or_contributions, evidence_basis, claim_status, record_confidence, controversies_or_counterpoints, associated_podcast_ids, source_1_title, source_1_url, source_1_type, source_2_title, source_2_url, source_2_type, source_count, data_sources, last_verified, photo_url, photo_source_type, photo_confidence
   FROM people;
