# P7 campaign: full dossier build-out (Hermes-run)

Owner directive 2026-09-16, after the Wave-1 review: stop skimming — systematically build out every person's dossier with mass parallel searching. Hermes runs this campaign; every schema/function change is recorded here and in `supabase/AGENTS.md` so Cursor sessions see it.

## Why Wave 1 underdelivered (measured, 2026-09-16)
- Dates: only 239 / 2028 `person_sources` rows carry one (12%). An appearance history without dates is not a dossier.
- Leads are captured but never chased. Example: `UP-0507` has LinkedIn records naming interviews ("interview with Jay Anderson", "joins us this Sunday on UAP STUDIES podcast") while the primary URLs were not followed; UAP Studies **Ep 50** (2021, with Deep Prasad) was missed entirely; **WOND radio** was left "unknown" although one web search resolves it (Forces Behind Science Fiction listing: "This interview originally aired on WOND Radio").
- Classification noise to review later (not blocking): 537 `other`, 504 `archive`, 418 `official` rows.

## Tracks
- **A. Breadth (all 849).** Deterministic collectors (yt-dlp search + Exa + link capture) → `enrichment_queue` → `enrich-dossier`. Fixes coverage (G2), edge count (G6), and seeds everything else. The 74 source-less people run first.
- **B. Depth (tiered).** Parallel subagent squads deep-trace every 1_core person; then 2_major; then the remainder. Squad output = dated candidates in `.enrich/queue2/<person_id>.json`, loaded into the queue, processed by `enrich-dossier`.
- **C. Quality.** Date backfill (yt-dlp per-video metadata; article dates), `excerpt` from snippets (now written by `enrich-dossier`), link liveness (`url_ok` / `url_checked_at` bulk checker), dedupe.
- **D. Named gaps.** UP-0507: WOND radio record, UAP Studies Ep 50 + Ep 82, ≥8 POD-010 appearance edges. Nolan / Coulthart: mainstream depth counts.
- **E. Docs.** This file; gates G9–G13; `PLAN.md` log; `supabase/AGENTS.md` contract line.

## Infrastructure applied (2026-09-16, Hermes)
- Migration `20260916162109_p7_campaign_source_context.sql`: adds `person_sources.excerpt` (public view + grants updated), `url_ok`, `url_checked_at`. (Lesson: `create or replace view` can only APPEND columns — new output columns go at the end.)
- `enrich-dossier` patched: writes `excerpt` from the candidate snippet (deterministic; no prompt change). Deployed.
- Invocation: the function accepts the project **secret key** (`sb_secret_…`) as Bearer; stored locally in `D:\My apps\API keys.txt` (never committed). `max_n` ≤ 15; 150 s idle budget → leftovers released to pending (safe for parallel invokes).
- Working state (gitignored `.enrich/`): `PROTOCOL.md` (squad protocol), `squads/squad_1..10.txt`, `queue/` (collector output), `queue2/` (squad output), `run_unsourced.sh`, `invoke_loop.sh`, `state.json`.

## Targets (met = gates G2, G3, G6, G9–G13)
- Coverage: every person ≥1 source; 1_core ≥5 (G2/G3). Depth averages: core ≥12, major ≥6, overall ≥4 (G10).
- Dates: ≥40% of `person_sources` overall; ≥70% of appearance-type rows (`podcast|youtube|radio|tv`) (G9).
- Appearances: ≥500 edges (from 205) (G6).
- Named gaps (G11). Liveness: 300-URL sample ≥95% `url_ok` (G12). Drain: queue 0 pending / 0 failed; every person processed (G13).
- Budget: OpenRouter ≈ $0.03/person → ≤ $30 for the sweep; X stays inside the existing caps with spend reported per wave.

## Sequence
1. (running now) Bulk: 74 source-less people — collect → load → invoke.
2. Squads: 10 parallel deep-trace squads over the core 83 + UP-0507 gaps → merge `queue2` → process.
3. Wave 3 (2_major 329) → Wave 4 (remainder) via A+B.
4. Quality passes (dates, liveness, noise review) → gates → docs closeout.

## Operating rules
No fabricated URLs/dates/outlets; blanks stay blank; score nothing; label no one; LinkedIn = link capture only; X = official API only; politeness sleeps between collection calls; every stored record is http(s).

