# Gates: search-first name station

Scope: Replace the people/podcasts multi-column table stream with a Graphite search-first name station (prompt + letter/scope + name list + dossier).

- [x] G1: DirectoryIndex no longer renders role/tier/region as stream columns
  CHECK: node -e "const fs=require('fs'); const p=['src/components/DirectoryIndex.tsx','src/app/people/page.tsx','src/app/podcasts/page.tsx']; const rx=/directory-terminal__col-extra|directory-terminal__head|columns=\{/; console.log(p.some(f=>rx.test(fs.readFileSync(f,'utf8')))?'FOUND':'CLEARED');"
  EXPECT: CLEARED
  EVIDENCE: CLEARED

- [x] G2: Fake live-process chrome is gone
  CHECK: node -e "const fs=require('fs'); const p=['src/components/DirectoryIndex.tsx','src/app/globals.css']; const rx=/sha:uap32|TELEMETRY|NO TARGET|grep -i|live-ping/; console.log(p.some(f=>rx.test(fs.readFileSync(f,'utf8')))?'FOUND':'CLEARED');"
  EXPECT: CLEARED
  EVIDENCE: CLEARED

- [x] G3: People page still states scores are not on the person
  CHECK: rg -n "carries a score label" src/app/people/page.tsx
  EXPECT: /carries a score label/
  EVIDENCE: 50:            {people.length} people in the field. Blank fields are unknown, not false. No person carries a score label.

- [x] G4: Search and letter scope exist as first-class controls
  CHECK: rg -n "letter|scope|query" src/components/DirectoryIndex.tsx
  EXPECT: /letter/
  EVIDENCE: 335:                        <Highlight text={row.title} query={query} /> | 373:              <p className="g-terminal__dim">Type a name or pick a letter.</p>

- [x] G5: Production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: ○  (Static)   prerendered as static content | ƒ  (Dynamic)  server-rendered on demand

- [x] G6: People station is search-first and name-scannable in the browser
  EVIDENCE: 2026-09-15 IDE browser http://localhost:3000/people — default “Core set. Type to search all 849.”; name-only options; “grusch” → 1 match David Grusch UP-0032; Enter opened /people/UP-0032.

- [x] G7: Podcasts station uses the same interaction and stays searchable
  EVIDENCE: 2026-09-15 IDE browser http://localhost:3000/podcasts — “Active shows. Type to search all 78.”; “weaponized” → WEAPONIZED with Jeremy Corbell & George Knapp POD-001; letter rail collapsed to W.
