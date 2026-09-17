-- Graph layer (2026-09-17): live, self-growing edge derivation for the network graph.
-- Applied via Management API; this file is the canonical record.
--
-- GROWTH MODEL: graph_edges / person_name_norm / org_mint_candidates are LIVE VIEWS -
-- every new appearance, episode guest, story, affiliation, x_post, host name, or podcast
-- automatically produces edges on the next query. The ONLY curated feeds are:
--   1) organizations + org_aliases (mint from org_mint_candidates; the variant backfill below is idempotent)
--   2) person_aliases (name variants for host/guest matching; maintained by enrichment)
-- Documented procedure: docs/graph-layer.md

-- 1. Normalization helper (single definition shared by all graph matching)
create or replace function public.norm_entity_name(p text)
returns text language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(coalesce(p,'')), 'u\.s\.', 'us', 'g'),
          '&', ' and ', 'g'),
        '[^a-z0-9]+', ' ', 'g'),
      '\y(fmr|former|retired|veteran|intl|ret|witness|whistleblower)\y', '', 'g'),
    ' +', ' ', 'g'))
$$;

-- 2. Minted organizations 2026-09-17 (57 institutions; conservative, verifiable only)
insert into public.organizations (org_id, org_name, aliases, org_type, country, status, confidence) values
  ('ORG-048','United States Air Force',array['USAF','Air Force','U.S. Air Force','US Air Force']::text[],'military_branch','US','active','high'),
  ('ORG-049','United States Navy',array['USN','Navy','U.S. Navy']::text[],'military_branch','US','active','high'),
  ('ORG-050','United States Army',array['Army','U.S. Army']::text[],'military_branch','US','active','high'),
  ('ORG-051','United States Army Air Forces',array['USAAF','U.S. Army Air Forces','Army Air Forces']::text[],'military_branch','US','historical','high'),
  ('ORG-052','United States Department of Defense',array['DoD','Department of Defense','U.S. Department of Defense','Pentagon','Department of War','U.S. Department of War']::text[],'government_department','US','active','high'),
  ('ORG-053','Office of the Director of National Intelligence',array['ODNI']::text[],'government_office','US','active','high'),
  ('ORG-054','Central Intelligence Agency',array['CIA']::text[],'government_agency','US','active','high'),
  ('ORG-055','United States Senate',array['U.S. Senate','Senate']::text[],'legislative_body','US','active','high'),
  ('ORG-056','United States House of Representatives',array['U.S. House','House of Representatives','U.S. House of Representatives','House']::text[],'legislative_body','US','active','high'),
  ('ORG-057','House Committee on Oversight and Accountability',array['House Oversight Committee','Oversight Committee','House Oversight']::text[],'congressional_committee','US','active','high'),
  ('ORG-058','Senate Armed Services Committee',array['SASC']::text[],'congressional_committee','US','active','high'),
  ('ORG-059','Senate Select Committee on Intelligence',array['SSCI']::text[],'congressional_committee','US','active','high'),
  ('ORG-060','White House',array['The White House']::text[],'executive_office','US','active','high'),
  ('ORG-061','Federal Aviation Administration',array['FAA']::text[],'government_agency','US','active','high'),
  ('ORG-062','National Aeronautics and Space Administration',array['NASA']::text[],'government_agency','US','active','high'),
  ('ORG-063','CNES',array['National Centre for Space Studies']::text[],'government_agency','FR','active','high'),
  ('ORG-064','Robertson Panel',array['Robertson Committee']::text[],'historical_panel','US','historical','high'),
  ('ORG-065','Condon Committee',array['University of Colorado UFO Project']::text[],'historical_panel','US','historical','high'),
  ('ORG-066','Republican Party',array['GOP','Republican','Republicans']::text[],'political_org','US','active','high'),
  ('ORG-067','Democratic Party',array['Democrat','Democrats','Democratic']::text[],'political_org','US','active','high'),
  ('ORG-068','Stanford University',array['Stanford']::text[],'university','US','active','high'),
  ('ORG-069','University of Colorado Boulder',array['University of Colorado','CU Boulder']::text[],'university','US','active','high'),
  ('ORG-070','University at Albany, SUNY',array['University at Albany','UAlbany','SUNY Albany']::text[],'university','US','active','high'),
  ('ORG-071','Harvard University',array['Harvard']::text[],'university','US','active','high'),
  ('ORG-072','George Mason University',array['GMU','George Mason']::text[],'university','US','active','high'),
  ('ORG-073','The Ohio State University',array['Ohio State University','Ohio State','OSU']::text[],'university','US','active','high'),
  ('ORG-074','Wellesley College',array['Wellesley']::text[],'university','US','active','high'),
  ('ORG-075','Princeton University',array['Princeton']::text[],'university','US','active','high'),
  ('ORG-076','The Pennsylvania State University',array['Penn State','Penn State University','PSU']::text[],'university','US','active','high'),
  ('ORG-077','National UFO Reporting Center',array['NUFORC']::text[],'civilian_research','US','active','high'),
  ('ORG-078','Society for UAP Studies',array[]::text[],'civilian_research','US','active','high'),
  ('ORG-079','Society for Scientific Exploration',array['SSE']::text[],'civilian_research','US','active','high'),
  ('ORG-080','International Coalition for Extraterrestrial Research',array['ICER']::text[],'research_network','International','active','high'),
  ('ORG-081','Center for Inquiry',array['CFI']::text[],'skeptic_organization','US','active','high'),
  ('ORG-082','CICAP',array[]::text[],'skeptic_organization','IT','active','high'),
  ('ORG-083','Fund for UFO Research',array['FUFOR']::text[],'civilian_research','US','historical','high'),
  ('ORG-084','The Disclosure Forum',array['Disclosure Forum']::text[],'advocacy_policy','US','active','high'),
  ('ORG-085','Coast to Coast AM',array['Coast to Coast','C2C']::text[],'media_program','US','active','high'),
  ('ORG-086','iHeartPodcasts',array['iHeartRadio','iHeart']::text[],'podcast_network','US','active','high'),
  ('ORG-087','The New York Times',array['NYT','New York Times']::text[],'media_outlet','US','active','high'),
  ('ORG-088','The War Zone',array['War Zone','TWZ']::text[],'media_outlet','US','active','high'),
  ('ORG-089','Need to Know',array[]::text[],'media_program','US','active','high'),
  ('ORG-090','Ancient Aliens',array[]::text[],'media_program','US','active','high'),
  ('ORG-091','USS Nimitz',array['Nimitz']::text[],'naval_vessel','US','active','high'),
  ('ORG-092','USS Princeton',array['USS Princeton (CG-59)']::text[],'naval_vessel','US','historical','high'),
  ('ORG-093','RAF Bentwaters',array['Bentwaters']::text[],'military_base','UK','historical','high'),
  ('ORG-094','Malmstrom Air Force Base',array['Malmstrom AFB','Malmstrom']::text[],'military_base','US','active','high'),
  ('ORG-095','Wright-Patterson Air Force Base',array['Wright-Patterson AFB','Wright Field','Wright-Patterson']::text[],'military_base','US','active','high'),
  ('ORG-096','Area 51',array['Groom Lake']::text[],'military_base','US','active','high'),
  ('ORG-097','United States Marine Corps',array['USMC','Marine Corps','U.S. Marine Corps']::text[],'military_branch','US','active','high'),
  ('ORG-098','Defense Intelligence Agency',array['DIA']::text[],'government_agency','US','active','high'),
  ('ORG-099','COMETA',array['Comité d''études approfondies']::text[],'research_committee','FR','historical','high'),
  ('ORG-100','Fox News',array['Fox']::text[],'media_outlet','US','active','high'),
  ('ORG-101','Harvard-Smithsonian Center for Astrophysics',array['Harvard CfA','CfA']::text[],'academic_research','US','active','high'),
  ('ORG-102','House of Representatives of Japan',array['Japan House of Representatives']::text[],'legislative_body','JP','active','high'),
  ('ORG-103','Ariel School',array['Ariel School Ruwa']::text[],'incident_site','ZW','historical','high'),
  ('ORG-104','Varginha',array[]::text[],'incident_site','BR','historical','high')
