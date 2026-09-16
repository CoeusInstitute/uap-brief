# supabase — Backend (Postgres, RLS)

Binding contract for the UAP Brief hosted backend. Parent rules in [../AGENTS.md](../AGENTS.md) apply and are not weakened here.

## Purpose

Hosted Supabase project that will store the registry, stories, scores, and ingest runs. The website anon client may read public views only.

## Ownership

- Owns: hosted project facts, migrations, RLS, public views.
- Owns the functions child: [functions/AGENTS.md](functions/AGENTS.md).
- Does not own: Next.js UI or the offline CSV seed (`../dataset/AGENTS.md`).

## Local Contracts

- Hosted project ref `agrijbcilmymfsnkdpoh`, URL `https://agrijbcilmymfsnkdpoh.supabase.co`.
- Use `npx -y supabase` linked to that ref. Do not require `supabase start` for v1.
- Schema/RLS/RPC changes go through `supabase migration new` then `db push --dry-run` then `db push`.
- Do not use MCP `apply_migration` for exploratory loops.
- RLS on every public table. Anon/authenticated: SELECT on public views only. No public writes. `ingest_runs` and `review_queue` have no grants to `anon` / `authenticated`.
- Views use `security_invoker = true`. Table SELECT grants exist only where an invoker view must read a row that RLS already allows.
- `config.toml` `project_id` is `UAP-Brief`. Do not blindly `supabase config push`.
- Hosted apply verified 2026-09-15: `20260915190000_uap_core_schema.sql` and `20260915194835_p1_advisor_hardening.sql` on project `agrijbcilmymfsnkdpoh`. Seed via `tools/seed-registry.mjs` (service role only).
- Public views are the Next read contract: `people_public`, `podcasts_public`, `organizations_public`, `appearances_public`, `timeline_public`, `stories_public` (scores include `components` / `methodology_version`, plus `entities`), `story_scores_public`, `story_entities_public`, `episodes_public`, `x_posts_public`, `person_sources_public`, `person_links_public`, `graph_edges`, `methodology_public` (`version, status, notes` only), and the stats views. Views are `REVOKE ALL` then `GRANT SELECT` only. `tag_stats` counts Ready scores ≥ 4. `review_decide` and `claim_rescore_stories` are `service_role` only. Do not call them from Next. `stories.matched_at` has no anon grant. `person_aliases` / `org_aliases` use composite PKs `(normalized_alias, entity_id)` so collisions stay visible to later matching.
- `stories.summary`, `image_url`, `image_status` (`pending | stored | placeholder`) are on `stories_public` (migration `20260916142503_feed_briefs.sql`). Public bucket `story-images` holds copied og:images; only Edge Functions write it. `claim_brief_backfill(worker_id, max_n)` is `service_role` only and hands Ready rows lacking a brief or image to `score-stories`.
- `iso_date_sort` fills stored `date_sort` / `episode_date_sort`. Do not invent RSS URLs; `sources.rss_url` stays null until ingest discovers a feed and persists it.
- `methodology_versions.mix_v2` is the active scoring version (ADR 0003). `mix_v1` remains as a retired historical row. `tag_stats` and `tag_trends` count only the six live tags.
- Hosted cron ticks `uap-ingest-news`, `uap-match-entities`, `uap-score-stories`, `uap-ingest-podcasts`, and `uap-ingest-x` via `uap_scheduler_tick`. The Vault name is `uap_scheduler_secret` and must match the Edge Function secret `UAP_SCHEDULER_SECRET`. Do not commit the value.
- Advisor INFO `rls_enabled_no_policy` on aliases, candidates, ops, X tables, and `enrichment_queue` is intentional: RLS on, no anon policy, no grants.
- P7 dossier tables: `person_sources`, `person_links`, `enrichment_queue` (migration `20260916145246_p7_dossier_enrichment.sql`). RPCs `claim_enrichment_batch` and `complete_enrichment_item` are `service_role` only. Seed `source_1_*` / `source_2_*` URLs backfill into `person_sources` with `discovered_via=seed_migration`. Collectors write `.enrich/queue` then `tools/enrich/queue-load.mjs`; they never write `person_sources` directly. Every stored source/link URL is `http(s)`. Do not invent RSS for new news sources — `ingest-news` discovers feeds.

## Child DOX Index

- [functions/AGENTS.md](functions/AGENTS.md)

## Implementation Bias

Inherits the repository root `AGENTS.md` **Implementation Bias**: meet current
requirements and phase; no backward-compatibility theater by default; simplest
complete solution; prefer established libraries; infer intent from the query
plus project context; check end-user objective and avoid overcomplicating
codebase or UI. Record any true compatibility constraints for this subtree
under `Local Contracts` only.
