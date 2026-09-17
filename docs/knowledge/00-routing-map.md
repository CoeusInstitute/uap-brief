# Project Knowledge Routing Map

> Canonical in-repository routing view. The regenerable machine index lives
> outside the repository under `~/.cursor/harness-state/project-knowledge/`.

## Required read order

1. Archivist-managed root-to-local `AGENTS.md` chain.
2. `docs/knowledge/00-routing-map.md`.
3. Minimum sufficient routed targets.

Initial project-knowledge read budget: **4 documents**.

## Routes

| Document | Owner | Purpose | Answers | Freshness |
|---|---|---|---|---|
| `.cursor/loop-progress.md` | goal-loop | Current goal-loop progress, evidence, and terminal status. | What is the current goal, iteration, evidence, blocker, or terminal status? | review |
| `AGENTS.md` | project-knowledge-archivist | Path-scoped agent instructions and direct Child DOX Index. | What instructions apply before editing this path? | review |
| `CONTEXT.md` | external | Repository record: UAP Brief. | What does UAP Brief define? | review |
| `dataset/AGENTS.md` | project-knowledge-archivist | Path-scoped agent instructions and direct Child DOX Index. | What instructions apply before editing this path? | review |
| `dataset/DATA_DICTIONARY.md` | external | Repository record: UAP Brief data dictionary. | What does UAP Brief data dictionary define? | review |
| `docs/adr/0001-stack-and-repo-layout.md` | external | Decisions, incidents, verified repairs, or lessons learned. | What was decided, what failed before, and how was it verified or repaired? | review |
| `docs/knowledge/00-meta/gaps.json` | project-knowledge-archivist | Repository record: Gaps. | What does Gaps define? | review |
| `docs/knowledge/00-meta/integration-registry.json` | project-knowledge-archivist | Repository record: Integration Registry. | What does Integration Registry define? | review |
| `docs/knowledge/00-meta/knowledge-config.json` | project-knowledge-archivist | Repository record: Knowledge Config. | What does Knowledge Config define? | fresh |
| `docs/knowledge/00-meta/knowledge-health.json` | project-knowledge-archivist | Repository record: Knowledge Health. | What does Knowledge Health define? | review |
| `docs/knowledge/00-meta/merged-capabilities.md` | project-knowledge-archivist | Repository record: Merged Capabilities. | What does Merged Capabilities define? | fresh |
| `docs/knowledge/01-overview.md` | project-knowledge-archivist | Repository record: UAP Brief — Overview. | What does UAP Brief — Overview define? | review |
| `docs/knowledge/10-product/clarifications/20260915-173500-news-desk-home-is-tbb-pattern.md` | project-knowledge-archivist | Repository record: Clarification: News-desk home is a TBB-pattern feed. | What does Clarification: News-desk home is a TBB-pattern feed define? | fresh |
| `docs/knowledge/10-product/clarifications/README.md` | project-knowledge-archivist | Repository record: Prompt clarifications. | What does Prompt clarifications define? | review |
| `docs/knowledge/90-history/60-lessons-learned.jsonl` | project-knowledge-archivist | Decisions, incidents, verified repairs, or lessons learned. | What was decided, what failed before, and how was it verified or repaired? | fresh |
| `docs/knowledge/90-history/60-lessons-learned.md` | generated | Decisions, incidents, verified repairs, or lessons learned. | What was decided, what failed before, and how was it verified or repaired? | fresh |
| `docs/master-context-summary.md` | project-knowledge-archivist | High-level project purpose, setup, or orientation. | What is this project and what outcome does it create? | review |
| `GATES.md` | external | Repository record: Gates: P1 essentials scaffolding. | What does Gates: P1 essentials scaffolding define? | review |
| `gates/directory-sources-translate.md` | external | APIs, events, webhooks, jobs, queues, edge functions, or MCP contracts. | What contract, trigger, input, output, or failure behavior applies? | fresh |
| `gates/events-station.md` | external | APIs, events, webhooks, jobs, queues, edge functions, or MCP contracts. | What contract, trigger, input, output, or failure behavior applies? | review |
| `gates/name-station.md` | external | Repository record: Gates: search-first name station. | What does Gates: search-first name station define? | review |
| `gates/p4-reading-desk.md` | external | Repository record: Gates: P4 reading desk (views, not ingest). | What does Gates: P4 reading desk (views, not ingest) define? | review |
| `gates/p5-motion.md` | external | Repository record: Gates: P5 motion leftover — timeline scrub. | What does Gates: P5 motion leftover — timeline scrub define? | review |
| `gates/p5-network.md` | external | Repository record: Gates: P5 network and remaining wiki. | What does Gates: P5 network and remaining wiki define? | review |
| `gates/terminal-browse.md` | external | Repository record: Gates: Terminal directory browse (people + podcasts). | What does Gates: Terminal directory browse (people + podcasts) define? | review |
| `gates/wiki-crosswalk.md` | external | Repository record: Gates: Wiki record crosswalk. | What does Gates: Wiki record crosswalk define? | review |
| `package-lock.json` | external | Repository record: Package Lock. | What does Package Lock define? | review |
| `package.json` | external | Build, dependency, runtime, or infrastructure configuration. | What does Package define? | review |
| `PLAN.md` | external | Repository record: Plan: P1 essentials scaffolding. | What does Plan: P1 essentials scaffolding define? | review |
| `README.md` | external | High-level project purpose, setup, or orientation. | What is this project and what outcome does it create? | review |
| `supabase/AGENTS.md` | project-knowledge-archivist | Path-scoped agent instructions and direct Child DOX Index. | What instructions apply before editing this path? | review |
| `supabase/config.toml` | external | Platforms, services, accounts, subscriptions, regions, tiers, and limits. | Which platform service, account, subscription, region, tier, or limit applies? | review |
| `supabase/functions/AGENTS.md` | project-knowledge-archivist | Path-scoped agent instructions and direct Child DOX Index. | What instructions apply before editing this path? | review |
| `SYSTEM_BRIEF.md` | external | Repository record: UAP Brief: intended system brief. | What does UAP Brief: intended system brief define? | review |
| `tsconfig.json` | external | Repository record: Tsconfig. | What does Tsconfig define? | review |

