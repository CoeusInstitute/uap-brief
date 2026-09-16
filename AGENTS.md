# UAP Brief

This is the DOX rail for UAP Brief. It is a binding work contract for the whole repository. Read this file before planning or editing, then walk the Child DOX Index to the nearest contract that owns the path you intend to touch.

> DOX is in effect here. AGENTS.md files are binding contracts for their subtrees.
> Re-read the applicable DOX chain in the current session before editing.

## Purpose

UAP Brief is a public intelligence brief for the UAP/UFO discourse. It turns curated news, podcast episodes, and (later) X posts into scored, sourced, navigable knowledge about people, claims, and coverage. The website only reads Supabase public views. Privileged collection and scoring run in Edge Functions. `dataset/` remains the offline seed and merge source.

Intended system: [SYSTEM_BRIEF.md](SYSTEM_BRIEF.md).
Briefing: [docs/master-context-summary.md](docs/master-context-summary.md).
Vocabulary: [CONTEXT.md](CONTEXT.md).
Router: [docs/knowledge/00-routing-map.md](docs/knowledge/00-routing-map.md).

## Ownership

- Root owns: security boundaries, working stack, validation commands, Child DOX Index, and Implementation Bias.
- `dataset/` owns the offline registry seed and its dictionary.
- `supabase/` owns schema, RLS, and hosted project facts.
- `supabase/functions/` owns Edge Function contracts (`ingest-news`, `match-entities`, `score-stories`, `ingest-podcasts`, `ingest-x`, `enrich-dossier`, `enrich-x`).
- `src/` is the Next.js App Router UI (no child contract until a durable UI boundary appears).

## Local Contracts

### Security boundaries

- Browser / Next public env may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The browser must never call OpenRouter or Edge Functions.
- Never commit `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY` / `OPENROUTER_API`, `X_BEARER_TOKEN`, `YOUTUBE_API_KEY`, or a scheduler secret.
- Every exposed table keeps RLS enabled. Anon reads public views only. Table SELECT is column-limited so invoker views work; the Next anon client must still query views, never base tables. No public writes.
- Score the material, not the person. Person pages never carry unqualified labels such as "psyop asset".
- No fabricated citations, summaries, or numbers. Unknown stays unknown.

### Working stack

- Frontend: Next.js App Router 16.3.5, React 19, TypeScript, Tailwind CSS 4. Hosted target TBD (Vercel). Keep `agentRules: false` in `next.config.ts`. Server client is `@supabase/supabase-js` only (no cookie/auth SSR).
- Backend: hosted Supabase project ref `agrijbcilmymfsnkdpoh`, URL `https://agrijbcilmymfsnkdpoh.supabase.co`. CLI links to hosted; local `supabase start` is not required for v1.
- Models: OpenRouter, `deepseek/deepseek-v4.1-flash`, `reasoning.effort` `high`. Do not send `temperature`. Scoring methodology is `mix_v2` / `score_v2` per [docs/adr/0003-tag-set-mix-v2.md](docs/adr/0003-tag-set-mix-v2.md). Only Edge Functions call OpenRouter or X.
- Design: Graphite UI kit in `frontend_design/` is the visual contract. Dark theme is the default. Use kit recipes (`.g-card`, `.g-card__header` / `__body` / `__footer`, `.g-field`, `.g-link`, `.g-badge`, typography helpers). Do not invent parallel card, panel, or hover styles. Infer only when the kit has a documented gap. Documented gaps: page frame (`.page-frame` single / main-aside), masthead (`.site-nav` underline tabs, not `.g-nav-item`), record rows (`.record-list`), hero band, metric strip, sticky feed filter, dashed lead slot, story row, assessment line (`.assessment-line`: caution label, bipolar hairline, substance label; Graphite warning/success tokens, not TBB lean colors), directory index (`.directory-index` on `.g-terminal`: search-first name list, letter or decade rail, inspector dossier), appearance network (`.network-desk` on `.g-terminal`: 2D force graph plus name list; reduced motion uses the list), timeline scrub (`.timeline-scrub` decade rail over a `RecordList`), detachable desk window (`.desk-window` on `.g-terminal`: non-modal, draggable, resizable, max 8, overlay tokens; not `.g-dialog`, which is modal plus scrim), person record in a desk window (`.desk-record`: stacked sections, DetailList + RecordList, no nested cards; people directory selection opens this, not the inspector dossier; titlebar `page` is the route). Repeated records use `RecordList`, `.g-table`, or directory-index option rows, never nested `.g-card`. Container cards that hold tables or long lists use `data-hover="none"`. Header selected: `.site-nav` links with `aria-current="page"`, ivory text, and a reserved 2px `--accent-primary` bottom rail (kit §14 underline tabs). Do not add `role="tab"`. One featured material per page.
- Front door: `/` is a news feed. Composition follows The Bias Brief (sticky search, lead slot with featured image, 16:9 thumbnail story rows). `/` is single-column with no aside; the owner removed the Watching, Latest episodes, and Signal from X rails and the tag / form chip rows (2026-09-16). Graphite still owns visuals — do not copy TBB classes, Newsreader, or bias chips. No page display title on `/`; the masthead wordmark is enough. Primary nav label is Feed. The feed and `/story/[id]` read `stories_public`. The sticky bar is the search field. Each Ready row and the lead show an assessment line: one caution tag (`WOO`, `LACKING_DATA`, or `PSYOP`) paired with one substance tag (`CREDIBLE`, `INTERESTING`, or `VETTED`). `g-badge` chips stay on `/story/[id]` Scores and Method. Each row shows `summary` (the model brief, 2–5 sentences) and falls back to the cleaned excerpt only while a brief is missing. Images come from `image_url` when `image_status = stored`; otherwise a row keeps an empty `.g-surface` well and the lead omits the media block; never a stock placeholder. Lead prefers `form = news`, then excludes UFO Sightings Daily unless it is the only row. `ingest-x` still stores tracked-account posts for person pages. Empty corpus stays empty.
- Voice: news desk, short. Cute or scaffolding copy is a defect (rhetorical questions, phase codes, “hosted views,” registry-first framing on the home page). Allowed: “No stories in the feed yet.” “Scores apply to the story, not the person.” “No stories match this filter.”
- Sibling: The Bias Brief (`D:\My apps\The_Bias_Brief`, `CoeusInstitute/TBB`) is the reference for stack, pipeline shape, and home composition. Do not copy TBB bias scoring or TBB CSS.
- Phase: P1 hosted schema and registry seed are applied. P4 reading desk is in place. P5 graph is the appearance network (2D, not 3D). P2/P3/P6 pipelines are unblocked (owner, 2026-09-16): news ingest, entity match, hybrid scoring, podcast RSS/YouTube feeds, official X API. Do not invent RSS URLs, subscriber counts, follower counts, stories, or scores. Empty feed stays empty until `stories_public` has Ready rows.

