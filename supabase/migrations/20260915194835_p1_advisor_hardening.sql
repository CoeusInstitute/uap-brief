-- Pin iso_date_sort search_path and index candidate FKs.

create or replace function public.iso_date_sort(value text)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when value ~ '^\d{4}-\d{2}-\d{2}$' then to_date(value, 'YYYY-MM-DD')
    when value ~ '^\d{4}-\d{2}$' then to_date(value || '-01', 'YYYY-MM-DD')
    when value ~ '^\d{4}$' then to_date(value || '-01-01', 'YYYY-MM-DD')
    else null
  end;
$$;

revoke all on function public.iso_date_sort(text) from public, anon, authenticated;

create index if not exists entity_match_candidates_suggested_person_id_idx
  on public.entity_match_candidates (suggested_person_id);
create index if not exists entity_match_candidates_suggested_org_id_idx
  on public.entity_match_candidates (suggested_org_id);
