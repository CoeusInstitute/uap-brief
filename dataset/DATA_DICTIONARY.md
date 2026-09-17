# UAP Brief data dictionary

**What this is:** the field dictionary and controlled vocabularies for the canonical data files in `dataset/`. It documents what each column means and which values are allowed.

**Rule zero:** a blank cell means unknown or not confidently verified. It never means false, zero, or inapplicable. Extraordinary claims stay unverified here; this dictionary describes how the data is structured, not whether any claim in it is true.

---

## 1. Global conventions

| Convention | Rule |
|---|---|
| Encoding | UTF-8 with BOM, RFC 4180 quoting. |
| Multi-value cells | `|` delimiter (pipe). Never commas. |
| Dates | ISO at variable resolution: `YYYY`, `YYYY-MM`, `YYYY-MM-DD`. `date_precision` carries `day` / `month` / `year` / `range` / `unknown`. |
| `present` | Active or still publicly relevant, not necessarily continuously active. |
| Confidence values | `high` / `medium` / `low`, row-level. `low` means lead-to-verify, not wrong. |
| Ids | `UP-####` person, `POD-###` show, `APP-###` appearance, `EVT-###` event, `STM-###` statement, `ORG-###` org. `census_id` / `seed_id` preserve original ids from the pre-merge source datasets. |
| Provenance | `data_sources` on people: `census` / `census+seed` / `seed` / `added`. `provenance` on appearances and timeline: `seed_corpus` / `added`. |
| Source priority for fact-checking | `primary_official` / `primary_or_institutional` first, then scholarly work, then `primary_organization`, then reported media, then `secondary_reference` / `secondary_directory` (discovery-grade only). |

---

## 2. `people.csv` (849 rows, 43 fields)

### Person photo fields (added 2026-09-16, Track F)
| Field | Values | Notes |
| --- | --- | --- |
| photo_url | URL or null | Public storage URL (`person-images/<person_id>.<ext>`); frontend displays on person card. |
| photo_source_url | URL or null | Provenance page. |
| photo_source_type | wikipedia / wikidata / web_profile / official_site / x_avatar / youtube_avatar / squad_verified / web_search | How the image was obtained. |
| photo_confidence | high / medium / low | high = wiki/wikidata/verified-account portrait; medium = site/og or avatar that may be a logo. |
| photo_checked_at | timestamp | Last lookup attempt (misses included). |
| photo_notes | text | QC flags (duplicate hash, low-res, deferrals). |

The master person registry. One row per person.

| Field | Type | Definition |
|---|---|---|
| `person_id` | id | Canonical id `UP-####`. Stable within this release. |
| `name` | string | Most common public name. |
| `aliases` | multi-value | Alternate names, diacritics, nicknames, ranks, public identities. |
| `birth_date` | ISO date | Blank when not confidently verified. |
| `death_date` | ISO date | Same convention. Blank does not imply living. |
| `status` | enum | `active` / `retired` / `deceased` / `unknown`. |
| `primary_role` | controlled | One best-fit role for grouping (12 values, section 3.1). |
| `role_tags` | multi-value | Additional roles and functional tags. |
| `prominence_tier` | controlled | `1_core` / `2_major` / `3_notable`. Editorial importance to the discourse, not credibility. Blank = untiered. |
| `country_or_region` | string | Primary geographic context, not necessarily nationality. |
| `activity_period` | range | `YYYY-YYYY` or `YYYY-present`. |
| `first_uap_activity_year` / `last_uap_activity_year` | year / year or `present` | Machine-friendly bounds. |
| `key_event_dates` | multi-value | Dated events: sightings, publications, appointments, hearings, controversies. |
| `affiliations` | multi-value | Government, military, academic, corporate, media, movement affiliations. |
| `positions_or_titles` | string | Group-level role descriptor where useful. |
| `works_or_platforms` | multi-value | Books, papers, shows, podcasts, films, reports, platforms. |
| `stance_category` | controlled | Census vocabulary (section 3.2). Blank where not classified. |
| `stance_seed` | enum | Second vocabulary retained from a source dataset (section 3.2). |
| `position_statement_summary` | attributed text | Concise description of the person's public position. |
| `key_claims_or_contributions` | attributed text | Search/tag-friendly contribution text. |
| `evidence_basis` | multi-value | Main public basis: official record, testimony, publication, analysis, self-report. |
| `claim_status` | controlled | The nature of the claim or role, never a truth score (section 3.3). |
| `seed_claim_status` | open | Raw value(s) from a source dataset; open vocabulary, not controlled. |
| `record_confidence` | controlled | Confidence in role/context versus need to verify claims. |
| `seed_confidence` | enum | `high` / `medium` / `low` (source dataset). |
| `controversies_or_counterpoints` | text | Recurring caution, alternative explanation, limitation. |
| `first_public_date` | ISO date | Earliest public presence recorded for the person. |
| `associated_podcast_ids` | multi-value | `POD-###` references. |
| `source_1_title` / `source_1_url` / `source_1_type` | text | Person- or case-level source. |
| `source_2_title` / `source_2_url` / `source_2_type` | text | Corroborating source. |
| `source_count` | int | Count of populated source URLs. |
| `data_sources` | enum | `census` / `census+seed` / `seed` / `added`. |
| `census_id` / `seed_id` | id | Original ids where applicable. |
| `merge_note` | text | Provenance note recorded when a row was assembled from multiple sources; blank for natively sourced rows. |
| `last_verified` | ISO date | Research cutoff for the row's sources. |
| `date_precision_notes` | text | Explains partial or blank biographical dates. |
| `research_notes` | text | Enrichment notes. |

