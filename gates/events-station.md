# Gates: Events timeline station

Scope: `/events` uses the directory name station with a decade rail. Records come from `timeline_public`. No ingest or scoring.

- [x] G1: Events index uses DirectoryIndex with a year rail
  CHECK: node -e "const t=require('fs').readFileSync('src/app/events/page.tsx','utf8'); console.log(t.includes('DirectoryIndex')&&t.includes('rail=\"year\"')?'YEAR_RAIL':'MISSING');"
  EXPECT: YEAR_RAIL
  EVIDENCE: 2026-09-15 `src/app/events/page.tsx` — DirectoryIndex rail="year".

- [x] G2: Events page loads timeline_public
  CHECK: rg -n "loadTimeline|timeline_public" src/app/events/page.tsx src/lib/registry.ts
  EXPECT: /loadTimeline/
  EVIDENCE: 2026-09-15 `loadTimeline()` selects `timeline_public`.

- [x] G3: Primary nav includes Events
  CHECK: rg -n 'href: "/events"' src/components/Header.tsx
  EXPECT: /\/events/
  EVIDENCE: 2026-09-15 Header link Events → `/events`.

- [x] G4: No ingest or scoring engine added
  CHECK: rg -n "ingest-news|score-stories" -g "*.ts" -g "*.tsx" src supabase/functions || echo NO_PIPELINE
  EXPECT: /NO_PIPELINE/
  EVIDENCE: 2026-09-15 NO_PIPELINE.

- [x] G5: Production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: 2026-09-15 `npx next build` listed `○ /events`.

- [x] G6: Events station is searchable in the browser
  EVIDENCE: 2026-09-15 http://localhost:3000/events — “90 dated records”; “roswell” → EVT-002; Open → /events/EVT-002; 1940s → Twining / Roswell / Arnold; Hearings scope lists House/Senate records.
