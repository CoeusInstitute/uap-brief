# UAP Brief — Master Agent Brief

> **Audience:** Any AI agent (or human) that needs a single authoritative briefing before working on UAP Brief.
> **Purpose:** Explain what UAP Brief is, why it exists, who it serves, what it does, and how agents should reason about it.
> **How to use:** Read this first. Then follow `docs/knowledge/00-routing-map.md` and the `AGENTS.md` chain. The intended-system spec is `SYSTEM_BRIEF.md`.
> **Evidence sources:** `SYSTEM_BRIEF.md` (2026-09-14), `dataset/DATA_DICTIONARY.md`, `README.md`, `docs/adr/0001-stack-and-repo-layout.md`. If code and this brief disagree, code wins.

---

## 1. One-sentence definition

**UAP Brief** is a public intelligence brief that turns scattered UAP/UFO news, podcasts, and social posts into scored, sourced, navigable knowledge about the people, claims, and coverage of the field.

**Marketing one-liner:** Everything happening in UAP news, who is driving it, and how much weight each story deserves, with the receipts.

### 60-second agent briefing

If you remember only six things:

1. **Who it serves:** People following the UAP/UFO space who want signal triage and context, not another rumor feed.
2. **What problem it solves:** Material quality varies wildly; readers cannot see who is talking, what evidence exists, or the likely function of a story.
3. **What UAP Brief does:** Ingests curated news, detects relevant podcast episodes, tracks prominent X accounts (gated), scores items on quality/function tags, and presents people and coverage with provenance.
4. **Why it is different:** Every score ships with rationale, evidence, and confidence; people have living pages; the graph is explorable.
5. **What users achieve:** Scan a scored daily feed, drill into a story or person, see the network, and check the methodology.
6. **What to invite someone to do:** Open the feed, read the assessment line, then open a story or the people bench.

**Default positioning:** A Coeus Institute public brief that scores coverage, not people.
**Primary proof mechanism:** Show the assessment line on the feed, then chips, rationale, and the source link on the story.

## 2. In plain language

The UAP field publishes constantly: news blogs, hearings, podcasts, leaks, and commentary. Quality ranges from official records to unfalsifiable mysticism. This product collects that material, keeps the receipts, and scores the *item* on owner-specified tags such as `WOO`, `CREDIBLE`, and `VETTED`.

The seed registry lists 849 people, 78 shows, 119 appearances, 90 timeline records, and 47 organizations. Hosted tables and public views are seeded; the wiki reads those views. P2/P3/P6 Edge Functions collect and score material; the public feed stays empty until Ready rows exist.

### Plain-language glossary

| Plain term | What it actually means |
|---|---|
| Registry | Master people/shows/orgs/timeline in `dataset/` |
| Story | One canonical news URL |
| Score | Per-tag intensity plus rationale and stored components |
| Ready | Only status the public may see |
| Item | Anything scored: story, episode, or post |

### The one-paragraph version

UAP Brief is a Coeus public site that will ingest UAP news and episodes, score each item with a documented hybrid method, and let readers open the people and the graph behind the coverage.

### What it is not

- Not a rumor feed or a person-labeling dossier
- Not The Bias Brief (different scores; same stack shape)
- Not a claim that any extraordinary event is true

## 3. What it is

| Aspect | Fact |
|---|---|
| Product type | Public Next.js App Router site + hosted Supabase (P1 schema and registry seed applied) |
| Domain | UAP/UFO public discourse / intelligence brief |
| Primary data / input | `dataset/` registry CSVs; later, eight curated news sources |
| Secondary data / input | Podcast feeds (P6); official X API (gated) |
| Owner / builder | Michai Morin / Coeus Institute |
| License | Public GitHub `CoeusInstitute/uap-brief` (empty remote as of brief) |
| Deploy target | Vercel TBD; Supabase `agrijbcilmymfsnkdpoh` |

## 4. Why it exists

Readers cannot triage volume or see methodology. **UAP Brief’s job is to show how much weight a story deserves, and why, without scoring the person.**

## 5. Targeted demographic

### Primary buyers and users

| Persona | Typical roles | Primary question | Session pattern |
|---|---|---|---|
| Field follower | Researchers, journalists, curious public | "What happened, who is involved, and how much weight?" | Daily brief scan, then person or story drill-in |

### Design audience assumption

Dark, low-glare Graphite surfaces. Soft off-whites, muted panels, accents for data. AA contrast. Motion never gates reading.

## 6. Use cases (what people actually do)

