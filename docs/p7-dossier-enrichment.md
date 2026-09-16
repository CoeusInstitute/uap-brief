# P7 Dossier Enrichment — build instructions (for the Cursor agent)

**Read first (binding):** root `AGENTS.md` → `supabase/AGENTS.md` → `supabase/functions/AGENTS.md` → this file → `PLAN.md` (P7 section) → `gates/p7-dossier-enrichment.md`. The contracts apply; do not weaken them. Migrations: `supabase migration new` → `db push --dry-run` → `db push`. No MCP `apply_migration` loops. No secrets in the repo. No invented URLs, feeds, dates, or numbers — **unknown stays unknown**.

## Objective

Every one of the 849 people in the hosted database must carry a real dossier: many sourced records per person (podcast/YouTube appearances, radio/TV interviews, mainstream press coverage, profiles/links), each record backed by a working URL. Owner's named examples: Michai Morin (Project Unity episodes, UAP Studies Podcast, WOND radio), Garry Nolan, Ross Coulthart. Mainstream outlets (NewsNation, etc.) count as sources, not only the niche UAP feeds. Done = every gate in `gates/p7-dossier-enrichment.md` met with evidence.

**Current state (2026-09-16):** `people` has only `source_1`/`source_2` slots (775 / 638 populated; 74 people have none). `appearances` = 119 seed edges. `podcasts` 78 (max `POD-078`). `episodes.episode_id` is a **uuid**. `x_accounts` 20 rows. `sources` = 8 niche news feeds (no mainstream). Pilot traces already captured in `.enrich/pilot/` (e.g. `yt_michai.txt`: 7 Project Unity episodes, UAP Studies Podcast, Financial Sense, Raincloud — for one person whose row had 2 sources).

## A. Schema — one migration

Reference shape (refine to repo migration style; follow existing RLS/view/grant patterns from `20260915190000_uap_core_schema.sql`):

```sql
create table public.person_sources (
  source_row_id uuid primary key default gen_random_uuid(),
  person_id text not null references public.people (person_id),
  url text not null,
  title text not null default '',
  outlet text not null default '',
  domain text not null default '',
  source_type text not null default 'other',  -- mainstream_press|podcast|youtube|radio|tv|x|linkedin|official|scholarly|archive|other
  role text not null default '',              -- guest|host|co_host|interviewee|subject|author|featured|mention
  published_date date,
  date_precision text not null default 'unknown',
  confidence text not null default 'medium',
  notes text not null default '',
  discovered_via text not null default '',    -- youtube_trace|web_trace|x_trace|links|seed_migration|manual
  created_at timestamptz not null default now(),
  unique (person_id, url)
);
create index person_sources_person_idx on public.person_sources (person_id);
create index person_sources_domain_idx on public.person_sources (domain);

create table public.person_links (
  link_id uuid primary key default gen_random_uuid(),
  person_id text not null references public.people (person_id),
  link_type text not null,   -- website|wikipedia|wikidata|imdb|linkedin|youtube_channel|x|other
  url text not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (person_id, link_type, url)
);

create table public.enrichment_queue (
  queue_id uuid primary key default gen_random_uuid(),
  person_id text not null references public.people (person_id),
  wave int not null default 0,
  payload jsonb not null default '{}'::jsonb,  -- merged raw candidates from collectors
  status text not null default 'pending',      -- pending|processing|done|failed
  attempts int not null default 0,
  last_error text,
  worker text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id)                            -- one open batch per person; collectors merge payloads
);
```

- RLS enabled on all three; no anon/authenticated grants on base tables except the column-limited pattern the invoker views require. Public views (mirror existing style, `security_invoker = true`, `REVOKE ALL` then `GRANT SELECT`): `person_sources_public`, `person_links_public`.
- RPCs (service_role only, mirror `claim_pending_stories` style): `claim_enrichment_batch(worker_id text, max_n int)` and a completion helper (set status/attempts/last_error). `revoke all … grant execute … to service_role`.
- **Backfill:** insert `people.source_1_*` / `source_2_*` rows into `person_sources` (`discovered_via = 'seed_migration'`, `source_type` mapped from the existing type vocabulary). Idempotent (`on conflict (person_id, url) do nothing`).
- New appearance-edge rows use `provenance = 'enrichment'`.
- Add a line to `supabase/AGENTS.md` Local Contracts: new tables, views, RPCs, functions (`enrich-dossier`, `enrich-x`).

## B. Local collectors — `tools/enrich/` (Node, mirror `tools/seed-registry.mjs` env pattern)

Write raw candidates to `.enrich/queue/<person_id>.json` (gitignored), track progress in `.enrich/state.json` (resumable; skip done persons). Politeness: sleep 1–2 s between requests, identifying User-Agent.

1. **`collect-youtube.mjs`** — `yt-dlp --flat-playlist --print "%(title)s :: %(channel)s :: %(webpage_url)s" "ytsearch15:<query>"` with queries: `"<name>"`, `"<name>" UAP`, `"<name>" interview`. Name-collision filter: keep results whose text matches the canonical person (`name` tokens or aliases, keeping **first+last** token agreement — the pilot showed `Michai Morin` returning `Michael Morin` noise that must drop).
2. **`collect-web.mjs`** — Exa via mcporter (`mcporter call exa.web_search_exa query="…" numResults=8`; free) for `"<name>" UAP`, `"<name>" interview`, `"<name>"` + outlet probes. Capture title/url/snippet/published.
3. **`collect-links.mjs`** — Wikipedia/Wikidata APIs (free) for exact-name matches; LinkedIn = **capture the profile URL only** (`site:linkedin.com/in` search), never scrape; websites from search.
4. **`queue-load.mjs`** — merges candidates into `enrichment_queue.payload` (service role, same auth path as seed script). Collectors never write `person_sources` directly.

