# Plan: P1 essentials scaffolding

Depth: tree 2   Mode: solo
Budget note: P2/P3/P6 pipelines are in progress after ADR 0002 (`mix_v1`).

## Contract

- Interfaces: Next.js App Router routes from `SYSTEM_BRIEF.md` section 10. Registry pages read `dataset/` CSVs in this phase. Brief, story, graph, and analytics surfaces stay honest empty until ingest and scores exist.
- Data ownership: `dataset/` is the offline source of truth. `supabase/migrations/` owns DDL/RLS/grants/views. `tools/seed-registry.mjs` owns hosted import (service role only). Current look lives in `src/app/globals.css` and `frontend_design/graphite-ui.css`.
- Naming: Story (not article), Tag + intensity, Ready, Registry. Do not import TBB Bias/Leaning language.
- Product: assessment-first reading. Cool never beats legibility.
- Do not add scoring Edge Functions, X ingest, custom graph shaders, auth, or a second CSS toolkit.

## Tree

- 1 Essentials scaffolding
  - 1.1 Root docs + DOX + stack ADR
  - 1.2 Next.js shell + Graphite + public routes
  - 1.3 Registry wiki from `dataset/` CSVs
  - 1.4 P1 schema files + seed script (not applied to hosted in this pass)
  - 1.5 Verify: `npx next build`

## Status log

- 2026-09-15 scaffolding started from `SYSTEM_BRIEF.md`
- 2026-09-15 essentials landed: DOX + Next.js 16.3.5 shell + Graphite routes + CSV wiki + P1 schema files. `npx next build` passed. Hosted `db push` not run.
- 2026-09-15 hosted P1 applied and seeded; wiki reads public views. Ingest and scoring still out of scope.
- 2026-09-15 P4 wiki indexes use the name station (people, podcasts, organizations). P5 graph is the 2D appearance network plus list; 3D deferred. No P2/P3.
- 2026-09-15 `/events` uses the name station with a decade rail over `timeline_public`. P2/P3/P6 pipelines stay blocked.
- 2026-09-15 Record pages link stored names and ids to registry rows. Graph accepts `?q=`. No P2/P3.
- 2026-09-16 Person timelines use a decade scrub. Event pages list other stored records in the same decade. Analytics metrics link to wiki routes. No P2/P3.
- 2026-09-16 Owner unblocked P2/P3/P6. ADR 0002 accepts `mix_v1`. Edge Functions deployed. First runs: 75 stories (5/8 feeds), 40 episodes, 39 X posts, 10 Ready / 5 review. Claim order is newest published.
- 2026-09-16 Home rails read `episodes_public` and `x_posts_public`. Hosted cron ticks the five functions. Podcast ingest rotates to shows with the fewest stored episodes.

## P7: Dossier enrichment (owner directive 2026-09-16)

Depth: tree 3   Mode: parallel waves

- Owner objective: systematically trace-search every individual (internet, YouTube, X, LinkedIn) and fill each person's dossier in the hosted database with real, sourced records. Named examples: Michai Morin (Project Unity podcasts, UAP studios interviews, WOND radio), Garry Nolan, Ross Coulthart; mainstream coverage (NewsNation et al.) is expected alongside niche sources.
- Contract: new tables `person_sources` (evidence/coverage, many per person) and `person_links` (canonical profiles: website, Wikipedia, LinkedIn, YouTube, IMDb). Schema via `supabase migration new` then `db push`. Trace engine in `tools/enrich/` (Node): YouTube via yt-dlp search, web/news via Exa (mcporter), links via search; X API usage budget-capped; LinkedIn = link capture only, never scraped. Staging in `.enrich/` (gitignored); hosted load via management SQL (privileged, batched). Every stored record carries a URL; no fabrication; blank stays blank.
- Tree:
  - 7.1 Schema: `person_sources`, `person_links` + RLS + public views
  - 7.2 Engine: `tools/enrich/collect-*.mjs`, `load.mjs`, `verify.mjs`
  - 7.3 Wave 1 pilot: Michai Morin + Garry Nolan + Ross Coulthart + 10 flags
  - 7.4 Wave 2: 1_core (93) — 7.5 Wave 3: 2_major (329) — 7.6 Wave 4: remaining
  - 7.7 Ledger: `gates/p7-dossier-enrichment.md`
