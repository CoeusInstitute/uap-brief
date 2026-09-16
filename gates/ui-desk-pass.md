# Gates: UI desk pass (Graphite + news-desk)

Scope: Fix the public desk so each primary surface meets Graphite recipes and news-desk voice. No invented stories. No P2/P3.

- [x] G1: Empty lead uses stacked g-card well + body, not a side-by-side black box
  CHECK: rg -n "lead-slot__well|g-card__body|Lead story will appear here" src/components/StoryRow.tsx
  EXPECT: /g-card__body/
  EVIDENCE: 34:        <div className="g-surface lead-slot__well" data-surface="well" aria-hidden="true" /> | 35:        <div className="g-card__body">

- [x] G2: Empty feed list uses a container g-card, not a stray caption
  CHECK: rg -n "feed-empty|No stories in the feed yet" src/app/page.tsx
  EXPECT: /feed-empty/
  EVIDENCE: 67:            <h2 className="g-heading" id="feed-empty"> | 68:              {filtered ? "No stories match this filter." : "No stories in the feed yet."}

- [x] G3: Filter chips use kit compact size
  CHECK: rg -n "data-size" src/components/FeedFilter.tsx
  EXPECT: /data-size="sm"/
  EVIDENCE: 32:                  data-size="sm" | 52:                  data-size="sm"

- [x] G4: Footer drops scaffolding “Public views only”
  CHECK: rg -n "Public views only|hosted views" src/components/Footer.tsx src/app || echo NO_SCAFFOLD
  EXPECT: /NO_SCAFFOLD/
  EVIDENCE: NO_SCAFFOLD

- [x] G5: Next.js production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: ○  (Static)   prerendered as static content | ƒ  (Dynamic)  server-rendered on demand

- [x] G6: Browser feed at 1440 — dashed lead, Watching has eight sources, Feed selected, no cute headline (manual)
  EVIDENCE: IDE tab 1d515c http://localhost:3000/ after Emulation.clearDeviceMetricsOverride. Snapshot: Feed aria-current, Lead + “Lead story will appear here.”, “No stories in the feed yet.”, Watching list UAP News Center / The UFO Chronicles / UFO Sightings Daily / UAPs News / UFO Pulse / UFO UAP / PBS NewsHour / UFO News (8). Screenshot feed-desk-1440-nav.png: stacked dashed lead well above body, solid empty card, two-column rails, nav clustered after wordmark. No page display title on `/`.

- [x] G7: Browser people table and one person page load without invented scores (manual)
  EVIDENCE: /people heading “People”, lede “849 people in the field… No person carries a score label.” Registry “100 of 849”. Filter “Gulyas” → “1 of 1 · 849 total”, only Aaron Gulyas. /people/UP-0192 heading Aaron Gulyas, “This page does not score the person.” No PSYOP/WOO chips on the person. Screenshot people-desk-1440.png.

- [x] G8: Browser feed at 390 — filters, lead, and Watching remain usable (manual)
  EVIDENCE: Emulation.setDeviceMetricsOverride 390x844 then navigate `/`. Snapshot still has Tags/Form chips, search, Lead, empty card, Latest episodes, Signal from X, Watching with the same eight source links stacked (page-frame collapses at 60rem). Screenshot feed-desk-390.png left column: chips wrap, lead stacked, rails stack. Viewport override leaves unused canvas to the right of 390; that is the emulator, not a page-frame hole.
