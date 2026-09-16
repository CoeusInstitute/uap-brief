# Clarification: Site redesign on Graphite

- **Captured:** 2026-09-15T17:30:00-04:00
- **Project root:** d:\My apps\UAP_Brief
- **Status:** answered
- **Owner:** specialist:clarify-intent
- **Source query:**

> again you are not using the design system correctly. This is very poorly designed. Why are you placing [list item cards] in a tiny area but you span the whole card all across the entire row. also the background is exactly the same as the parent container. this whole [SearchList card] doesnt need a hover effect since it contains a massive amount of cards. I want a complete redesign from scratch.

## Questions and answers

1. **Q:** Which page frame should the redesign use?
   **A:** Public reading site. Compact top masthead with underline tabs, wide editorial content grid. Not an app sidebar. Use Graphite color, spacing, and card templates.

2. **Q:** How should the 849-person and 78-show registries be presented?
   **A:** Dense sortable `.g-table` with filter chips.

3. **Q:** How much motion is allowed?
   **A:** Cool and sharp, not over the top. A little loading is fine; do not lag weak machines.

## Confirmed brief

- **Goal:** Every surface has a real information hierarchy. Registries are tables. Detail pages use main + aside. Repeated records never get their own card.
- **Non-goals:** A parallel visual language; glass/blur; looping effects; per-row card chrome; inventing scores or stories.
- **Constraints:** Graphite tokens only. Inferred kit gaps: page frame, masthead, record rows, hero band, metric strip, static-card hover suppression (`data-hover="none"`).
- **Success checks:** No `.g-card` inside `.g-card` for list items; one featured material per page; row hover is color-only; tables start at 100 rows with Show more; reduced motion stops the radar sweep and signal trace.
- **Open items:** none

## Agent usage

Read this file before changing layout, lists, or chrome. Durable preference is also in root `AGENTS.md` Working stack / Design.