### Counts at a glance

- `data_sources`: census 291, census+seed 141, seed 74, added 343.
- `prominence_tier`: `2_major` (329) · `1_core` (93) · `3_notable` (10).
- `status`: `active` (505) · `deceased` (135) · `retired` (2) · `unknown` (1).
- `record_confidence`: `moderate_contextual` (281) · `high_for_role_not_necessarily_claims` (101) · `mixed_claims_need_independent_verification` (50) · `medium` (3).
- `primary_role` unassigned rows: 20.

---

## 3. Controlled vocabularies

### 3.1 `primary_role` (12 values; counts across all 849 rows)

`scientist_or_technical_expert` (174) · `journalist_host_or_filmmaker` (149) · `investigator_author_or_organization_leader` (82) · `witness_or_experiencer` (77) · `government_official` (73) · `author_or_cultural_figure` (69) · `historical_government_or_program_figure` (55) · `skeptic_or_critical_analyst` (47) · `military_intelligence_insider_or_claimant` (35) · `contactee_or_religious_figure` (30) · `organization_leader_or_advocate` (22) · `whistleblower_or_official_witness` (16)

### 3.2 Stance vocabularies

`stance_category`: `investigation_or_advocacy` (67) · `media_or_public_discourse` (62) · `institutional_or_historical` (55) · `scientific_open_inquiry` (50) · `firsthand_testimony` (46) · `institutional_or_policy` (31) · `claimed_contact_or_revelation` (30) · `skeptical_or_conventional` (25) · `insider_claim_or_disclosure` (20) · `scientific_agnostic` (15) · `disclosure_advocacy_or_testimony` (12) · `organizational_leadership` (10) · `interpretive_or_popularizing` (9)

`stance_seed`: `proponent_anomaly` (53) · `transparency_advocate` (46) · `agnostic_scientific` (44) · `proponent_nhi` (26) · `experiencer` (13) · `journalist_neutral` (8) · `official_government` (7) · `historical` (7) · `skeptic_prosaic` (6) · `contested` (2) · `skeptic_leaning` (1) · `experiencer_advocate` (1) · `n/a` (1)

### 3.3 `claim_status`

`documented_official_role` (86) · `analytical_interpretation_or_advocacy` (67) · `reporting_or_commentary` (63) · `analytical_interpretation` (52) · `firsthand_testimony` (46) · `self_reported_contact` (30) · `critical_analysis` (25) · `firsthand_or_secondhand_allegation` (20) · `institutional_scientific_assessment` (15) · `firsthand_or_attributed_testimony` (12) · `documented_organizational_role` (10) · `interpretive_or_speculative` (9)

### 3.4 Source types

