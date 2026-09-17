# Clarification: News-desk home is a TBB-pattern feed

- **Captured:** 2026-09-15T17:35:00-04:00
- **Project root:** d:\My apps\UAP_Brief
- **Status:** answered
- **Owner:** specialist:clarify-intent
- **Source query:**

> I dont think you fully understand the nature of this site. This is a UAP news aggregate. Pattern the home off The Bias Brief: filters, a lead story, a list of stories. The cute hero copy is garbage. I want a news-like site.

## Questions and answers

1. **Q:** What should `/` show before ingest exists?
   **A:** News-desk shell only. Empty geometry plus the eight named sources. Do not invent headlines, excerpts, or scores.

2. **Q:** What happens to People, Podcasts, Graph, Analytics, Method, and About?
   **A:** Keep every current nav link. Rename Brief to Feed.

## Confirmed brief

- **Goal:** The front door is a UAP news feed. People / shows / graph stay in the nav but are not the product’s opening move.
- **Non-goals:** P2 ingest, P3 scoring, invented stories, TBB bias spectrum.
- **Constraints:** Sticky tag and form chips write `searchParams`. Lead slot is dashed empty copy (“Lead story will appear here.”). Watching lists only the eight homepage URLs in `SYSTEM_BRIEF.md` §6.
- **Success checks:** No cute headline on `/`. Nav says Feed. Filter chips update the URL. `/people` stays a table. `/story/demo` does not invent a story.
- **Open items:** none

## Agent usage

Read this file before changing `/`, feed chrome, or home copy. Durable preference is also in root `AGENTS.md` Working stack (Front door, Voice).
