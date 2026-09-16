# Gates: P1 essentials scaffolding

Scope: Stand up the Next.js app, docs contracts, registry wiki from the seed CSVs, and the P1 schema files. Do not score stories.

- [x] G1: Next.js production build succeeds
  CHECK: npx next build
  EXPECT: /Compiled successfully|✓ Compiled/
  EVIDENCE: `npx next build` 2026-09-15 — Next.js 16.3.5, "Compiled successfully in 3.8s", TypeScript finished, static/dynamic routes listed.

- [x] G2: Public routes from SYSTEM_BRIEF section 10 exist as App Router pages
  CHECK: rg -n "export default" src/app/**/page.tsx
  EXPECT: /export default/
  EVIDENCE: export default on `/`, `/people`, `/podcasts`, `/organizations`, `/methodology`, `/about`, `/graph`, `/analytics`, plus dynamic `/story/[id]`, `/people/[id]`, `/podcasts/[id]`, `/organizations/[id]`, `/events/[id]`.

- [x] G3: No secrets committed; public env names only
  CHECK: .env.example + AGENTS.md name-only secret list
  EXPECT: /NEXT_PUBLIC_SUPABASE_/
  EVIDENCE: `.env.example` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and empty `SUPABASE_SERVICE_ROLE_KEY`. No `.env` committed. Secret *names* appear in AGENTS.md; no values.

- [x] G4: Core migration enables RLS and exposes named public views
  CHECK: rg -n "enable row level security|people_public|stories_public|security_invoker" supabase/migrations
  EXPECT: /people_public/
  EVIDENCE: `supabase/migrations/20260915190000_uap_core_schema.sql` — `people_public` and `stories_public` with `security_invoker = true`; RLS enabled on all public tables (lines 372–386).

- [x] G5: People index is generated from hosted `people_public`, not invented rows
  CHECK: rg -n "people_public|loadPeople" src/lib/registry.ts src/app/people/page.tsx
  EXPECT: /people_public/
  EVIDENCE: `src/lib/registry.ts` `loadPeople()` selects `people_public`. Seeded from `dataset/people.csv` via `tools/seed-registry.mjs`. `src/app/people/page.tsx` renders that list.
