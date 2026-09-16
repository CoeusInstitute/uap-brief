# Gates: Terminal directory browse (people + podcasts)

Scope: Replace the people and podcasts tables with a Graphite `.g-terminal` index: type to filter, keyboard select, inspector, open the record. No invented scores. No P2/P3. Organizations may keep the table.

- [x] G1: People page mounts DirectoryIndex, not RegistryTable
  CHECK: rg -n "DirectoryIndex|RegistryTable" src/app/people/page.tsx
  EXPECT: /DirectoryIndex/
  EVIDENCE: 1:import DirectoryIndex, { type DirectoryFilter, type DirectoryRow } from "@/components/DirectoryIndex"; | 55:      <DirectoryIndex

- [x] G2: Podcasts page mounts DirectoryIndex, not RegistryTable
  CHECK: rg -n "DirectoryIndex|RegistryTable" src/app/podcasts/page.tsx
  EXPECT: /DirectoryIndex/
  EVIDENCE: 1:import DirectoryIndex, { type DirectoryFilter, type DirectoryRow } from "@/components/DirectoryIndex"; | 56:      <DirectoryIndex

- [x] G3: Directory uses kit terminal + option rows, not nested cards
  CHECK: rg -n "g-terminal|g-option|g-card" src/components/DirectoryIndex.tsx
  EXPECT: /g-terminal/
  EVIDENCE: 193:                    className="g-option directory-index__row" | 221:        <footer className="g-terminal__footer">

- [x] G4: People page keeps the no-score line
  CHECK: rg -n "carries a score label" src/app/people/page.tsx
  EXPECT: /carries a score label/
  EVIDENCE: 49:            {people.length} people in the field. Blank fields are unknown, not false. No person carries a score label.

- [x] G5: Next.js production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: ○  (Static)   prerendered as static content | ƒ  (Dynamic)  server-rendered on demand

- [x] G6: Browser /people — filter Gulyas, inspector shows Aaron Gulyas, Enter/open reaches UP-0192 (manual)
  EVIDENCE: IDE tab 1d515c. Filter “Gulyas” left one option UP-0192 Aaron Gulyas (selected); inspector heading Aaron Gulyas. /people/UP-0192 loads “This page does not score the person.” Screenshot people-terminal-1440.png.

- [x] G7: Browser /podcasts — filter finds a real show and opens its page (manual)
  EVIDENCE: /podcasts heading “78 shows in the field.” Filter “weaponized” left POD-001 WEAPONIZED with Jeremy Corbell & George Knapp (selected); inspector title matches. /podcasts/POD-001 heading WEAPONIZED; guests James Fox, Jacques Vallee, Jeremy Corbell, George Knapp.

- [x] G8: Browser people index — ArrowDown changes the selected row; footer stays honest (not a live shell) (manual)
  EVIDENCE: Focused people index, ArrowDown moved selected from UP-0192 Aaron Gulyas to UP-0510 Aaron Kuhn; inspector heading became Aaron Kuhn. Footer copy “select · enter open · stored index” (not a live shell).
