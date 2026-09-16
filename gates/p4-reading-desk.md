# Gates: P4 reading desk (views, not ingest)

Scope: The public desk reads `stories_public` and related views. Empty corpus stays empty. No P2 ingest, no P3 scoring engine.

- [x] G1: Feed and story loaders query `stories_public` only
  CHECK: rg -n "stories_public" src/lib/stories.ts
  EXPECT: /stories_public/
  EVIDENCE: 62:    .from("stories_public") | 72:    .from("stories_public")

- [x] G2: Home filters Ready stories in memory from that view; empty copy stays honest
  CHECK: rg -n "filterStories|No stories in the feed yet|No stories match this filter" src/lib/feed.ts src/app/page.tsx
  EXPECT: /filterStories/
  EVIDENCE: src/app/page.tsx:65:        <p className="g-caption">{filtered ? "No stories match this filter." : "No stories in the feed yet."}</p> | src/lib/feed.ts:157:export function filterStories<T extends { ti

- [x] G3: Story page loads one row or refuses to invent
  CHECK: rg -n "loadStory|will not invent" src/lib/stories.ts src/app/story
  EXPECT: /loadStory/
  EVIDENCE: src/app/story\[id]\page.tsx:11:  const story = await loadStory(id); | src/app/story\[id]\page.tsx:38:          <p>There is no story with id {id}. The desk will not invent a headline, excerpt, or score

- [x] G4: No ingest function or scoring engine added
  CHECK: rg -n "ingest-news|score-stories" -g "*.ts" -g "*.tsx" src supabase/functions || echo NO_PIPELINE
  EXPECT: /NO_PIPELINE/
  EVIDENCE: NO_PIPELINE

- [x] G5: Next.js production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully/
  EVIDENCE: ○  (Static)   prerendered as static content | ƒ  (Dynamic)  server-rendered on demand

- [x] G6: Browser feed, people, and story/demo stay news-desk (manual)
  EVIDENCE: http://localhost:3000/ snapshot: “Lead story will appear here.” + “No stories in the feed yet.”; /?tag=PSYOP pressed + “No stories match this filter.”; /people “849 people in the field” + table 100 of 849; /story/demo “Not in the feed” + “will not invent a headline, excerpt, or score.” After UUID guard, demo no longer 500s.
