# Gates: P2 / P3 / P6 pipelines

Scope: News ingest, entity match, hybrid scoring, podcast feeds, official X API. Do not invent RSS, scores, subscriber counts, or follower floors.

- [x] G1: Scoring ADR exists
  CHECK: docs/adr/0002-scoring-methodology.md
  EXPECT: mix_v1 accepted
  EVIDENCE: ADR 0002 accepted 2026-09-16.

- [x] G2: Five Edge Functions exist
  CHECK: supabase/functions/*/index.ts
  EXPECT: ingest-news, match-entities, score-stories, ingest-podcasts, ingest-x
  EVIDENCE: Function folders landed with `_shared` scheduler, RSS, SSRF, OpenRouter, mix.

- [x] G3: Hosted schema has active `mix_v1`
  CHECK: methodology_versions after db push
  EXPECT: version mix_v1 status active
  EVIDENCE: Hosted row `mix_v1` / `active` after `20260916123848_mix_v1_methodology.sql`.

- [x] G4: Functions deployed to hosted UAP-Brief
  CHECK: supabase functions deploy
  EXPECT: five functions live
  EVIDENCE: `ingest-news`, `match-entities`, `score-stories`, `ingest-podcasts`, `ingest-x` ACTIVE on `agrijbcilmymfsnkdpoh`.

- [x] G5: First ingest run logged
  CHECK: ingest_runs for ingest-news
  EXPECT: a finished row (empty insert is allowed if no feed discovered)
  EVIDENCE: First `ingest-news` run inserted 75 stories (5 feeds discovered, 3 left without invented RSS). Later score batches produced Ready rows on `/`.
