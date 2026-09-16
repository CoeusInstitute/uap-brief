# Gates: Wiki record crosswalk

Scope: Record pages link stored names and ids to registry rows. No fuzzy invention. No ingest or scoring.

- [x] G1: Wiki matcher lives in src/lib/wiki.ts
  CHECK: rg -n "buildWikiIndex|namedLinks" src/lib/wiki.ts
  EXPECT: /buildWikiIndex/
  EVIDENCE: 2026-09-15 `src/lib/wiki.ts` exports buildWikiIndex and namedLinks.

- [x] G2: Organization page lists key people as records
  CHECK: rg -n "Key people|peopleForOrg|timelineForOrg" src/app/organizations/[id]/page.tsx
  EXPECT: /peopleForOrg/
  EVIDENCE: 2026-09-15 org page uses peopleForOrg and timelineForOrg.

- [x] G3: Event page resolves actors and related records
  CHECK: rg -n "relatedTimeline|namedLinks" src/app/events/[id]/page.tsx
  EXPECT: /relatedTimeline/
  EVIDENCE: 2026-09-15 event page uses namedLinks and relatedTimeline.

- [x] G4: Graph accepts a q search param
  CHECK: rg -n "initialQuery|searchParams" src/app/graph/page.tsx src/components/NetworkDesk.tsx
  EXPECT: /initialQuery/
  EVIDENCE: 2026-09-15 `/graph?q=` seeds NetworkDesk.

- [x] G5: No ingest or scoring engine added
  CHECK: rg -n "ingest-news|score-stories" -g "*.ts" -g "*.tsx" src supabase/functions || echo NO_PIPELINE
  EXPECT: /NO_PIPELINE/
  EVIDENCE: 2026-09-15 no pipeline functions added.

- [x] G6: Production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: 2026-09-15 `npx next build` Compiled successfully.

- [x] G7: AARO, Roswell, and Knapp pages link through in the browser
  EVIDENCE: 2026-09-15 /organizations/ORG-001 → Kosloski/Kirkpatrick/Phillips and /people/UP-0001. /events/EVT-002 → Walter Haut, Jesse Marcel Sr. /people/UP-0042 → AARO-style org/show links, Vallée/Fox/Corbell neighbors, /graph?q=George%20Knapp. /podcasts/POD-001 hosts Corbell and Knapp.