| Use case | Typical path | Outcome |
|---|---|---|
| Scan the feed | `/` → filter → `/story/[id]` | Weight and rationale at a glance |
| Look up a person | `/people` terminal index → `/people/[id]` | Attributed claims, appearances, sources |
| Inspect method | `/methodology` | Formulas and limitations |

## 7. Features and functions

### 7.1 Core surfaces

| Feature | Job-to-be-done | Deep doc |
|---|---|---|
| **News Brief (M1)** | Scored daily feed | `SYSTEM_BRIEF.md` §4 |
| **Podcast Intelligence (M2)** | Relevant episodes from 50k+ shows | `SYSTEM_BRIEF.md` §4 |
| **X Monitor (M3)** | Posts from prominent accounts (gated) | `SYSTEM_BRIEF.md` §4 |
| **People Wiki (M4)** | Living person/org/event pages | `SYSTEM_BRIEF.md` §4 |
| **Graph and Analytics (M5)** | 2D appearance network + stored-row analytics | `SYSTEM_BRIEF.md` §4; `AGENTS.md` superseded 3D |

### 7.3 Scoring subsystem

Hybrid model + deterministic mix. Active methodology is `mix_v2` / `score_v2` (`docs/adr/0003-tag-set-mix-v2.md`). Review is floors only. The feed shows an assessment line (one caution tag paired with one substance tag). Tag set stays in `SYSTEM_BRIEF.md` §5.

### 7.4 Pages and features in plain language

The home page is a news-desk feed (sticky search, lead slot with featured image, 16:9 thumbnail story rows with a 2–5 sentence model brief; single column, no rails) patterned on The Bias Brief. Graphite still owns visuals. `/` and `/story/[id]` read `stories_public` (summary, image, scores, components, entities). Rows show the assessment line. Until Ready rows exist the desk stays empty. Person pages also read `story_entities_public`, `episodes_public` guests, and `x_posts_public`. People, podcasts, and organizations browse via a Graphite `.g-terminal` name station (type or pick a letter, name list, dossier). Events use the same station with a decade rail. Record pages are the bench; stored names and ids link when they match a registry row. Person timelines scrub by decade when more than one decade is present. Methodology reads `methodology_public`. Graph is a 2D appearance network with a name list and a reduced-motion list fallback. Analytics is dynamic and reads `tag_stats`, `tag_trends`, `entity_stats`, and `source_stats`.

### Reserved / not fully shipped (do not invent as live)

3D graph, Vercel project/domain.

## 10. How the system works (agent-critical shape)

```
dataset/ CSVs  →  hosted registry tables + public views (P1 applied)
curated sources → Edge ingest → stories → match → score → review → Ready views
trace collectors → enrichment_queue → enrich-dossier → person_sources / person_links / appearances
Next.js (anon) → public views only
```

### Hard boundaries

- Secrets only in Supabase Edge Function secrets / Vault. Never in the repo or browser.
- Anon reads public views only. Service-role writes from Edge Functions, the seed script, and `tools/enrich/queue-load.mjs`.
- Score material, not people.
- Cookie-session X scraping is not an approved route.
- Dossier records require an `http(s)` URL. Unknown stays unknown.

## 11. Public surfaces agents should know

| Surface | URL / path |
|---|---|
| Feed | `/` |
| Story | `/story/[id]` |
| People | `/people`, `/people/[id]` |
| Podcasts | `/podcasts`, `/podcasts/[id]` |
| Organizations | `/organizations`, `/organizations/[id]` |
| Events | `/events`, `/events/[id]` |
| Graph | `/graph` |
| Analytics | `/analytics` |
| Methodology | `/methodology` |
| About | `/about` |
| Supabase | `https://agrijbcilmymfsnkdpoh.supabase.co` |

## 12. Value proposition (keep this framing)

For people following UAP coverage, UAP Brief delivers:

1. A scored news feed with receipts
2. A sourced people bench
3. A network view of who appears where

## 14. Working agreements for agents

- Current phase: P1–P5 reading desk is in place. P2/P3/P6 pipelines are unblocked (owner, 2026-09-16). P7 Wave 1 dossier enrichment landed 2026-09-16; Waves 2–4 remain. Discover feeds; do not invent RSS, scores, subscriber counts, follower floors, or source URLs.
- TBB is the stack/pipeline sibling and the home composition pattern, not the scoring model or visual kit.
- Graphite kit is the visual contract. Cute or scaffolding copy on the front door is a defect. People directory rows open a detached `.desk-window` (max 8) filled with `.desk-record` (the person record). The directory inspector stays the thin dossier. Titlebar `page` opens `/people/[id]`.
- Prefer `unknown` over invention.
