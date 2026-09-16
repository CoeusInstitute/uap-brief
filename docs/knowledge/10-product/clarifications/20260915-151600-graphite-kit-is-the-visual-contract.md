# Clarification: Graphite kit is the visual contract

- **Captured:** 2026-09-15T19:16:00-04:00
- **Project root:** d:\My apps\UAP_Brief
- **Status:** answered
- **Owner:** specialist:clarify-intent
- **Source query:**

> I can see right off the bat you are not using the UI kit correctly. The cards do not look correct, and have no hover effects. I cannot stress enough that you cant go making up your own design, unless you run into a situation where the UI kit has a gap. In those situations infer the design and build accordingly. Remember this.

## Questions and answers

1. **Q:** When may the agent invent visual chrome?
   **A:** Never, unless the Graphite kit has a documented gap. Then infer from kit tokens and recipes.

2. **Q:** What is the card contract?
   **A:** `.g-card` with `.g-card__header` / `__body` / `__footer`, kit materials/edges, and the kit hover sheen. Not a custom `.panel` class.

## Confirmed brief

- **Goal:** Every surface uses Graphite recipes so cards have rest shadow, top edge, and hover sheen.
- **Non-goals:** A parallel Tailwind card language.
- **Constraints:** `frontend_design/graphite-ui-kit.md` + `graphite-ui.css` are the visual contract.
- **Success checks:** Methodology and other cards use `.g-card`; hover brightens the edge and shows the faint sheen; no invented `.panel`.
- **Open items:** none

## Agent usage

Read this file before implementing UI. Prefer these answers over guessing. Durable preference is also in root `AGENTS.md` Working stack / Design.