- Budget: X reads capped (~$0.10/person ceiling); Exa/YouTube free; spend reported per wave.
- Status log:
  - 2026-09-16 P7 opened. Recon: hosted has 849 people but only source_1/source_2 slots (775/638 populated), appearances at 119 seed edges, sources table holds 8 niche news feeds (no NewsNation/mainstream). Gates + plan written; pilot trace searches started.
  - 2026-09-16 Cursor-agent build instructions published at `docs/p7-dossier-enrichment.md`; pilot traces captured (`.enrich/pilot/`). Awaiting build: schema migration, enrich-dossier + enrich-x, collectors, sources additions, Wave 1.
  - 2026-09-16 Wave 1 landed. Migration `20260916145246_p7_dossier_enrichment.sql` applied (person_sources/person_links/enrichment_queue + 9 homepage-200 news sources). Collectors + `enrich-dossier`/`enrich-x` deployed. Wave 1 receipt: 13 people, 1003 candidates queued, YouTube drops 103, web drops 33, person_sources 1404→2028, links 86, appearances 119→205 (86 enrichment edges), OpenRouter ~$0.31 (132k/230k tokens on recorded runs), X 15 lookups / 0 upserts. Hosted per-person sources: Morin 33, Nolan 41, Coulthart 57, Elizondo 50, Corbell 60, Knapp 59, Fravor 36, Graves 42, Loeb 65, Pasulka 43, Vallée 46, Burlison 49, Luna 67 (Wave 1 people hold 648 of 2028 sources; 13/13 queue rows done). Gates G1/G4/G5/G7/G8 PASS; G2/G3/G6 remain for later waves. WOND radio for Michai Morin is explicit unknown (no URL).

## P7 campaign log (Hermes-run)
- 2026-09-16 Wave-1 review: 12% of records dated; leads not chased (UAP Studies Ep 50 missed; WOND unresolved although findable). Owner: build the dossiers out with mass parallel search. Campaign plan: `docs/p7-campaign-plan.md`.
- 2026-09-16 Infra applied: migration `20260916162109` (excerpt / url_ok / url_checked_at), `enrich-dossier` excerpt patch deployed, invoke auth = project secret key. Started: 10 deep-trace squads on core 83 (+UP-0507 named gaps) and the 74 source-less bulk run. Gates G9-G13 appended.
- 2026-09-16 Core squad wave done: 10 squads, 84 files, 1,139 candidates, 65 missing-items logged; UP-0507 named gaps resolved (WOND / Ep 50 / Ep 82 / 10 Project Unity appearances). Queue loaded (84 pending; UP-0507 re-opened with 63 merged candidates) and processing; YouTube date backfill job running; source-less bulk run in background.- 2026-09-16 Crystal-caught: claim/release attempts bug zombied stalled queue rows; patched `complete_enrichment_item` (migration 20260916171500), unstuck 29 rows incl. UP-0507. Campaign continues.- 2026-09-16 Pool 1+2+3 complete: 250/250 queue done (0 failed), 3 python drain workers (~$1.4), coverage 848/849 (UP-0485 Shane Ryan candidate set was 100% same-name noise - under review), G3 core>=5 now 80/93 (13 thin-core targeted by Wave 4 depth squads), appearances 478, sources 4,876, dated 1,699. Majors bulk collecting (UP-0359 youtube phase). Liveness pass 1: 2,474 checked / 98.4% alive.- 2026-09-16 G2 MET: 849/849 people sourced (no orphans, no gaps); pool 1-3 closed 250/250 zero-failed; Shane Ryan (UP-0485) hand-resolved (Westall researcher, 8 sources written).- 2026-09-16 G3 MET: 93/93 core >=5 sources; snippet-inclusive name gate deployed (enrich-dossier); aliases fixed for Hoffman/Trump. Remaining gates: G6 edges (+22), G9 dates target, G13 final wave.- 2026-09-16 evening: G6 MET (edges 816); G9 MET (dated 61% overall; appearance types 83-98%); G10 MET (avg core 15.0 / major 8.1 / all 7.4). Majors draining (317/497 at last count). Photos track live (110+, wiki-by-name pass running).- 2026-09-16 17:14: Majors bulk complete (497/497 queue done, zero failed); 9,266 sources / 1,037 appearance edges. Final wave (352) launched. Photos: 255. Remaining: final wave drain, photo tail passes, date/liveness refreshes, closeout.- 2026-09-17 06:25: CAMPAIGN PROCESSING COMPLETE — 849/849 queue done, zero failed. 14,749 sources / 1,515 edges / avg 17.4 per person / coverage 100%. Closeout: liveness refresh + photo sweep + date backfill + docs.

