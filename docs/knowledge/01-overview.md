# UAP Brief — Overview

## What outcome does this project create for the end user?

A public brief that lets a reader scan UAP coverage, see how strongly each item exhibits owner-specified properties (woo, lacking data, vetted, and so on), open the people involved, and inspect the methodology. Evidence: `SYSTEM_BRIEF.md` §1.

## Who uses it?

People following the UAP/UFO space who want signal triage and context. Owner: Michai Morin, Coeus Institute.

## What is in scope and out of scope?

### In scope

- Registry wiki from hosted public views (seeded from `dataset/`)
- P1 schema + hosted seed (applied)
- News ingest, hybrid scoring (`mix_v2`), podcast ingest, official X API
- Public episode and X rails on the home desk
- 2D appearance network
- Later: Vercel project/domain (owner must name them)

### Out of scope

- 3D graph
- Copying TBB bias scores
- Cookie-session X scraping
- Fabricated editorial copy
- Person-level psyop/woo labels
- Public `/review` route and cookie/auth SSR

## What is the system at a glance?

Next.js App Router UI + hosted Supabase. P1 schema and registry seed are applied. The wiki reads public views. P2/P3/P6 Edge Functions are deployed; the feed reads Ready rows from `stories_public`.

## Glossary

| Term | Meaning | Evidence |
|---|---|---|
| Registry | Seed people/shows/orgs/timeline | `dataset/DATA_DICTIONARY.md` |
| Story | Canonical ingested news URL | `SYSTEM_BRIEF.md` §7 |
| Ready | Only public story status | `SYSTEM_BRIEF.md` appendix |
| Score | Tag + intensity + rationale + components | `SYSTEM_BRIEF.md` §5 |