### Verification

Commands that exist after this scaffold (run from the repo root):

- `npx next build`
- `npx -y supabase db push --dry-run` (only after the CLI is linked to hosted UAP-Brief)

Do not invent additional verification commands.

## Child DOX Index

- [dataset/AGENTS.md](dataset/AGENTS.md) — offline registry seed and dictionary
- [supabase/AGENTS.md](supabase/AGENTS.md) — hosted schema, RLS, migrations
- [supabase/functions/AGENTS.md](supabase/functions/AGENTS.md) — Edge Functions, secrets, scheduler header

## Implementation Bias

Default decision rules for **implementation** work in this repository (code, APIs,
data shapes, and UI). Child `AGENTS.md` docs may specialize how these apply
locally, but must not weaken them. Documentation install/retrofit still
preserves existing app behavior while the DOX tree is built — this section
governs how agents choose solutions when building or changing the product.

### Meet the current need
- Optimize for **current requirements** and the **current project phase**
  (spike, MVP, hardening, polish)—not for speculative futures.
- **Do not preserve backward compatibility by default.** Prefer clean
  replacement, a deliberate migration, or deletion of obsolete paths over
  long-lived shims, dual APIs, forever feature flags, or “just in case”
  compatibility layers.
- If compatibility is truly required (published API, shipped client, user data,
  regulatory constraint), record that constraint explicitly in the nearest
  `Local Contracts`—do not invent it.

### Simplest complete solution
- Choose the **simplest implementation that fully meets the stated need**.
- Prefer delete/replace over wrap/extend when requirements have moved on.
- Do not add abstraction, configuration surfaces, or architecture “for later”
  unless the current task requires them.

### Prefer maintained libraries
- Prefer **established, well-maintained libraries** for backend and frontend
  over custom reimplementation of solved problems (auth, forms, validation,
  HTTP, dates, UI primitives, etc.).
- Write custom code when the domain is specific, the library is a poor fit, or
  it would add unacceptable weight or a parallel stack.
- Prefer the project’s existing stack choices over introducing a second toolkit.

### Infer intent before building
- Infer what the developer is asking from the query **plus** this project’s
  purpose, phase, and existing patterns.
- When the ask is mildly underspecified, use `clarify-intent`. When it is
  heavy/fuzzy (design, domain language, multi-path plan), use `grill-me`
  before building—do not spend a complex wrong solution first.

### End-user and efficiency checks
Before locking an approach, answer:

1. **What is the objective for the end user?**
2. **Will this solve the developer’s query without overcomplicating the
   codebase or UI?**
3. **Is this the most efficient and effective solution for the current phase?**

If any answer is “no” or “unclear,” simplify or clarify before implementing.

<!-- PROJECT-KNOWLEDGE-ARCHIVIST:START -->
## Project Knowledge Archivist

- Own and maintain hierarchical `AGENTS.md` contracts, `docs/knowledge/` routing, inventories, lessons JSONL, and [docs/master-context-summary.md](docs/master-context-summary.md).
- Before non-trivial work: read this chain → master context summary → [docs/knowledge/00-routing-map.md](docs/knowledge/00-routing-map.md) → minimum routed targets (budget 4).
- After durable facts change: update the owning knowledge record and refresh routes; keep secret values out of docs.
- Machine routing index lives under `~/.cursor/harness-state/project-knowledge/` (not committed).
- Verify with sequential: `python "%USERPROFILE%\.cursor\skills\project-knowledge-archivist\scripts\knowledge_cli.py" audit --secret-scan` then `validate --strict`.
<!-- PROJECT-KNOWLEDGE-ARCHIVIST:END -->

