-- Graph layer v2 (2026-09-17): accent-aware normalizer, mint round 3, co_show edges, queue filter.
-- Applied via Management API; canonical record. v1: 20260917090000_graph_layer.sql

-- 1. Normalizer v3 (adds unaccent + 'affiliate'/'witness'/'whistleblower' stripping)
create extension if not exists unaccent;
CREATE OR REPLACE FUNCTION public.norm_entity_name(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(unaccent(lower(coalesce(p,''))), 'u\.s\.', 'us', 'g'),
          '&', ' and ', 'g'),
        '[^a-z0-9]+', ' ', 'g'),
      '\y(fmr|former|retired|veteran|intl|ret|witness|whistleblower|affiliate)\y', ' ', 'g'),
    ' +', ' ', 'g'))
$function$
;

-- 2. Mint round 3 (15 orgs; ORG-105..)
insert into public.organizations (org_id, org_name, aliases, org_type, country, status, confidence) values
  ('ORG-105','European Parliament',array['EP']::text[],'legislative_body','EU','active','high'),
  ('ORG-106','Cuarto Milenio',array[]::text[],'media_program','ES','active','high'),
  ('ORG-107','EarthTech International',array['EarthTech']::text[],'private_research','US','active','high'),
  ('ORG-108','3AF SIGMA2',array['3AF','SIGMA2','Association Aeronautique et Astronautique de France']::text[],'research_committee','FR','active','high'),
  ('ORG-109','Citizens Against UFO Secrecy',array['CAUS','Citizens against UFO secrecy caus']::text[],'advocacy','US','historical','high'),
  ('ORG-110','Boston University',array[]::text[],'university','US','active','high'),
  ('ORG-111','Academy for Future Science',array[]::text[],'civilian_research','US','active','high'),
  ('ORG-112','Civilian Saucer Intelligence',array['CSI New York','Civilian Saucer Intelligence of New York']::text[],'civilian_research','US','historical','high'),
  ('ORG-113','Committee for Skeptical Inquiry',array['CSICOP','Committee for the Scientific Investigation of Claims of the Paranormal']::text[],'skeptic_organization','US','active','high'),
  ('ORG-114','44th Missile Security Squadron Ellsworth AFB',array['44th Missile Security Squadron']::text[],'military_unit','US','historical','high'),
  ('ORG-115','Aerial Phenomena Research Organization',array['APRO']::text[],'civilian_research','US','historical','high'),
  ('ORG-116','Expanding Frontiers Research',array[]::text[],'civilian_research','US','active','high'),
  ('ORG-117','French Air Force',array['Armee de l Air','Armée de l''Air']::text[],'military_branch','FR','active','high'),
  ('ORG-118','Breaking Points',array[]::text[],'media_program','US','active','high'),
  ('ORG-119','Fundacion Anomalia',array['Fundación Anomalía']::text[],'civilian_research','ES','active','high')
on conflict (org_id) do nothing;

-- 3. Variant alias backfill (idempotent)
insert into public.org_aliases (normalized_alias, org_id)
select distinct v, o.org_id from (select org_id, org_name, aliases from public.organizations) o, lateral (
  select public.norm_entity_name(o.org_name) v
  union select public.norm_entity_name(regexp_replace(o.org_name, '\(.*?\)', '', 'g'))
  union select public.norm_entity_name(regexp_replace(o.org_name, '^the ', '', 'i'))
  union select public.norm_entity_name(t) from unnest(string_to_array(o.org_name, '/')) t
  union select public.norm_entity_name(a) from unnest(coalesce(o.aliases, '{}')) a
) u where v is not null and v <> '' and length(v) > 1
on conflict (normalized_alias) do nothing;

-- 4. Views (graph_edges gains the co_show kind; mint queue filter expanded)
create or replace view public.graph_edges as
 SELECT 'app-'::text || a.appearance_id AS edge_id,
    'person'::text AS source_kind,
    a.person_id AS source_id,
    'podcast'::text AS target_kind,
    a.podcast_id AS target_id,
    'appearance'::text AS kind,
    1 AS weight
   FROM appearances a
UNION ALL
 SELECT (('guest-'::text || e.episode_id::text) || '-'::text) || (g.value ->> 'person_id'::text) AS edge_id,
    'person'::text AS source_kind,
    g.value ->> 'person_id'::text AS source_id,
    'episode'::text AS target_kind,
    e.episode_id::text AS target_id,
    'guest'::text AS kind,
    1 AS weight
   FROM episodes e,
    LATERAL jsonb_array_elements(e.guests) g(value)
  WHERE (g.value ->> 'person_id'::text) IS NOT NULL
UNION ALL
 SELECT (('coapp-'::text || t.x) || '-'::text) || t.y AS edge_id,
    'person'::text AS source_kind,
    t.x AS source_id,
    'person'::text AS target_kind,
    t.y AS target_id,
    'co_appearance'::text AS kind,
    t.w AS weight
   FROM ( SELECT LEAST(a.person_id, b.person_id) AS x,
            GREATEST(a.person_id, b.person_id) AS y,
            count(DISTINCT a.source_url)::integer AS w
           FROM appearances a
             JOIN appearances b ON b.source_url = a.source_url AND b.person_id > a.person_id
          WHERE a.source_url IS NOT NULL
          GROUP BY (LEAST(a.person_id, b.person_id)), (GREATEST(a.person_id, b.person_id))) t