`primary_official` · `primary_or_institutional` · `primary_organization` · `scholarly_preprint` · `secondary_reference` · `secondary_directory` · `secondary_analysis` · `appearance_record` (a documented appearance/presentation) · `primary_media_account` (the person's own public account).

### 3.5 `data_sources` / provenance values

`census` / `census+seed` / `seed` / `added`.

---

## 4. `podcasts.csv` (78 rows, 23 fields)

One row per show, including harvest endpoints.

| Field | Definition |
|---|---|
| `podcast_id` / `podcast_name` / `aliases` / `host_names` / `network_producer` / `country` / `launch_date` / `date_precision` / `status` / `cadence` / `avg_length_min` | Identity and cadence fields. |
| `focus_tags` | multi-value subject tags. |
| `reach_tier` | `tier3_niche` (38) · `tier2_established` (25) · `tier1_mainstream` (8) · `tier1_major` (7) |
| `category` | `uap_core` (38) · `mainstream_adjacent` (8) · `experiencer` (4) · `regional` (4) · `org_affiliated` (3) · `comedy_adjacent` (3) · `narrative_documentary` (2) · `history_culture` (2) · `legacy_radio` (2) · `uap_adjacent_major` (1) · `witness_testimony` (1) · `panel` (1) · `science` (1) · `academic_philosophy` (1) · `analysis` (1) · `culture` (1) · `archive` (1) · `journalism` (1) · `skeptic` (1) · `media_outlet` (1) · `paranormal_adjacent` (1) |
| `primary_url` | Canonical show page. |
| `feed_url` | Verified RSS/Atom feed when known. |
| `apple_lookup` | `itunes:<id>` when known. |
| `youtube_url` | Channel URL for YouTube-first shows. |
| `feed_discovery_status` | `verified_feed` / `observed_apple_id` / `name_lookup` / `youtube_only` / `youtube_first` (blank when no endpoint row yet). |
| `notable_recurring_guests` | multi-value. |
| `notes` | Curation notes. |
| `confidence` / `last_verified` | Row confidence and research cutoff. |

---

## 5. `appearances.csv` (119 rows, 13 fields)

A person-to-show edge. Only edges with a retrievable source are present; the full edge set comes from the episode harvester.

| Field | Definition |
|---|---|
| `appearance_id` | `APP-###` / `APP-AD-###`. |
| `person_id` / `person_name` | Person reference (`UP-####`), name denormalized. |
| `podcast_id` / `podcast_name` | Show reference. |
| `role` | `guest` (67) · `host` (21) · `subject_of_episode` (18) · `recurring_guest` (7) · `co_host` (3) · `recurring_co_host` (2) · `co_producer` (1) `subject_of_episode` matters: an episode about a person is not that person appearing. |
| `episode_title` / `episode_date` / `date_precision` | Blank date = source carried no date; never guessed. |
| `topic_tags` | multi-value. |
| `source_url` | Where the edge is evidenced. |
| `confidence` | Row-level. |
| `provenance` | `seed_corpus` / `added`. |

---

## 6. `timeline.csv` (90 rows, 16 fields)

Unified dated record. `record_type` = `event` (52) or `statement` (38).

| Field | Definition |
|---|---|
| `record_id` | `EVT-###` / `STM-###`. |
| `record_type` | `event` / `statement`. |
| `category` | Events: original event type (sighting, incident, program, policy, hearing, media, report, ...). Statements: venue type (`congressional_hearing`, `podcast`, `press_event`, `media_interview`, ...). |
| `date` / `date_precision` | ISO date at source-supported resolution. |
| `title` | Events: event name. Statements: `Person - Venue`. |
| `actors` | Participants, multi-value. |
| `person_id` | Populated for statements, blank for events. |
| `venue` | Events: jurisdiction. Statements: venue name. |
| `summary` | What happened or what was said. |
| `significance` | Events only: outcome or significance. |
| `claim_status` / `topic_tags` | Statements only. |
| `source_url` / `confidence` / `provenance` | As elsewhere. |

---

## 7. `organizations.csv` (47 rows, 13 fields)

`org_id`, `org_name`, `aliases`, `org_type` (government office/program, congressional body, civilian research, scientific nonprofit, advocacy, private company/contractor, media outlet, podcast network, skeptic organization, `alleged_program`, ...), `country`, `founded_date`, `date_precision`, `dissolved_date`, `status` (`active` (39) · `historical` (7) · `alleged` (1)), `key_people` (multi-value), `role_in_discourse`, `url`, `confidence`.

`alleged_program` / `alleged` are used exactly where the public record is claim-based; derived views must not upgrade those rows to established fact.

---

## 8. `x_accounts.csv` (seed)

Seed X/Twitter handles for the future X monitor (M3 watchlist). Verification and follower refresh happen once API or cookie access is live.

| Field | Definition |
|---|---|
| `x_handle` | Handle without the `@` (canonical casing from the API once verified). |
| `x_user_id` | X numeric user id from the API; blank until verified. Stable key for timelines and lookups. |
| `ref_type` / `ref_id` | Linked entity (`person` + `UP-####`, or `organization` + `ORG-###`). |
| `display_name` | Name of the linked entity. |
| `followers` | Approximate follower count where registry sources noted one; blank otherwise. |
| `followers_note` | Provenance of the follower figure. |
| `verified` / `last_checked` | Filled by the verification pass (blank until then). |
| `source_url` | Where the handle was found. |
| `found_via` | `url` (a stored link) or `mention` (named in a source note). |
| `all_refs` | All linked refs when a handle appears under multiple entities. |

---

## 9. `news_sources.csv` (222 rows)

Offline seed of the 16 Sep 2026 UAP/UFO website directory. Hosted apply upserts `public.sources` by `homepage_url`. `rss_url` is not stored here; ingest discovers feeds.

| Field | Definition |
|---|---|
| `directory_n` | Directory row number 1–222. |
| `name` | Outlet name from the directory. |
| `homepage_url` | Directory href (topic/section URL when one exists). |
| `category` | `specialist` / `research` / `us_national` / `science_defense` / `uk_ireland` / `canzuk` / `international` / `local` / `primary`. |
| `check_code` | Directory verification key A–D. |
| `language` | ISO 639-1 hint for `fetch_policy` only. Story language is detected later. |
| `activate` | `true` for specialist 1–36, research 37–52, primary 206–222, and listed topic-section newsrooms. `false` for homepage-only general newsrooms. |
| `notes` | Directory coverage/role text. |
