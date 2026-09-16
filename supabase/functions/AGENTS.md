# supabase/functions — Edge Functions

Binding contract for the Deno Edge Functions. Parent rules in [../AGENTS.md](../AGENTS.md) and [../../AGENTS.md](../../AGENTS.md) apply and are not weakened here.

## Purpose

Edge Functions are the only approved place to call OpenRouter or the X API, or to use the service-role client for ingest and scoring.

## Ownership

- Owns: deployed functions, function secrets, scheduler header auth, cron tick behavior.
- Does not own: table DDL (parent `supabase/AGENTS.md`).

## Local Contracts

- Deployed: `ingest-news`, `match-entities`, `score-stories`, `ingest-podcasts`, `ingest-x`, `resolve-podcast-feeds`, `enrich-dossier`, `enrich-x`. Planned later: `rebuild-graph`.
- Auth: `UAP_SCHEDULER_SECRET` via `x-uap-scheduler-secret`, or service-role `Authorization` for CLI invoke. `verify_jwt = false` in `config.toml`. Hosted cron reads the same value from Vault as `uap_scheduler_secret`.
- Secrets (function, never Vercel / `NEXT_PUBLIC_*`): `OPENROUTER_API_KEY` or `OPENROUTER_API`, `X_BEARER_TOKEN`, `UAP_SCHEDULER_SECRET`, `YOUTUBE_API_KEY`. Do not commit values.
- Operator review: `npx -y supabase db query` with `select public.review_decide('<story-uuid>','approve|reject','owner','notes');`. `claim_rescore_stories(worker_id, max_n)` releases failed rows (not `evergreen_gate`) back to pending. No public `/review` route.
- Scoring: `mix_v2` / `score_v2` per [docs/adr/0003-tag-set-mix-v2.md](../../docs/adr/0003-tag-set-mix-v2.md). Send `reasoning: { effort: "high" }` and structured JSON. Do not send `temperature`.
- Briefs and images: `score-stories` fetches the story page once, asks the model for the six live tags plus a `summary` (2–5 sentences, "assessed as" language, no invented details), copies the page og:image into the `story-images` bucket, and writes `summary` / `image_url` / `image_status`. After upsert it deletes `NONSENSE` / `POTENTIAL` rows for that story. Empty summary fails the story like an empty rationale. Each tick also runs `claim_brief_backfill` (3 rows, 6 when nothing was pending) and uses `briefWithOpenRouter` so older Ready rows get a brief without being rescored. No og:image means `image_status = placeholder`; the UI shows an empty well, never a stock image.
- Discover RSS; do not invent feed URLs. Persist a discovered `sources.rss_url`.
- Podcast 50k floor applies only when `subscribers` is stored. Unknown reach is still ingested. YouTube channel/user feeds only when the URL already contains that id.
- X: official API only. 20k floor applies only when `followers` is stored. Blank followers skip. Never scrape X via cookie sessions. `enrich-x` resolves missing person handles and refreshes stored profiles (≤40 lookups/run); it does not scrape and does not apply the watchlist floor to stored rows.
- `enrich-dossier` claims `enrichment_queue` (SQL cap 15/run; hosted idle timeout is 150s so the function defaults to 2/run and releases leftovers to pending), classifies collector candidates with OpenRouter (`deepseek/deepseek-v4.1-flash`, `reasoning.effort=high`, no temperature), and writes `person_sources` / `person_links` / appearance edges (`provenance=enrichment`). URLs must come from candidates. Unknown dates stay null.
- User-Agent must identify the project. Respect robots and platform terms. Never bypass paywalls.
- Review routing is floors only (ADR 0003): PSYOP ≥ 7, WOO ≥ 8, VETTED ≥ 7, CREDIBLE ≥ 7. Empty model rationale fails the story. `ingest-news` skips evergreen About/legal paths (`skipped_evergreen`). Do not drop non-UAP X posts at insert. Operator review is `npx -y supabase db query` calling `review_decide`; no public `/review` route.

## Child DOX Index

- none

## Implementation Bias

Inherits the repository root `AGENTS.md` **Implementation Bias**: meet current
requirements and phase; no backward-compatibility theater by default; simplest
complete solution; prefer established libraries; infer intent from the query
plus project context; check end-user objective and avoid overcomplicating
codebase or UI. Record any true compatibility constraints for this subtree
under `Local Contracts` only.

- 2026-09-16: `complete_enrichment_item` backs out the claim increment on `released_time_budget` releases (migration `20260916171500_p7_release_attempts_fix`). Do not reintroduce an attempts increment that survives a time-budget release: rows claimed but never reached must stay claimable.

