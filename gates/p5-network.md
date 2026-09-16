# Gates: P5 network and remaining wiki

Scope: Organizations use the name station. Graph renders the appearance network with search, click-through, and a reduced-motion list. Analytics stay on stored rows. No P2 ingest or P3 scoring.

- [x] G1: Organizations page uses DirectoryIndex, not RegistryTable
  CHECK: node -e "const fs=require('fs'); const t=fs.readFileSync('src/app/organizations/page.tsx','utf8'); console.log(t.includes('DirectoryIndex')&&!t.includes('RegistryTable')?'STATION':'TABLE');"
  EXPECT: STATION
  EVIDENCE: 2026-09-15 STATION. `src/app/organizations/page.tsx` imports DirectoryIndex.

- [x] G2: RegistryTable is unused
  CHECK: rg -l RegistryTable src --glob *.tsx || echo NONE
  EXPECT: NONE
  EVIDENCE: 2026-09-15 rg returned NONE. Component deleted.

- [x] G3: Graph builds nodes and links from appearances_public
  CHECK: rg -n "appearances_public|buildAppearanceNetwork" src/lib/network.ts src/lib/registry.ts src/app/graph/page.tsx
  EXPECT: /buildAppearanceNetwork/
  EVIDENCE: 2026-09-15 `buildAppearanceNetwork` in `src/lib/network.ts`; graph page loads `appearances_public`.

- [x] G4: Reduced-motion fallback is a list, not a live simulation
  CHECK: rg -n "prefers-reduced-motion|reduce" src/components/NetworkDesk.tsx
  EXPECT: /prefers-reduced-motion/
  EVIDENCE: 2026-09-15 `prefers-reduced-motion: reduce` hides the canvas and shows the name list.

- [x] G5: No ingest or scoring engine added
  CHECK: rg -n "ingest-news|score-stories" -g "*.ts" -g "*.tsx" src supabase/functions || echo NO_PIPELINE
  EXPECT: /NO_PIPELINE/
  EVIDENCE: 2026-09-15 NO_PIPELINE.

- [x] G6: Production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: 2026-09-15 `npx next build` — Next.js 16.3.5, Compiled successfully, `/events` in the route table.

- [x] G7: Organizations station is searchable in the browser
  EVIDENCE: 2026-09-15 http://localhost:3000/organizations — “47 organizations”; Active set; “aaro” → All-domain Anomaly Resolution Office ORG-001.

- [x] G8: Graph shows the appearance network and opens a record
  EVIDENCE: 2026-09-15 http://localhost:3000/graph — “119 appearance edges among 118 people and shows”; “weaponized” → 5 nodes / 4 edges; Open → /people/UP-0042 George Knapp. No duplicate-key overlay.
