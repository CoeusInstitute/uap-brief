# Graph layer — live, self-growing network edges

The network graph (3D or otherwise) reads **ONE view**: `graph_edges`. It is a **live SQL view**, not a materialized snapshot — every new row anywhere in the graph's sources produces edges on the very next query. No schedulers, no refresh jobs.

## The contract

```sql
select edge_id, source_kind, source_id, target_kind, target_id, kind, weight
from graph_edges;
-- optional filters: where kind = '...' / where source_id = 'UP-XXXX' etc.
```

| Column | Meaning |
|---|---|
| edge_id | stable text id (prefix encodes the kind) |
| source_kind / target_kind | `person` \| `podcast` \| `episode` \| `organization` \| `story` \| `x_post` |
| source_id / target_id | the entity id in its own table (`UP-####`, `POD-###`, `ORG-###`, uuid for episodes/stories) |
| kind | edge type (see below) |
| weight | multiplicity where meaningful (shared episodes/stories), else 1 |

### Edge kinds (as of 2026-09-17: 8,597+ edges total, ~1.3s full scan)

| kind | direction | source tables | grows when |
|---|---|---|---|
| `appearance` | person → podcast | `appearances` | enrichment adds appearance edges |
| `guest` | person → episode | `episodes.guests` (person-matched jsonb) | new episodes / guest matching |
| `co_appearance` | person ↔ person | `appearances` sharing a `source_url` (weight = shared episodes) | more appearances |
| `co_story` | person ↔ person | `story_entities` sharing a story (weight = shared stories) | more stories/entities |
| `co_show` | person ↔ person | both appeared on the same podcast at least twice (weight = shared shows; hub-show singleton pairs excluded as noise) | more appearances |
| `affiliation` | person → organization | `people.affiliations` strings matched via `org_aliases` (accent-aware normalizer v3) | new people, new affiliations, **new orgs/aliases minted** |
| `story_entity` | story → person/org/podcast | `story_entities` | news pipeline writes |
| `episode` | podcast → episode | `episodes` | feed harvesting |
| `host` | podcast → person | `podcasts.host_names` matched via `person_name_norm` | new podcasts / better aliases |
| `x_post` | person → x_post | `x_posts` | X monitoring pipeline (future) |

## How it keeps growing (the design)

- **Automatic (nothing to do):** every edge kind above is a projection of base tables. Insert an appearance, a story, an episode, an x_post — the edge exists immediately. This covers ~95% of graph growth.
- **Curated feeds (the only manual parts), both queued for review:**
  1. **Organizations** — affiliations reference institutions; an affiliation only links when the org (and its alias) exists. `org_mint_candidates` lists unmatched normalized affiliation strings with counts. Procedure: review the top rows → mint real institutions only (conservative; verifiable) → add alias variants → re-run the idempotent alias backfill (in migration `20260917090000_graph_layer.sql`, step 3) → edges appear instantly.
  2. **Person name variants** — `person_name_norm` unions `people.name` + `people.aliases`; `person_aliases` (maintained during enrichment) also feeds matching. New nickname forms should be appended to `people.aliases` when discovered.
- `entity_match_candidates` (from the enrichment pipeline) is the third review queue; resolving entries there improves person resolution everywhere downstream.

## Frontend usage notes

- Single query (`graph_edges`) + entity label lookups from `people_public` / `podcasts_public` / `organizations_public` / `stories_public`.
- `kind` is safe to filter for toggleable layers (e.g. hide `co_story`, weight `appearance` by `weight`).
- Node sizing suggestions: degree counts per entity; `co_story`/`co_appearance` weights give natural link thickness.
- The view is granted to `anon`/`authenticated` (public read), matching the other `*_public` views.

## Verification (rerun any time)

```sql
select kind, count(*) from graph_edges group by 1 order by 2 desc;
select count(*) from org_mint_candidates;   -- curation backlog (was 860 after first pass)
```