## C. Edge Functions — two new

### C1. `enrich-dossier` (new)
- Auth: `x-uap-scheduler-secret` or service-role `Authorization` (mirror existing functions; `verify_jwt = false` in `config.toml`).
- Loop: `claim_enrichment_batch(WORKER, 15)` → per person: load name/aliases/roles → one OpenRouter call → validate JSON → write → mark row. `openRun`/`closeRun` (worker `enrich-dossier`); errors recorded per row, never crash the batch.
- Model: **`OPENROUTER_API` secret** → OpenRouter, model `deepseek/deepseek-v4.1-flash`, `reasoning: { effort: "high" }`, structured JSON only, **no temperature**. Extend `_shared/openrouter.ts` (mirror `scoreWithOpenRouter`'s parse/retry); do not duplicate the client.
- Output contract (validate strictly; malformed → retry once → mark failed):
```json
{
  "sources": [{"url":"", "title":"", "outlet":"", "source_type":"", "role":"", "published_date":null, "date_precision":"unknown|day|month|year", "confidence":"high|medium|low", "notes":""}],
  "links":   [{"link_type":"", "url":"", "label":""}],
  "appearance_edges": [{"podcast_id":"POD-###|null", "episode_title":"", "episode_date":null, "url":"", "role":"guest|subject_of_episode", "confidence":""}]
}
```
- Prompt rules: only records that demonstrably involve this person; classification per the vocabularies above; **never invent dates** (null + `unknown`); attribution language recorded as-is; drop pure noise and wrong-person hits; mainstream outlets classified `mainstream_press` with the outlet named. Input: person fields + the raw candidates JSON (cap ~80 candidates per call).
- Writes: `person_sources` upsert (`on conflict (person_id, url) do nothing`); `person_links` upsert; appearances: known show (`POD-###` exists) → edge with role `guest`/`subject_of_episode` (+ `episodes` row when missing, uuid id, `on conflict (url) do nothing`-style guard); unknown show seen ≥2 times across the queue → mint `POD-079+` and create the edge; single unknown record → `person_sources` only. Mint `APP-###` continuing the numeric sequence; `provenance='enrichment'`.
- Per-run cap: 15 persons (cost guard). Estimate ~3–5k tokens/person; report run cost estimate in `ingest_runs.counts`.

### C2. `enrich-x` (new)
- Resolve missing X handles + refresh stored profiles via the **official API only** (`X_BEARER_TOKEN`): `users/by/username/{handle}` when a candidate exists; `users/search` for name → require strong normalized-name match (full name or alias, not surname-only). Upsert `x_accounts` (`followers`, `verified`, `last_checked`, `ref_type='person'`); 20k floor applies only where followers are stored (existing rule). Cap ≤40 lookups/run; log cost estimate. Never cookie sessions, never scraping.

## D. Sources additions (mainstream)

Add verified news sources (homepage 200-checked before insert; **RSS is discovered by `ingest-news`, never invented**): start with **NewsNation** (`newsnationnow.com`), The Debrief, Space.com, Liberation Times, DefenseScoop, Ask a Pol, The War Zone, New Space Economy, Unknown Country. Keep `kind='news'`, `active=true`, `fetch_policy {"interval":"2h"}`; ≤15 rows; skip any that fail verification.

## E. Waves + verification

- **Wave 0:** A–D built; smoke-test the 3 named people end-to-end.
- **Wave 1:** UP-0507 Michai Morin, Garry Nolan, Ross Coulthart + flags: Elizondo, Corbell, Knapp, Fravor, Graves, Loeb, Pasulka, Vallée, Burlison, Luna. Report one full sample dossier.
- **Wave 2:** all `1_core` (93). **Wave 3:** `2_major` (329). **Wave 4:** remainder (74 source-less people first, then the rest). Resumable; per-wave receipt: candidates collected, sources written, edges added, drops, spend, gate status.
- **`tools/enrich/verify.mjs`** implements `--gate coverage1|core5|named|noempty|edges|outlets|state` per `gates/p7-dossier-enrichment.md` (SQL via the linked project; decisive PASS/FAIL tokens). Named check: Michai Morin has ≥3 Project Unity edges (POD-010) with URLs, the UAP Studies Podcast record, and a radio record for WOND (or explicit unknown — never fabricated); Nolan and Coulthart each ≥10 sourced records including ≥1 mainstream outlet.
- Update gate evidence + `PLAN.md` status + `docs/master-context-summary.md` as waves land. Do not mark a gate met without recorded evidence.

## Guardrails (non-negotiable)

Every stored record has a URL; no fabrication anywhere; blank stays blank. Score material, never label people. Respect robots/ToS; no paywall bypass; LinkedIn = link capture only; X = official API only. Secrets stay server-side (`OPENROUTER_API`, `X_BEARER_TOKEN` already set; `YOUTUBE_API_KEY` optional, not required — YouTube trace is local via yt-dlp). Budget: X ≤ ~$0.10/person, model cost reported per wave; pause and surface if either triples the estimate.

**Division of labor note:** Hermes wrote this spec, `gates/p7-dossier-enrichment.md`, `PLAN.md` P7, and the pilot traces in `.enrich/pilot/`; the Cursor agent owns the build above; either environment may run the bulk collection waves.
