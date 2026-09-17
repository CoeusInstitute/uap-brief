# Gates: dossier window and chrome cleanup

Scope: Remove directory letter rail, directory/desk-window/site footers, and redesign the person desk window into a planned high-tech dossier.

- [x] G1: DirectoryIndex no longer renders a terminal footer
  CHECK: rg -n "g-terminal__footer" src/components/DirectoryIndex.tsx || echo NO_MATCH
  EXPECT: NO_MATCH
  EVIDENCE: NO_MATCH

- [x] G2: DirectoryIndex no longer renders the A–Z letter rail
  CHECK: rg -n "aria-label=\"Letters\"" src/components/DirectoryIndex.tsx || echo NO_MATCH
  EXPECT: NO_MATCH
  EVIDENCE: NO_MATCH

- [x] G3: Desk window frame no longer renders a terminal footer
  CHECK: rg -n "g-terminal__footer" src/components/DeskWindows.tsx || echo NO_MATCH
  EXPECT: NO_MATCH
  EVIDENCE: NO_MATCH

- [x] G4: Site chrome footer is gone from the app shell
  CHECK: rg -n "site-chrome--footer|<Footer|from \"@/components/Footer\"" src/app src/components || echo NO_MATCH
  EXPECT: NO_MATCH
  EVIDENCE: NO_MATCH

- [x] G5: Person desk window titlebar and body use a dedicated dossier layout
  CHECK: rg -n "dossier-window" src/components/DeskWindows.tsx src/components/PersonDeskRecord.tsx src/app/globals.css
  EXPECT: /dossier-window__/
  EVIDENCE: src/components/DeskWindows.tsx:260:          <button type="button" className="dossier-window__action" onClick={onClose}> | src/components/DeskWindows.tsx:266:      <div className="desk-window__body do

- [x] G6: Dossier CSS establishes distinct type roles
  CHECK: rg -n "dossier-window__name|dossier-window__heading|dossier-window__filemark" src/app/globals.css
  EXPECT: /dossier-window__name/
  EVIDENCE: 729:.dossier-window__name { | 793:.dossier-window__heading {

- [x] G7: Playwright people page opens a desk window without the removed chrome
  CHECK: powershell -NoProfile -Command "$env:TARGET_URL='http://localhost:3000'; node \"$env:USERPROFILE\\.cursor\\skills\\playwright-skill\\run.js\" \"$env:TEMP\\playwright-test-dossier.js\""
  EXPECT: playwright-ok
  EVIDENCE: } | playwright-ok

- [x] G8: Next.js production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: ○  (Static)   prerendered as static content | ƒ  (Dynamic)  server-rendered on demand
