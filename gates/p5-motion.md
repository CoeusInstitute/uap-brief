# Gates: P5 motion leftover — timeline scrub

Scope: Person timelines get a decade scrub. Event pages list other stored records in the same decade. Analytics metrics link to wiki surfaces. No ingest or scoring.

- [x] G1: TimelineScrub uses decadeOf and RecordList
  CHECK: rg -n "decadeOf|RecordList" src/components/TimelineScrub.tsx
  EXPECT: /decadeOf/
  EVIDENCE: 2026-09-16 `src/components/TimelineScrub.tsx`.

- [x] G2: Person page uses TimelineScrub
  CHECK: rg -n "TimelineScrub" src/app/people/[id]/page.tsx
  EXPECT: /TimelineScrub/
  EVIDENCE: 2026-09-16 person timeline section.

- [x] G3: Event page lists same-decade records
  CHECK: rg -n "timelineInDecade|Also in the" src/app/events/[id]/page.tsx
  EXPECT: /timelineInDecade/
  EVIDENCE: 2026-09-16 event page “Also in the {decade}”.

- [x] G4: Analytics metrics link to wiki routes
  CHECK: rg -n 'href="/people"|href="/events"|href="/graph"' src/app/analytics/page.tsx
  EXPECT: /href="\/people"/
  EVIDENCE: 2026-09-16 People, Shows, Organizations, Appearances, Timeline records.

- [x] G5: No ingest or scoring engine added
  CHECK: rg -n "ingest-news|score-stories" -g "*.ts" -g "*.tsx" src supabase/functions || echo NO_PIPELINE
  EXPECT: /NO_PIPELINE/
  EVIDENCE: 2026-09-16 no pipeline functions added.

- [x] G6: Production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: 2026-09-16 `npx next build` Compiled successfully.

- [x] G7: Browser — Knapp decade rail, Roswell 1940s peers, analytics People
  EVIDENCE: 2026-09-16 /people/UP-0042 1980s → Bob Lazar only. /events/EVT-002 Also in the 1940s → Twining, Arnold. Analytics exposes People/Shows/Orgs/Appearances/Timeline links. /events usable at 390px.
