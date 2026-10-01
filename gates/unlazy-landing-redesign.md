# Gates: landing news-desk redesign

Scope: Rebuild `/` as a two-column news desk with three score formats and a story desk window, without changing `/story/[id]` or the person window.

- [x] G1: `npx next build` exits 0 and the route table lists `/` and `/story/[id]`.
  CHECK: npx next build
  EXPECT: /Compiled successfully[\s\S]*story\/\[id\]/
  EVIDENCE: Compiled successfully. Route table lists `ƒ /` and `ƒ /story/[id]`. gate-check matched the expect regex; its auto tail only kept the trailing npm notice lines.

- [x] G2: No WOO or Woo text in the new front components, the home page, or the story-record builder.
  CHECK: node -e "const fs=require('fs'),path=require('path');function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]})}const files=[...walk('src/components/front'),'src/app/page.tsx','src/lib/story-record.ts'];const hit=files.filter(f=>fs.existsSync(f)&&/WOO|Woo/.test(fs.readFileSync(f,'utf8')));if(hit.length){console.log(hit.join('\n'));process.exit(1)}console.log('NO_MATCHES')"
  EXPECT: NO_MATCHES
  EVIDENCE: NO_MATCHES

- [x] G3: The app source never calls OpenRouter or an Edge Function URL.
  CHECK: node -e "const fs=require('fs'),path=require('path');function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]})}const hit=walk('src').filter(f=>/openrouter|functions\/v1/i.test(fs.readFileSync(f,'utf8')));if(hit.length){console.log(hit.join('\n'));process.exit(1)}console.log('NO_MATCHES')"
  EXPECT: NO_MATCHES
  EVIDENCE: NO_MATCHES

- [x] G4: The app never reads the base `stories` table.
  CHECK: node -e "const fs=require('fs'),path=require('path');function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]})}const hit=walk('src').filter(f=>/from\(\"stories\"\)/.test(fs.readFileSync(f,'utf8')));if(hit.length){console.log(hit.join('\n'));process.exit(1)}console.log('NO_MATCHES')"
  EXPECT: NO_MATCHES
  EVIDENCE: NO_MATCHES

- [x] G5: Desktop layout matches the reference regions (lead split, divider, 3-up cards x2, 3-column thumb grid x6, rail rule plus featured plus list).
  EVIDENCE: localhost:3000 at 1400x900. Lead grid 332.5px/465.5px (text left, image right). Divider present. Middle 6 cards in 3 columns (263px). Small 18 cells in 3 columns (square thumbs, type badge, headline, timer). Rail 12 headlines, aside border-left 1px, frame columns 819px/280px. Earlier list 480 rows. Screenshot front-desktop-1400.png and front-small-grid.png.

- [x] G6: Plain-click opens a draggable story window with image, brief, link, scores, date, publisher, and type. Modifier-click navigates. The person window is unchanged.
  EVIDENCE: Plain-click on "The Event Horizon of Alien High Tech" opened a 600x680 dialog at (72,96). Content included Opinion file, publisher Avi Loeb, date Oct 1 2026 3:06 PM, type Opinion, Illustration image, brief, assessment panel, score rationales, "Read at Avi Loeb" (target _blank), and "Scores apply to the story, not the person." Synthetic titlebar drag moved it to (192,176), delta +120/+80. Ctrl-click opened a new tab at /story/c1303a99-e99a-4dd8-be5a-18e049aecd5b and left no dialog on /. /story/[id] still shows the lead, Scores, named entities, and Source. Alexander Wendt's person window still shows Person file, Attributed position, Identity, Provenance.

- [x] G7: Reloading `/` shows no hydration warning, and a rail timer advances after 60 seconds.
  EVIDENCE: Rail timer moved from "44h 38m ago" to "44h 40m ago" across the session (more than 60s). The dev overlay hydration diff is only data-cursor-ref attributes injected by the IDE browser (same as the earlier feed check). Diff lines that mention times are story titles, not timer text.

- [x] G8: At 900px the rail stacks and grids are 2 columns. At 390px grids are 1 column.
  EVIDENCE: At 900px, frame is one 843px column, aside border-top 1px and border-left 0, lead is one column, middle/small/rail are 2 columns. At 390px, middle, small, and rail are each one 362px column. Screenshots front-900.png and front-390.png. Device metrics override cleared afterward.

- [x] G9: `/?q=zzzz-no-match` shows "No stories match this filter." and a Clear filter link.
  EVIDENCE: Heading "No stories match this filter." and a link named "Clear filter" at http://localhost:3000/?q=zzzz-no-match. Search box value was zzzz-no-match.