## Issues & lessons (2026-09-16 core squad run)
- **Exa free tier**: rate-limited under 10-squad parallelism (429 from ~person 2 on); squads fell back to built-in search. Wave 3-4: fewer concurrent squads or treat Exa as opportunistic.
- **YouTube bot wall** on per-video metadata; bypass = `--extractor-args "youtube:player_client=android"` (verified). Central backfill job `.enrich/dates_backfill.py` applies it to stored rows; run after each wave.
- **Identity flags to resolve**: "James T. Harder" roster initial likely wrong (Dr. James Albert Harder, 1926–2006); Sturrock death-date conflict 2014 vs 2024 (both in squad notes).
- Core run receipt: 84 files / 1,139 candidates / 65 missing items. UP-0507 gaps resolved: WOND radio (Galaxy One Radio / Forces Behind Science Fiction episodes incl. a dated Spotify URL), UAP Studies Ep 50 (2021) + Ep 82 (audio 2022-06-19; YouTube upload 2024-05-01), Project Unity set = 10 dated appearances (2021–2026).
## Wave 3 (started 2026-09-16)
- Squads 11-20 deep-tracing majors batch A (80 people, by person_id order).
- Bulk collectors on the remaining 247 majors (chained after the source-less run; queue-load + invoke included).
- New tooling: `.enrich/liveness_check.py` (Track C: url_ok / url_checked_at), `.enrich/run_majors_bulk.sh`, `.enrich/dates_backfill.py`.
## Write-plane lesson (2026-09-16)
- The Supabase **Management API** (`/v1/projects/{ref}/database/query`) rate-limits HARD under bulk writes (observed persistent 429s that starved all other queries). Bulk jobs must use **PostgREST** (`/rest/v1/...` with the project service key) — that is the data plane the edge functions themselves use. Campaign tooling pattern: reads + batched writes via PostgREST (`liveness_check.py` batches 100 ids per PATCH; `dates_backfill.py` per-row PATCH). Management API is for occasional ad-hoc SQL only.
- PostgREST filter notes: `source_row_id=eq.<uuid>` unquoted works; `eq."<uuid>"` double-quotes into an invalid uuid. `like.*youtube.com%2Fwatch*` works.
## Edge-function flaw fixed (2026-09-16, migration 20260916171500_p7_release_attempts_fix)
- Symptom: the 84-person batch stalled mid-drain; every remaining `pending` row sat at `attempts = 3` and could never be claimed again (claim RPC filters `attempts < 3`).
- Cause: `claim_enrichment_batch` increments `attempts` on every claim, including rows claimed but not reached inside the 105s budget; the `released_time_budget` release kept the increment, so three unused claims zombied a row while it stayed `pending`.
- Fix: `complete_enrichment_item` now backs out the increment on `released_time_budget` releases (`attempts = greatest(attempts - 1, 0)`); attempts now accumulate only on genuine processing attempts, so the `failed` threshold (`attempts >= 3`) keeps its poison-pill meaning.
- Housekeeping done: all 29 stuck pending rows + UP-0507 reset to `attempts = 0`; stale `processing` rows normalized.
## UP-0507 receipt (core wave, 2026-09-16)
- Reprocessed with 63 merged candidates after the attempts fix: status done, attempts 1.
- Dossier: 48 person_sources (29 dated in earlier pass, rest post-backfill), 10 links, ≥14 Project Unity edges (POD-010), UAP Studies thread rows dated, WOND radio gap closed as two dated `radio` records: "Galaxy One Radio episode list — Michai Mathieu Morin talks..." (2024-05-27) and "Michai Mathieu Morin Talks UFOs in New Jersey (The Forces Behind Science Fiction)" (2025-01-10).
## Liveness pass 1 receipt (2026-09-16)
- Full pass over the backlog: 2,132 checked this run (accumulated total checked 2,474) — ok 2,097 / dead 29 / unknown 6 = **98.4% alive**. Dead rows carry `url_ok=false` + `url_checked_at`; re-run `.enrich/liveness_check.py` after each load wave (it skips checked rows).
- Drain-loop bug fixed the hard way: `[ "${n:-0}" = "0" ]` treats an EMPTY parse as "0" and breaks the loop — one malformed invoke response silently ended a drain run. `invoke_loop.sh` now distinguishes empty (retry) from zero (drain complete) and logs unparsed responses.
## Transport incident (2026-09-16): MSYS curl/tee pipe deadlock
- Symptom: three drain loops froze simultaneously; `curl.exe` processes stayed alive past their `--max-time 200` for 24+ minutes; loop logs stopped; function executions started but never finished. The function itself was healthy (a manual invoke returned normally in 109s).
- Cause: background bash loop piping `$(curl ...)` output through `tee` to the harness capture pipe can deadlock (backpressure) — the shell blocks writing, the loop freezes, curl hangs.
- Fix: drain loops now run as a Windows-native Python worker (`.enrich/invoke_worker.py`, urllib, 240s timeout, retries, output redirected straight to a log file — no tee, no pipeline). `invoke_loop.sh` now just execs the worker. Three workers run concurrently (claims are lock-safe).
- Operational rule for this campaign: long HTTP loops on Windows never go through `$(curl)` + tee; use the Python worker pattern.

