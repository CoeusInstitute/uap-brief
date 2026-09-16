# UAP Brief: intended system brief

**Audience:** any AI agent (or human) who will design, build, or extend the UAP Brief system.
**Purpose:** a single authoritative description of what the system is intended to be, what it must do, and how its parts fit together, so a dev agent can design the real thing without re-litigating the intent.
**Status:** pre-build. The data foundation exists (this repo). The app, the Supabase schema, and the scoring engine do not yet.
**Owner:** Michai Morin (Coeus Institute). Written 2026-09-14.
**Authority:** if built code and this brief ever disagree, the code wins, then this brief gets fixed.

### Table of contents

1. Definition and 60-second briefing
2. Context, constants, and what exists today
3. Requirements traceability (owner's asks mapped to modules)
4. Product pillars (M1 to M5)
5. Scoring system design brief (the core methodology task)
6. Monitored sources
7. Data model (Supabase)
8. Edge functions and pipeline
9. Entity resolution and merge policy
10. UI and UX direction
11. Stack and repository conventions
12. Guardrails and editorial standards
13. Roadmap with exit criteria
14. Open questions for the owner

---

## 1. Definition and 60-second briefing

**One sentence:** UAP Brief is a public intelligence brief for the UAP/UFO discourse that turns scattered news, podcasts, and social posts into scored, sourced, navigable knowledge about the people, claims, and coverage of the field.

**One-liner for a user:** "Everything happening in UAP news, who is driving it, and how much weight each story deserves, with the receipts."

If you remember only six things:

1. **Who it serves:** people following the UAP/UFO space who want signal triage and context, not another rumor feed.
2. **What problem it solves:** the space is flooded with material of wildly different quality; readers cannot see who is talking, what evidence exists, or the likely function of a story (information, speculation, entertainment, or influence operation).
3. **What it does:** ingests news from curated UAP outlets and mainstream coverage, detects UAP-relevant episodes from large podcasts (50k+ reach), tracks posts from prominent figures (20k+ X accounts), scores every item on quality and function tags with numeric intensities (for example `WOO 8.5`, `CREDIBLE 6`, `PSYOP 9`), and presents it all with provenance.
4. **Why it is different:** every score ships with a rationale, the evidence behind it, and a confidence level; people and organizations have living pages; the whole graph is explorable in 3D.
5. **What users achieve:** scan a scored daily brief, drill into any story or person, see the network of who appears where, and check the methodology behind every judgment.
6. **What to invite someone to do:** open the brief, filter by tag or entity, then open the graph.

**Sibling product:** The Bias Brief (TBB) at `D:\My apps\The_Bias_Brief`, public repo `CoeusInstitute/TBB`, is the reference implementation for stack, pipeline shape, and editorial discipline. UAP Brief mirrors TBB's architecture unless stated otherwise. Do not copy TBB's bias scoring; UAP Brief scores different qualities (section 5).

---

## 2. Context, constants, and what exists today

| Constant | Value |
|---|---|
| Project folder | `D:\My apps\UAP_Brief` |
| GitHub repo | `https://github.com/CoeusInstitute/uap-brief` (public; currently empty, no commits) |
| Supabase project | `https://agrijbcilmymfsnkdpoh.supabase.co` (project ref `agrijbcilmymfsnkdpoh`) |
| Primary AI model | `deepseek/deepseek-v4.1-flash` via OpenRouter, reasoning effort high |
| API secrets | Supabase Edge Function secrets in the UAP-Brief project: `OPENROUTER_API` and `X_BEARER_TOKEN` (both set; the X token is verified working 2026-09-15). Never in the repo, never in the browser. |
| Reference implementation | The Bias Brief (Next.js + Supabase + Edge Functions + OpenRouter + Vercel) |

**What exists today (Phase 0, complete):**

- `dataset/` holds the registry: 849 people, 78 shows, 119 appearance edges, 90 timeline records (events + statements), 47 organizations. Every row carries its source links. Import-ready.
- `dataset/DATA_DICTIONARY.md` documents every column, vocabulary, and convention.
- `tools/harvest.py` expands appearance edges from show feeds (RSS/iTunes/YouTube); a two-column rename (`full_name`/`aka` to `name`/`aliases`) is needed before use.

**What does not exist yet:** the web app, the Supabase schema, the ingest and scoring functions, the X module, and the graph.

---

## 3. Requirements traceability (owner's asks mapped to modules)

| Owner's requirement (verbatim intent) | Delivered by |
|---|---|
| Master dataset, deduplicated, with associated data | `dataset/people.csv` (849), plus shows, edges, timeline, orgs; Supabase import in Phase 1 |
| Pages for all individuals, movers, shakers, prominent in the space | M4 People Wiki |
| A cool three.js (or equivalent) 3D network graph | M5 Graph and Analytics |
| A wiki | M4 People Wiki (entity pages as the wiki substrate) |
| Intelligently list new podcast episodes involving UAP/UFO or tied individuals | M2 Podcast Intelligence |
| News items covering the topic, from the listed sources | M1 News Brief |
| YouTube podcast episodes from bigger shows, 50k+ followers | M2 (configurable reach threshold) |
| X posts about the topic from prominent players (20k+ accounts) | M3 X Monitor (gated on access decision) |
| Story scoring: psyop / woo / nonsense / interesting / potential / lacking data / vetted / credible, with a score per tag and an open-ended "etc." | Section 5 scoring system |
| Well-designed Supabase edge functions | Sections 7 and 8 |
| Primary model deepseek/deepseek-v4.1-flash, OpenRouter secret | Section 2 constants; section 8 secrets |
| Design must look cool, motion graphics, animated SVG, hover effects, yet be easy to navigate, read, and assess | Section 10 UI and UX direction |

---

## 4. Product pillars

### M1. News Brief

**What:** ingest UAP-related news from the curated source list (section 6), dedupe, score each item, and present a filterable feed and story pages.

**Requirements:**
- Each story: canonical URL, outlet, title, published date, fetched date, short extract, entities mentioned, tag scores with rationale, provenance.
- Dedupe across outlets covering the same event (cluster by title similarity + URL + entities, keep the earliest or most authoritative as the canonical item, list siblings as "also covered by").
- Filters: tag, tag intensity range, outlet, entity, date, story form (news / analysis / opinion / press release / podcast / video).
- Mainstream coverage (for example PBS) is first-class input; it anchors the baseline while specialist outlets carry the volume.

**Why:** this is the front door and the daily habit.

### M2. Podcast Intelligence

**What:** detect new podcast episodes that are UAP-relevant and come from shows at or above the reach threshold (owner default: 50k subscribers/followers), and link each episode to the people it involves.

**Requirements:**
- Show registry seed: `dataset/podcasts.csv` (78 shows with feed endpoints); expansion targets include Breaking Points, UAP Studies, Anomalous Podcast Network, and an international tranche.
- Two ingestion channels: RSS/Atom where available; YouTube (channel feeds or API) for YouTube-first shows. Reuse `harvest.py` extraction and matching logic; it is already tested (`--selftest`).
- Reach filtering: store subscriber counts and check them at ingestion time; threshold is a single configuration value (default 50k, owner-adjustable).
- Episode metadata: title, show, date, duration, URL, detected guests (matched to `UP-####`), topic tags, and a UAP-relevance score (section 5 applies a lightweight version to episodes).
- Output surfaces: "Latest episodes" rail in the brief, per-show pages, per-person pages ("appears on" list), and a "watch list" of upcoming likely-relevant shows.

**Why:** new claims and news break on podcasts first; episodes are the primary verbatim record of the field.

### M3. X Monitor

**What:** track posts about UAP topics from prominent accounts (owner default: 20k+ followers), and surface posts by any tracked person.

**Requirements:**
- Account registry: `x_handle`, person link, follower count snapshot, `last_checked` (seed: `dataset/x_accounts.csv`; verification pass pending access).
- Post intake: posts matching UAP topic terms or posted by tracked accounts; store text extract, URL, timestamp, media flags, engagement snapshot.
- Display: "Signal from X" rail on the brief; per-person timeline includes X posts; posts can anchor to stories when they are the origin of a news item.
- **Gate:** X access route is decided at build time from two approved paths: the official X API (pay-per-use, console.x.com) or a commercial X data provider; cookie-session scraping (personal or burner accounts) is explicitly not an approved route for the product. Build against a stub interface until the route is wired.

### M4. People Wiki

**What:** the reference layer of the field. Every person in the registry (849 now, growing) gets a page: identity, roles, affiliations, stance, key claims with attribution, appearances, statements, related stories and episodes, and network neighbors.

**Requirements:**
- Person page: summary blocks generated from registry fields (never invented), timeline of statements and appearances, "in the news" list, X posts (when live), related organizations, and the network mini-graph.
- Organization pages and event pages built from the same registry (organizations, timeline records).
- Case pages (Roswell, Nimitz, Rendlesham, and so on) as the wiki matures: curated case entries linking people, events, statements, and coverage.
- Editing: v1 is generated from data (Supabase rows + summaries). Human editing and editor review come later; do not fake editorial content.
- Every claim on a page keeps its attribution and source link from the dataset.

**Why:** the "movers and shakers" requirement, and the substrate that makes the graph and the brief meaningful.

### M5. Graph and Analytics

**What:** a 3D network graph of the field and an analytics surface for its shape over time.

**Requirements:**
- Graph nodes: people (sized by prominence tier and connectivity), shows (sized by reach), organizations, and story clusters. Edges: appearances, statements, affiliations, mentions, co-appearances.
- 3D interaction: hover for identity, click to open the page, filters (era, tier, category, tag), cluster highlighting, and a reduced-motion 2D fallback list. Start on `react-force-graph-3d` (three.js under the hood); custom shaders only if needed. Cap initial load to roughly 2k nodes; lazy-load the route.
- Analytics: tag distributions over time (how much woo/psyop-flagged material per week), outlet behavior profiles (who publishes what kind of material), entity coverage heat, episode volume, statement frequency, and a "what's moving" panel.
- All analytics derive from stored rows and public views; no client-side number inventing.

**Why:** the owner asked for "cool analytics" and a graph; this is also the most shareable surface of the product.

---

## 5. Scoring system design brief (the core methodology task)

This is the part that must be designed carefully, reviewed by the owner, and versioned. It mirrors TBB's hybrid approach: a model pass plus deterministic components, mixed by a documented formula, never a bare model opinion.

### 5.1 Principles

1. **Score the material, not the person.** Tags apply to stories, episodes, posts, and claims. A person page aggregates attributed material; it never carries "this person is a psyop" style labels.
2. **Assessment, not verdict.** Language everywhere reads "assessed as", "consistent with", "per available evidence", with confidence levels. No claim of proof.
3. **Evidence first.** A score without stored rationale, components, and citations is invalid; the pipeline refuses to publish one.
4. **Skeptics and official positions are first-class.** The dataset already includes them; the scoring must not treat them as opposition to be weighted down.
5. **Versioned and auditable.** Every score row stores `methodology_version` and `prompt_version`; the public methodology page explains the current version.
6. **Human gate for extremes.** High-impact scores go to a review queue before publishing (thresholds in 5.5).

### 5.2 Tag set (owner-specified baseline)

Scores are tag plus intensity: `TAG-nn` where intensity is 0 to 10 in half-point steps. Intensity means "how strongly the material exhibits this property", with no polarity flipping.

| Tag | Meaning | Example reading |
|---|---|---|
| `PSYOP` | Assessed as consistent with deliberate influence operation dynamics (staged leak, coordinated messaging, narrative seeding, selective disclosure for effect). | `PSYOP 9` = strong signals of staged/coordinated influence activity |
| `WOO` | Claims that outrun any available evidence into the paranormal or mystical register (channeling, apocalyptic contact narratives, unfalsifiable metaphysics). Also absorbs incoherent or unfalsifiable claims formerly tagged `NONSENSE`. | `WOO 8.5` = mostly woo |
| `INTERESTING` | Novel, coherent, and worth a reader's attention regardless of ultimate truth (new witness class, new document, new sensor data). A checkable lead that once sat under `POTENTIAL` raises this tag. | `INTERESTING 6` = notably interesting |
| `LACKING_DATA` | Insufficient information to assess; the material cannot be checked with what is presented. | `LACKING_DATA 8` = nearly un-assessable as presented |
| `VETTED` | Key assertions have been checked against publicly available information and hold up at the level described (record exists, person is who they say, document is authentic as far as can be checked). | `VETTED 7` = substantial verification passed |
| `CREDIBLE` | Overall assessment that the account/material is trustworthy as a claim, short of proof (source quality, track record, corroboration, specificity). | `CREDIBLE 7` = credible account, still unproven phenomenon |

Caution pole: `PSYOP`, `WOO`, `LACKING_DATA`. Substance pole: `VETTED`, `CREDIBLE`, `INTERESTING`. `NONSENSE` and `POTENTIAL` are retired (ADR 0003).

**Proposed additions (owner approval required, kept small):** `DEBUNKED` (a prosaic explanation is established or near-established), `SENSATIONAL` (presentation posture is hype-driven irrespective of content), `UNSUPPORTED` (asserted with no supporting material at all). Do not add tags silently; each addition is a methodology change with a version bump.

### 5.3 Hybrid architecture (mirror of TBB `mix_v1`)

For each item:

1. **Model pass** (OpenRouter, `deepseek/deepseek-v4.1-flash`, reasoning effort `high`): structured JSON with per-tag qualitative intensity, one-line rationale per tag, extracted claims, named entities, evidence cited in the text, and flags (contested, rehash, press release, opinion). Prompt is versioned.
2. **Deterministic components** computed in code, from stored data only:
   - `corroboration` count of independent domains covering the same story;
   - `official_record` (does an official document/hearing/record anchor it);
   - `evidence_chain` (named documents, chain of custody, checkable specifics);
   - `language_markers` (sensational lexicon density, hedged vs absolute claims);
   - `rehash` (restates known material with no new data);
   - `contestation` (credible parties dispute it, or the dataset's counterpoints apply);
   - `source_profile` (outlet's historical mix of scored material).
3. **Mixture formula** per tag, documented as `mix_v2` and accepted in `docs/adr/0003-tag-set-mix-v2.md`:
   - `VETTED = 0.40*model + 0.30*evidence_chain + 0.20*corroboration + 0.10*official_record`
   - `PSYOP = 0.45*model + 0.25*narrative_coordination + 0.20*language_markers + 0.10*rehash`
   - `WOO = 0.50*model + 0.30*language_markers + 0.20*evidence_gap`
   - `INTERESTING = 0.50*model + 0.30*novelty + 0.20*evidence_chain`
   - and so on for every live tag. Keeper weights match `mix_v1`.
4. **Storage:** raw model output, every component, the mixed scores, model name, prompt and methodology versions, and reviewer decisions all persist. Analytics only read stored rows.

### 5.4 Confidence and presentation

- Each tag score carries `confidence: low | medium | high` (driven by source count, evidence chain, and model agreement).
- The feed and story lead show an assessment line: one caution winner paired with one substance winner. Story Scores and Method still use chips (`WOO 8.5`) with rationale, components, and citations. The methodology page carries the formulas and change log.

### 5.5 Review queue and calibration

- Auto-route to human review before publish when: `PSYOP >= 7`, `WOO >= 8`, `VETTED >= 7`, or `CREDIBLE >= 7`.
- The owner reviews the methodology doc and a sample batch before public launch. Calibration set: 30 to 50 items across the range (an obvious press release, a vetted document release, a classic woo video, a suspected staged leak), scored and adjudicated once, then frozen as regression fixtures for future prompt versions.

---

## 6. Monitored sources

**News and aggregator sites (owner list; The UFO Chronicles was listed twice, deduped):**

| Source | URL | Notes |
|---|---|---|
| UAP News Center | `https://uapnewscenter.com/` | Hand-curated daily aggregator; also hosts the UFO conference tracker. |
| The UFO Chronicles | `https://www.theufochronicles.com/` | Long-running aggregator with labels/tags. |
| UFO Sightings Daily | `https://www.ufosightingsdaily.com/` | High-volume sightings blog; heavy woo content; a natural low-end calibration source. |
| UAPs News | `https://uapsnews.com/blog/` | Case-file style reported stories with evidence discussion. |
| UFO Pulse | `https://ufopulse.com/category/latest-news/` | News/category feed. |
| UFO UAP | `https://www.ufouap.net/en/news` | Structured news items with sources named. |
| PBS NewsHour (UAP tag) | `https://www.pbs.org/newshour/tag/uap` | Mainstream baseline. |
| UFO News (Cristina Gomez) | `https://www.ufonews.co/` | Reporter-led outlet. |

**Podcasts:** the 78 shows in `dataset/podcasts.csv` (with feed endpoints), plus the planned expansion (Breaking Points and others per the gaps doc). Reach threshold default 50k, configurable.

**X accounts:** all tracked people with handles at or above 20k followers, once the access decision is made.

**Conference sources (for the speaker harvest):** the UAP News Center conference tracker first, then Contact in the Desert, McMenamins UFO Festival, SCU conference, The Sol Foundation, International UFO Congress.

---

## 7. Data model (Supabase)

Seed the database from `dataset/` in the first migration (people, podcasts, appearances, timeline, organizations), keeping every provenance column. Then extend with the operating tables. TBB conventions apply: anon read only through public views, service-role writes from Edge Functions, RLS everywhere, pg_cron + pg_net + Vault scheduler secret for schedules, all config in one place.

Core tables (sketch; names flexible, semantics not):

| Table | Purpose | Key fields |
|---|---|---|
| `people` | master registry | `person_id` (UP-####), name, aliases, tier, roles, stance fields, summary, sources jsonb, provenance |
| `person_aliases` | fast matching | normalized alias (pk), person_id |
| `podcasts` | show registry | podcast_id, name, reach_tier, category, feed_url, youtube_url, subscribers, checked_at |
| `episodes` | podcast items | episode_id, podcast_id, title, pub_date, url, duration, guests jsonb, relevance jsonb |
| `appearances` | person-show edges | appearance_id, person_id, podcast_id, role, episode, date, source_url, confidence, provenance |
| `timeline` | events + statements | record_id, record_type, category, date, title, actors, person_id, venue, summary, significance, claim_status, source_url, confidence |
| `organizations` | registry | org_id, name, type, status, key_people, url |
| `sources` | monitored feeds/pages | source_id, name, url, kind (news/podcast/x), active, last_fetch_at, fetch_policy jsonb |
| `stories` | news items | story_id, canonical_url, source_id, title, published_at, fetched_at, excerpt, form, status (pending/processing/review/ready/failed), cluster_id, dedupe_hash |
| `story_scores` | per-tag scores | story_id, tag, score, confidence, rationale, components jsonb, methodology_version, prompt_version, model |
| `story_entities` | links | story_id, entity_type, entity_id, match_method, confidence |
| `x_posts` | social items (gated) | post_id, handle, person_id, posted_at, url, text, engagement jsonb |
| `ingest_runs` | ops telemetry | run_id, function, started_at, finished_at, counts jsonb, errors jsonb |
| `review_queue` | human gate | item_type, item_id, reason, status, reviewer, decided_at, notes |
| `methodology_versions` | scoring versions | version, status, weights jsonb, notes, created_at |

Public views (anon read): `stories_public` (ready only, with latest scores), `people_public`, `podcasts_public`, `timeline_public`, `tag_stats`, `tag_trends`, `source_stats`, `entity_stats`, `graph_edges` (precomputed edges for the 3D graph). Nothing else is readable by anon; browsers never write.

---

## 8. Edge functions and pipeline

Suggested functions (TBB shape: one job per function, claim/process pattern, idempotent):

| Function | Does | Schedule |
|---|---|---|
| `ingest-news` | Fetch each active news source per its fetch policy, normalize, dedupe (URL + title hash + cluster), insert `stories` as pending. | every 2h |
| `ingest-podcasts` | Resolve each show endpoint (verified feed, iTunes, YouTube), fetch new items since last run, filter by reach threshold, insert episodes, queue matching. | every 6h |
| `match-entities` | Alias-normalized matching (title first, then description) against people/orgs; writes `story_entities` and episode guests; unmatched name-shaped strings go to a candidates list. | after each ingest |
| `score-stories` | Claim pending stories in small batches, call OpenRouter (`deepseek/deepseek-v4.1-flash`, structured JSON, reasoning high), compute deterministic components, mix per methodology version, store scores and components, route extremes to `review_queue`. | every 2h, batched |
| `ingest-x` | (gated) Pull posts for tracked handles and topics; store and match. | hourly when live |
| `rebuild-graph` | Refresh `graph_edges` and stats views after new data. | after scoring |

Pipeline: **collect, normalize, dedupe, resolve entities, score, review, publish, display**. State machine per story: `pending -> processing -> (review) -> ready | failed`. Failures never flip ready items back; rescoring is a separate, locked operation (TBB's `claim_rescore_articles` pattern).

Secrets (Supabase Edge Function secrets only): `OPENROUTER_API_KEY` (owner supplies), plus `X_*` and `YOUTUBE_API_KEY` if those modules go live. Scheduler secret in Vault. No secrets in the repo, ever.

---

## 9. Entity resolution and merge policy

Name-matching rules for ingestion (the same conventions the registry follows):

- Normalize: accents, case, titles, credentials stripped; middle initials dropped; JR/SR kept significant; `Last, First` reordered; single tokens never auto-match.
- Match tiers: exact normalized name, alias/aka hit (high confidence), then fuzzy candidates for review (never silent merges).
- New people enter with `data_sources = added` style provenance, at least one source, and a research note. The candidates queue from `harvest.py` (`person_candidates.csv`) and from unmatched story/episode names feeds a review list; minted rows join the registry.
- `dataset/people.csv` is the offline source of truth; database merges must be reversible and logged.

---

## 10. UI and UX direction

**The mandate:** designed really well, cool with motion graphics, animated SVG, and hover effects, but easy to navigate, read, and assess. Cool never beats legibility.

**Aesthetic (owner standards):** dark, low-glare surfaces. Pure white text or bright borders on dark read as harsh and count as defects. Use soft off-whites for text, muted panel fills, accents reserved for data and interaction. Generous even spacing over density. AA contrast minimum. Dark theme is the default; a light theme is optional later.

**Motion:** animate with intent. Animated SVG accents (a radar sweep, a signal trace, entity glyphs), hover elevations on cards and graph nodes, score chips that fill or pulse on reveal, timeline scrubs. Duration 300 to 600ms, eased; respect `prefers-reduced-motion`; motion never gates content or reading. Keep dependencies light: CSS and SVG first, at most one motion library.

**UI Toolkit** use the tool kit as your design reference and rule system `/frontend_design`

**Pages:**

| Route | Purpose |
|---|---|
| `/` | The feed: lead story, story rows, assessment line, search. |
| `/story/[id]` | Story page: extract, scores with rationale and components, entity list, sibling coverage, source link. |
| `/people` and `/people/[id]` | Registry index and person pages (roles, claims with attribution, appearances, statements, mentions, network). |
| `/podcasts` and `/podcasts/[id]` | Show pages with episodes, guests, reach data. |
| `/organizations/[id]`, `/events/[id]`, case pages | Wiki layer. |
| `/graph` | The 3D network (lazy-loaded, filterable, reduced-motion fallback). |
| `/analytics` | Tag trends, source behavior, entity heat. |
| `/methodology` | Scoring explanation, formulas, version history, known limitations. |
| `/about` | What this is and is not. |

**Assessment-first reading:** every surface should answer "how much weight does this deserve, and why" within a glance: the assessment line on the feed, chips plus rationale on the story, provenance one click away, and confidence visible.

---

## 11. Stack and repository conventions

- **Stack, mirroring TBB:** Next.js (App Router) + React + TypeScript + Tailwind, `@supabase/supabase-js`, Supabase Postgres + Edge Functions + RLS + pg_cron/pg_net, OpenRouter for model calls, Vercel for hosting. Choose current stable versions at build time; record the choice in an ADR.
- **Repo layout:** `src/` app, `supabase/` (config, migrations, functions), `docs/adr`, `docs/knowledge`, `dataset/`, `tools/`. Root docs: `SYSTEM_BRIEF.md` (this file), plus `CONTEXT.md`, `AGENTS.md`, `GATES.md`, `PLAN.md` as the build starts.
- **Decision records:** every structural choice gets an ADR (stack, scoring architecture, X access, graph library). The scoring ADR is mandatory before scoring code lands.
- **Gates:** large changes use the repo's GATES.md pattern (checkable assertions with evidence), like TBB's scoring gates.
- **Publishing:** the repo is public. Publish only source, docs, and schema; never secrets, never private data, never unverified accusations.
- **Implementation bias:** build for the current phase only, simplest complete solution, replace rather than preserve, no compatibility theater.

---

## 12. Guardrails and editorial standards

1. **Claims are claims.** Phrasing preserves attribution: "alleges", "says", "testified that". Nothing in the product asserts an extraordinary claim is true.
2. **No fabricated content, ever.** Citations must be URLs actually fetched or stored; summaries come from stored text; numbers come from stored rows. If a value is unknown, show it as unknown.
3. **Score material, not people.** Person pages aggregate attributed claims and coverage; they never carry unqualified labels like "psyop asset". This is also the defamation firewall for a public product.
4. **Privacy.** Public-figure professional information only. Private individuals (witnesses, experiencers) get entries only where they are already publicly identified in the field and with restraint; no addresses, no contact details, no medical claims.
5. **Skeptical and official positions stay first-class**, including corrections when new evidence lands.
6. **Review gates:** extremes and disagreements go to the human queue (section 5.5). The owner approves the methodology before public launch.
7. **Politeness and legality on collection:** respect robots and platform terms, rate-limit fetches, identify with a clear user agent, never bypass paywalls.
8. **Transparency:** the methodology page is public and versioned; every score is explainable to a reader.
9. **Living dataset:** this dataset is a seed. Growth happens through the documented enrichment path, not through silent edits.

---

## 13. Roadmap with exit criteria

| Phase | Build | Exit criteria (all must be demonstrably true) |
|---|---|---|
| P0 (done) | Dataset and documentation. | 849 people / 78 shows / 119 edges / 90 timeline rows / 47 orgs validated; data dictionary complete. |
| P1 | Supabase project schema + seed import + public views + RLS. | Migrations apply clean; dataset imported with provenance intact; `people_public` and friends readable by anon; advisors clean. |
| P2 | `ingest-news` + `match-entities` for the 8 news sources. | New stories appear for every configured source; dedupe clusters work; entities matched with confidence; failures logged in `ingest_runs`. |
| P3 | `score-stories` v1 (hybrid) + review queue + methodology page draft. | Calibration set scored; owner-reviewed; extremes route to `review_queue`; every stored score has rationale, components, versions. |
| P4 | Web app core: brief, story pages, people wiki, podcasts pages, methodology page. | A reader can scan the brief, open a story, see the rationale, open a person, and read the methodology; mobile usable. |
| P5 | Graph + analytics + motion pass. | `/graph` renders the registry network (2k nodes smooth), filters work, reduced-motion fallback exists; analytics reflect stored rows only. |
| P6 | `ingest-podcasts` (RSS + YouTube, 50k threshold) and X module (gated). | New relevant episodes auto-appear with matched guests; X posts appear for tracked handles once access exists. |

---

## 14. Open questions for the owner

1. **X access route:** decided 2026-09-15: official X API pay-per-use (read-only Bearer token; app created in console.x.com). Open sub-item: the follower floor for the watchlist (default 20k).
2. **Reach threshold confirmation** for podcasts (default 50k subscribers).
3. **Scoring approval:** review and sign off the tag set, the strawman formulas, and the review thresholds before scoring code is written.
4. **Adjacent figures** (Hameroff, Kaku, and similar): include or exclude, and by what rule.
5. **Deploy targets:** Vercel project name and domain (TBB uses a custom domain; decide UAP Brief's).
6. **Review-first or auto-publish** for scored stories in v1 (recommendation: review-first, then relax).
7. **Outlet-lean scoring** (TBB style) on mainstream coverage: wanted later, or out of scope.

---

## Appendix: glossary

- **Item:** any piece of material scored (story, episode, post).
- **Cluster:** a group of stories covering the same underlying event.
- **Tag / intensity:** property plus 0 to 10 score (`WOO 8.5`).
- **Component:** a deterministic input to a tag mixture (corroboration, evidence chain, and so on).
- **Methodology version / prompt version:** the pinned versions that produced a score.
- **Ready:** the only status visible to the public.
- **Registry:** the people/podcasts/organizations master data from `dataset/`.

Related documents: `dataset/DATA_DICTIONARY.md` (every column and vocabulary), `README.md` (layout, constants, working notes).
