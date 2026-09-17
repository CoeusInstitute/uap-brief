# UAP Brief

A public intelligence brief for the UAP/UFO discourse: scored news, podcast episode detection, tracked figures, a people wiki, and a 3D network graph.

## Read order

| If you are... | Start here |
|---|---|
| A dev agent about to build | `docs/master-context-summary.md`, then `AGENTS.md`, then `SYSTEM_BRIEF.md` |
| Working with the data | `dataset/DATA_DICTIONARY.md`, then the CSVs in `dataset/` |

## Layout

```
UAP_Brief/
├─ SYSTEM_BRIEF.md          intended system description
├─ AGENTS.md                root DOX contract
├─ CONTEXT.md               product vocabulary
├─ PLAN.md / GATES.md       current build plan and checkable gates
├─ src/                     Next.js App Router UI
├─ supabase/                config, migrations, function contracts
├─ docs/                    ADRs and project knowledge
├─ frontend_design/         live app stylesheet (`graphite-ui.css`)
├─ dataset/                 canonical seed data
└─ tools/                   harvest.py, seed-registry.mjs
```

## Local app

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add the anon key when the hosted schema is live. Registry pages read `dataset/*.csv` in this phase and do not require Supabase.

## Hosted seed (P1, not applied yet)

1. Link the CLI to project `agrijbcilmymfsnkdpoh`.
2. `npx -y supabase db push --dry-run` then `db push`.
3. `SUPABASE_SERVICE_ROLE_KEY=... npm run seed`

## Constants

- Supabase project: `agrijbcilmymfsnkdpoh` (https://agrijbcilmymfsnkdpoh.supabase.co)
- Primary model: `deepseek/deepseek-v4.1-flash` via OpenRouter (key lives only in Supabase Edge Function secrets)
- Reference implementation for stack and pipeline shape: The Bias Brief (`CoeusInstitute/TBB`)

## Editorial ground rules (short form)

Claims are recorded as claims. Nothing asserts an extraordinary claim is true. Scores apply to material, not to people. Skeptics and official positions are first-class data. See `SYSTEM_BRIEF.md` section 12.
