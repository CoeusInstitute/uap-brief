# Gates: P7 dossier enrichment (trace-search every person)

Scope: add the dossier data model (person_sources, person_links), build the trace-search engine
(YouTube / web+news / links), and systematically enrich all 849 people until every dossier carries
real, source-linked records. Evidence only; this phase scores nothing and labels no one.

- [x] G1: Dossier migration exists in repo and is applied to hosted
  CHECK: rg -n "person_sources|person_links" supabase/migrations
  EXPECT: /person_sources/
  EVIDENCE: 2026-09-16 `supabase/migrations/20260916145246_p7_dossier_enrichment.sql` contains `person_sources` / `person_links` / `enrichment_queue`. Hosted `db push` applied that version. Backfill: 1404 seed URL rows, 775 people sourced, 74 still unsourced. News sources 8 → 17 after homepage-200 inserts.

- [ ] G2: Every person has at least one person_sources row (seed URLs migrated + trace finds)
  CHECK: node tools/enrich/verify.mjs --gate coverage1
  EXPECT: /PASS coverage1/
  EVIDENCE: 2026-09-16 Wave 1 `FAIL coverage1 74 people have no person_sources (775/849)`. The 74 are the seed-less remainder; later waves still required.

- [ ] G3: Every 1_core person carries a substantive dossier (>= 5 source records)
  CHECK: node tools/enrich/verify.mjs --gate core5
  EXPECT: /PASS core5/
  EVIDENCE: 2026-09-16 Wave 1 `FAIL core5 83/93 1_core people have <5 sources`. Ten Wave 1 names are 1_core and now have 36–67 sources each (Coulthart and Corbell are 2_major; Michai Morin has no prominence_tier). Remaining 1_core is Wave 2.

- [x] G4: Named dossiers verified (Michai Morin podcast/radio appearances; Nolan and Coulthart depth)
  CHECK: node tools/enrich/verify.mjs --gate named
  EXPECT: /PASS named/
  EVIDENCE: 2026-09-16 `PASS named Michai Project Unity edges with URL=14; UAP Studies=true; WOND=unknown; Nolan sources=41 mainstream=true; Coulthart sources=57 mainstream=true`. WOND radio has no stored URL (explicit unknown). Nolan mainstream includes thedebrief.org; Coulthart includes newsnationnow.com (9 rows).

- [x] G5: No unsourced rows (0 person_sources rows without an http(s) URL; sampled URLs resolve)
  CHECK: node tools/enrich/verify.mjs --gate noempty
  EXPECT: /PASS noempty/
  EVIDENCE: 2026-09-16 `PASS noempty empty=0 sampled 10/10 resolve`. Table check `person_sources_url_http` requires `^https?://`.

- [ ] G6: Trace search grew podcast appearance edges (appearances >= 300, from 119 seed)
  CHECK: node tools/enrich/verify.mjs --gate edges
  EXPECT: /PASS edges/
  EVIDENCE: 2026-09-16 Wave 1 `FAIL edges appearances=205 (need >= 300)`. Enrichment edges added: 86 (`provenance='enrichment'`). Waves 2–4 still required.

- [x] G7: Mainstream + outlet coverage captured (person_sources spans >= 25 distinct domains, including at least one of newsnationnow.com, nytimes.com, washingtonpost.com, cnn.com, space.com)
  CHECK: node tools/enrich/verify.mjs --gate outlets
  EXPECT: /PASS outlets/
  EVIDENCE: 2026-09-16 `PASS outlets domains=380 mainstream_hit=true` (newsnationnow.com present on Coulthart rows).

- [x] G8: Waves logged and resumable (state file lists every person processed; re-run skips completed)
  CHECK: node tools/enrich/verify.mjs --gate state
  EXPECT: /PASS state/
  EVIDENCE: 2026-09-16 `PASS state processed=13 resumable skip markers present`. `.enrich/state.json` lists Wave 1 ids with youtube/web/links=done and `enriched=true`. Collectors skip those unless `--force`. Remaining 836 people are not in state yet (Waves 2–4).

- [ ] G9: Dates captured (person_sources >= 40% dated overall; podcast|youtube|radio|tv rows >= 70% dated)
  CHECK: node tools/enrich/verify.mjs --gate dates
  EXPECT: /PASS dates/
  EVIDENCE: (pending - campaign 2026-09-16; verify.mjs gates G9-G13 land with the campaign)

- [ ] G10: Tier depth (1_core avg >= 12 sources; 2_major avg >= 6; all-person avg >= 4)
  CHECK: node tools/enrich/verify.mjs --gate depth
  EXPECT: /PASS depth/
  EVIDENCE: (pending)

- [ ] G11: Named gaps closed (UP-0507: WOND radio + UAP Studies Ep 50 and Ep 82 recorded, >= 8 POD-010 edges; Nolan >= 20 sources incl. >= 3 mainstream; Coulthart >= 20 incl. newsnationnow.com)
  CHECK: node tools/enrich/verify.mjs --gate named2
  EXPECT: /PASS named2/
  EVIDENCE: (pending)

- [ ] G12: Link liveness (300-URL sample: >= 95% url_ok true; url_ok/url_checked_at recorded)
  CHECK: node tools/enrich/verify.mjs --gate liveness
  EXPECT: /PASS liveness/
  EVIDENCE: (pending)

- [ ] G13: Full queue drain (enrichment_queue: 0 pending, 0 failed, every person processed)
  CHECK: node tools/enrich/verify.mjs --gate drained
  EXPECT: /PASS drained/
  EVIDENCE: (pending)