on conflict (org_id) do nothing;

-- 3. Variant alias backfill (idempotent; re-run after every org mint)
insert into public.org_aliases (normalized_alias, org_id)
select distinct v, o.org_id from (
  select org_id, org_name, aliases from public.organizations
) o, lateral (
  select public.norm_entity_name(o.org_name) v
  union select public.norm_entity_name(regexp_replace(o.org_name, '\(.*?\)', '', 'g'))
  union select public.norm_entity_name(regexp_replace(o.org_name, '^the ', '', 'i'))
  union select public.norm_entity_name(t) from unnest(string_to_array(o.org_name, '/')) t
  union select public.norm_entity_name(t) from unnest(string_to_array(regexp_replace(o.org_name, '\(.*?\)', '', 'g'), '/')) t
  union select public.norm_entity_name(a) from unnest(coalesce(o.aliases, '{}')) a
) u
where v is not null and v <> '' and length(v) > 1
on conflict (normalized_alias) do nothing;

-- 4. Live views
create or replace view public.person_name_norm as
 SELECT people.person_id,
    norm_entity_name(people.name) AS norm
   FROM people
  WHERE people.name IS NOT NULL
UNION
 SELECT p.person_id,
    norm_entity_name(a.a) AS norm
   FROM people p,
    LATERAL unnest(COALESCE(p.aliases, '{}'::text[])) a(a)
  WHERE norm_entity_name(a.a) <> ''::text;;

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
  WHERE norm_entity_name(a.a) <> ''::text AND (norm_entity_name(a.a) <> ALL (ARRAY['author'::text, 'artist'::text, 'experiencer'::text, 'journalist'::text, 'researcher'::text, 'scientist'::text, 'professor'::text, 'writer'::text, 'editor'::text, 'producer'::text, 'host'::text, 'podcaster'::text, 'blogger'::text, 'historian'::text, 'physicist'::text, 'filmmaker'::text, 'photographer'::text, 'engineer'::text, 'pilot'::text, 'witness'::text, 'contactee'::text, 'veteran'::text, 'retired'::text, 'ufologist'::text, 'broadcaster'::text, 'commentator'::text, 'attorney'::text, 'lawyer'::text, 'economist'::text, 'analyst'::text, 'executive'::text, 'founder'::text, 'ceo'::text, 'entrepreneur'::text, 'investor'::text, 'consultant'::text, 'activist'::text, 'advocate'::text, 'politician'::text, 'senator'::text, 'congressman'::text, 'representative'::text, 'officer'::text])) AND NOT (EXISTS ( SELECT 1
           FROM org_aliases oa
          WHERE oa.normalized_alias = norm_entity_name(a.a)))
  GROUP BY (norm_entity_name(a.a))
  ORDER BY (count(*)) DESC;;

-- 5. Grants (public read for the app)
grant select on public.graph_edges to anon, authenticated;
grant select on public.org_mint_candidates to anon, authenticated;
