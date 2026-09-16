# Clarification: Header nav selected state uses underline tabs

- **Captured:** 2026-09-15T15:22:00-04:00
- **Project root:** d:\My apps\UAP_Brief
- **Status:** answered
- **Owner:** specialist:clarify-intent
- **Source query:**

> the selected state of the nav buttons need a new design. These look dumb

## Questions and answers

1. **Q:** May the header keep `.g-nav-item` selected (ivory + `#333333` face + left 2px rail)?
   **A:** No. That recipe is for vertical sidebar nav. It looks like a chip plus leftover rail in horizontal chrome.

2. **Q:** What kit recipe should the header infer?
   **A:** Kit §14: use underline tabs for flat content divisions. Keep ordinary `<a>` links and `aria-current="page"`. Do not add `role="tab"`. Do not wrap primary routes in `.g-segmented`.

3. **Q:** What is the selected visual?
   **A:** Ivory (`--text-heading`) plus a reserved 2px `--accent-primary` bottom rail. No `#333` chip. Hover may raise text to ivory; it must not add a fill or underline that imitates selection.

## Confirmed brief

- **Goal:** Current page is obvious without a sidebar chip in the masthead.
- **Non-goals:** `role="tab"` on site links; segmented-control primary nav; inventing a third visual language.
- **Constraints:** Graphite tokens and §14 only. Showcase masthead is text links, not `.g-nav-item`.
- **Success checks:** Selected item has no gray face and no left inset; a 2px accent underline sits on the chrome edge; layout does not shift when selection moves.
- **Open items:** none

## Agent usage

Read this file before changing header chrome. Durable preference is also in root `AGENTS.md` Working stack / Design.
