# ADR 0001: Stack and repository layout

- Status: accepted
- Date: 2026-09-15
- Deciders: owner brief (`SYSTEM_BRIEF.md` section 11); recorded at first build

## Context

P0 delivered the registry dataset and the intended-system brief. The application, schema, and scoring engine did not exist. The sibling product The Bias Brief already runs Next.js App Router + Supabase + Edge Functions + OpenRouter + Vercel.

## Decision

Use the same stack as TBB, with versions pinned at first scaffold:

| Layer | Choice |
|---|---|
| App | Next.js 16.3.5 App Router, React 19.2.8, TypeScript, Tailwind CSS 4 |
| Hosting | Vercel (project name and domain TBD) |
| Data | Hosted Supabase ref `agrijbcilmymfsnkdpoh` |
| Client | `@supabase/supabase-js` 2.x, anon key only in the browser |
| Model | OpenRouter `deepseek/deepseek-v4.1-flash`, reasoning effort `high` (scoring later) |
| Visual | Graphite UI kit in `frontend_design/` |
| Graph (later) | `react-force-graph-3d` on `/graph`, lazy-loaded |

Repository layout: `src/` app, `supabase/`, `docs/adr`, `docs/knowledge`, `dataset/`, `tools/`.

`next.config.ts` sets `agentRules: false` so Next does not overwrite root `AGENTS.md`.

## Consequences

- Agents treat TBB as the pipeline and security reference, not as a scoring template.
- Scoring methodology is ADR 0003 (`mix_v2`). ADR 0002 is the historical eight-tag mix.
- X ingest waits for the official API stub; scraping is rejected.
- Local `supabase start` is not required for v1.
