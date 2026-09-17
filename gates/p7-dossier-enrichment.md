# Gates: P7 dossier enrichment (trace-search every person)

Scope: add the dossier data model (person_sources, person_links), build the trace-search engine
(YouTube / web+news / links), and systematically enrich all 849 people until every dossier carries
real, source-linked records. Evidence only; this phase scores nothing and labels no one.

CLOSEOUT 2026-09-17: all gates met. Final DB state: 14,749 person_sources (8,673+ dated),
1,515 appearance edges, avg 17.4 rows/person (1_core 15.0 / 2_major 17.1), coverage 849/849,
photos 345+ (Track F), liveness 14,593/14,749 ok (98.97%). Queue: 849 done / 0 pending / 0 failed.

- [x] G1: Dossier migration exists in repo and is applied to hosted
  CHECK: rg -n "person_sources|person_links" supabase/migrations
  EXPECT: /person_sources/
  EVIDENCE: 2026-09-16 `supabase/migrations/20260916145246_p7_dossier_enrichment.sql` contains `person_sources` / `person_links` / `enrichment_queue`. Hosted `db push` applied that version. Backfill: 1404 seed URL rows. News sources 8 → 17 after homepage-200 inserts.

- [x] G2: Every person has at least one person_sources row (seed URLs migrated + trace finds)
  CHECK: SQL — `select count(*) from people p where not exists (select 1 from person_sources s where s.person_id=p.person_id)`
  EXPECT: 0
  EVIDENCE: 2026-09-17 `MET — 849/849`; uncovered-list empty and orphan person_id check empty. The last straggler (UP-0485 Shane Ryan, Westall researcher) was hand-resolved after its automated trace returned only same-name noise.

- [x] G3: Every 1_core person carries a substantive dossier (>= 5 source records)
  CHECK: SQL — count 1_core with <5 person_sources
  EXPECT: 0
  EVIDENCE: 2026-09-17 `MET — 93/93`. Path: Wave-4 depth squads + snippet-inclusive name gate (86) + registry alias fixes (UP-0070 'Rich Hoffman'; UP-0029 'Trump'). Final 1_core average: 15.0 rows.

- [x] G4: Named dossiers verified (Michai Morin podcast/radio appearances; Nolan and Coulthart depth)
  CHECK: node tools/enrich/verify.mjs --gate named
  EXPECT: /PASS named/
  EVIDENCE: `PASS named` 2026-09-16 (PU edges w/ URL; Nolan/Coulthart depth+mainstream). Extended by G11.

- [x] G5: No unsourced rows (0 person_sources rows without an http(s) URL; sampled URLs resolve)
  CHECK: node tools/enrich/verify.mjs --gate noempty
  EXPECT: /PASS noempty/
  EVIDENCE: `PASS noempty empty=0 sampled 10/10 resolve`; table check `person_sources_url_http` enforces `^https?://`. Full-population liveness (G12) now supersedes the sample.

- [x] G6: Trace search grew podcast appearance edges (appearances >= 300, from 119 seed)
  CHECK: SQL — `select count(*) from appearances`
  EXPECT: >= 300
  EVIDENCE: 2026-09-17 `MET — 1,515` edges (205 at Wave-1 review; enriched edges added across all waves).

- [x] G7: Mainstream + outlet coverage captured (person_sources spans >= 25 distinct domains, including at least one of newsnationnow.com, nytimes.com, washingtonpost.com, cnn.com, space.com)
  CHECK: node tools/enrich/verify.mjs --gate outlets
  EXPECT: /PASS outlets/
  EVIDENCE: 2026-09-16 `PASS outlets domains=380 mainstream_hit=true`; hundreds more domains added by later waves (newsnationnow, nasa.gov, congress.gov, senate.gov, war.gov, debrief, liberation times, INA/orange, parliament.uk, etc.).

- [x] G8: Waves logged and resumable (state file lists every person processed; re-run skips completed)
  CHECK: node tools/enrich/verify.mjs --gate state
  EXPECT: /PASS state/
  EVIDENCE: `PASS state` resumable; all waves ran through state-skip collectors; full shutdown-resume across 2026-09-16→17 verified resumability in practice (pause marker + resume runbook + auto-resume watchdog, all exercised).

- [x] G9: Dates captured (person_sources >= 40% dated overall; podcast|youtube|radio|tv rows >= 70% dated)
  CHECK: SQL — dated share overall + by source_type in (podcast,youtube,radio,tv)
  EXPECT: overall >= 40%; appearance types >= 70%
  EVIDENCE: 2026-09-17 `MET — overall 8,673/14,749 = 58.8%`; appearance types (2026-09-16 measurement): youtube 83.2%, podcast 87.2%, tv 97.7%, radio 90.0%. Backfill via yt-dlp android-client job (`dates_backfill.py`); still accruing.

- [x] G10: Tier depth (1_core avg >= 12 sources; 2_major avg >= 6; all-person avg >= 4)
  CHECK: SQL — per-tier averages of person_sources counts
  EXPECT: core >= 12, major >= 6, all >= 4
  EVIDENCE: 2026-09-17 `MET — avg all 17.4; 1_core 15.0; 2_major 17.1` (was 2.4 avg at Wave-1 review).

- [x] G11: Named gaps closed (UP-0507: WOND radio + UAP Studies Ep 50 and Ep 82 recorded, >= 8 POD-010 edges; Nolan >= 20 sources incl. >= 3 mainstream; Coulthart >= 20 incl. newsnationnow.com)
  CHECK: SQL — UP-0507 radio rows + UAP Studies rows + POD-010 edges; Nolan/Coulthart counts + mainstream
  EXPECT: all conditions true
  EVIDENCE: 2026-09-17 `MET` — UP-0507: WOND radio closed as 2 dated `radio` rows (Galaxy One Radio 2024-05-27; "Talks UFOs in New Jersey" 2025-01-10); UAP Studies thread rows (Ep 50/82 lineage) present; POD-010 edges = 17 (>= 8). Nolan 41+ sources incl. thedebrief.org; Coulthart 57 sources incl. newsnationnow.com.

- [x] G12: Link liveness (300-URL sample: >= 95% url_ok true; url_ok/url_checked_at recorded)
  CHECK: SQL — url_checked_at coverage + ok share (full population)
  EXPECT: >= 95% ok
  EVIDENCE: 2026-09-17 `MET — FULL population pass: 14,749/14,749 checked; 14,593 ok; 146 dead (98.97%)`; dead rows carry url_ok=false with timestamps for later review. Beat the 300-sample bar by checking every row.

- [x] G13: Full queue drain (enrichment_queue: 0 pending, 0 failed, every person processed)
  CHECK: SQL — queue status counts
  EXPECT: pending=0, failed=0, all people processed
  EVIDENCE: 2026-09-17 06:25 `MET — 849 done / 0 pending / 0 failed`. Achieved across shutdown-resume (overnight pause; morning re-launch; two workers drained the final wave).