UNION ALL
 SELECT (('coshow-'::text || t.x) || '-'::text) || t.y AS edge_id,
    'person'::text AS source_kind,
    t.x AS source_id,
    'person'::text AS target_kind,
    t.y AS target_id,
    'co_show'::text AS kind,
    t.w AS weight
   FROM ( SELECT LEAST(a.person_id, b.person_id) AS x,
            GREATEST(a.person_id, b.person_id) AS y,
            count(DISTINCT a.podcast_id)::integer AS w
           FROM appearances a
             JOIN appearances b ON b.podcast_id = a.podcast_id AND b.person_id > a.person_id
          GROUP BY (LEAST(a.person_id, b.person_id)), (GREATEST(a.person_id, b.person_id))
         HAVING count(DISTINCT a.podcast_id) >= 2) t
UNION ALL
 SELECT (('costory-'::text || t.x) || '-'::text) || t.y AS edge_id,
    'person'::text AS source_kind,
    t.x AS source_id,
    'person'::text AS target_kind,
    t.y AS target_id,
    'co_story'::text AS kind,
    t.w AS weight
   FROM ( SELECT LEAST(a.entity_id, b.entity_id) AS x,
            GREATEST(a.entity_id, b.entity_id) AS y,
            count(DISTINCT a.story_id::text)::integer AS w
           FROM story_entities a
             JOIN story_entities b ON b.story_id = a.story_id AND b.entity_id > a.entity_id
          WHERE a.entity_type = 'person'::text AND b.entity_type = 'person'::text
          GROUP BY (LEAST(a.entity_id, b.entity_id)), (GREATEST(a.entity_id, b.entity_id))) t
UNION ALL
 SELECT (('aff-'::text || p.person_id) || '-'::text) || oa.org_id AS edge_id,
    'person'::text AS source_kind,
    p.person_id AS source_id,
    'organization'::text AS target_kind,
    oa.org_id AS target_id,
    'affiliation'::text AS kind,
    1 AS weight
   FROM people p
     CROSS JOIN LATERAL unnest(COALESCE(p.affiliations, '{}'::text[])) a(a)
     JOIN org_aliases oa ON oa.normalized_alias = norm_entity_name(a.a)
  WHERE norm_entity_name(a.a) <> ''::text
UNION ALL
 SELECT (((('story-'::text || se.story_id::text) || '-'::text) || se.entity_type) || '-'::text) || se.entity_id AS edge_id,
    'story'::text AS source_kind,
    se.story_id::text AS source_id,
    se.entity_type AS target_kind,
    se.entity_id AS target_id,
    'story_entity'::text AS kind,
    1 AS weight
   FROM story_entities se
UNION ALL
 SELECT 'ep-'::text || e.episode_id::text AS edge_id,
    'podcast'::text AS source_kind,
    e.podcast_id AS source_id,
    'episode'::text AS target_kind,
    e.episode_id::text AS target_id,
    'episode'::text AS kind,
    1 AS weight
   FROM episodes e
UNION ALL
 SELECT 'xpost-'::text || x.post_id AS edge_id,
    'person'::text AS source_kind,
    x.person_id AS source_id,
    'x_post'::text AS target_kind,
    x.post_id AS target_id,
    'x_post'::text AS kind,
    1 AS weight
   FROM x_posts x
  WHERE x.person_id IS NOT NULL
UNION ALL
 SELECT (('host-'::text || pc.podcast_id) || '-'::text) || pnn.person_id AS edge_id,
    'podcast'::text AS source_kind,
    pc.podcast_id AS source_id,
    'person'::text AS target_kind,
    pnn.person_id AS target_id,
    'host'::text AS kind,
    1 AS weight
   FROM podcasts pc
     CROSS JOIN LATERAL unnest(COALESCE(pc.host_names, '{}'::text[])) h(h)
     JOIN person_name_norm pnn ON pnn.norm = norm_entity_name(h.h)
  WHERE norm_entity_name(h.h) <> ''::text;;

create or replace view public.org_mint_candidates as
 SELECT norm_entity_name(a.a) AS normalized,
    min(a.a) AS example_raw,
    count(*) AS n
   FROM people p
     CROSS JOIN LATERAL unnest(COALESCE(p.affiliations, '{}'::text[])) a(a)
  WHERE norm_entity_name(a.a) <> ''::text AND (norm_entity_name(a.a) <> ALL (ARRAY['author'::text, 'artist'::text, 'experiencer'::text, 'journalist'::text, 'researcher'::text, 'scientist'::text, 'professor'::text, 'writer'::text, 'editor'::text, 'producer'::text, 'host'::text, 'podcaster'::text, 'blogger'::text, 'historian'::text, 'physicist'::text, 'filmmaker'::text, 'photographer'::text, 'engineer'::text, 'pilot'::text, 'witness'::text, 'contactee'::text, 'veteran'::text, 'retired'::text, 'ufologist'::text, 'broadcaster'::text, 'commentator'::text, 'attorney'::text, 'lawyer'::text, 'economist'::text, 'analyst'::text, 'executive'::text, 'founder'::text, 'ceo'::text, 'entrepreneur'::text, 'investor'::text, 'consultant'::text, 'activist'::text, 'advocate'::text, 'politician'::text, 'senator'::text, 'congressman'::text, 'representative'::text, 'officer'::text, 'youtube'::text, 'public'::text, 'us government'::text, 'us president'::text, 'astronomer'::text, 'contactee movement'::text, 'independent journalist'::text, 'french author'::text, 'contactee lecturer'::text, 'academia'::text, 'contactee'::text, 'lecturer'::text, 'speaker'::text, 'columnist'::text, 'blogger'::text, 'you tuber'::text, 'youtuber'::text])) AND NOT (EXISTS ( SELECT 1
           FROM org_aliases oa
          WHERE oa.normalized_alias = norm_entity_name(a.a)))
  GROUP BY (norm_entity_name(a.a))
  ORDER BY (count(*)) DESC;;