## Routing rules

| Rule | Task terms | Read | Reason |
|---|---|---|---|
| intended-system | product, pillar, M1, scoring, tag, roadmap | `SYSTEM_BRIEF.md`<br>`docs/master-context-summary.md` | The brief is the intended-system spec until code exists. |
| registry-data | people, csv, column, alias, UP-, POD- | `dataset/DATA_DICTIONARY.md`<br>`dataset/AGENTS.md` | CSV folder is the offline seed; the live wiki reads public views. |
| schema-rls | migration, RLS, view, seed, supabase | `supabase/AGENTS.md`<br>`SYSTEM_BRIEF.md` | Hosted P1 applied; anon reads views with column-limited invoker grants. |
| scoring-method | PSYOP, WOO, mix, methodology, prompt | `SYSTEM_BRIEF.md`<br>`CONTEXT.md` | No scoring ADR yet; do not write scoring code. |
| debug-prior-lessons | error, bug, failed, regression | `docs/knowledge/90-history/60-lessons-learned.jsonl` | Route repairs to verified lessons. |
| prompt-clarifications | clarify, intent, underspecified | `docs/knowledge/10-product/clarifications/README.md` | Reuse answered constraints before asking again. |

## Gaps

- **scoring-adr:** Closed 2026-09-16. ADR 0003 owns the live tag set and poles.
- **hosted-seed:** Closed 2026-09-15. Schema and CSV import are on hosted UAP-Brief; the wiki reads public views.
- **vercel-project:** Vercel project name and public domain are TBD.
- **x-follower-floor:** Official X API is the access route; 20k watchlist floor is still default-only.
- **podcast-reach:** 50k subscriber threshold is the owner default, not a confirmed constant.
