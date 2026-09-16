# dataset — Offline registry seed

Binding contract for the canonical CSV registry. Parent rules in [../AGENTS.md](../AGENTS.md) apply and are not weakened here.

## Purpose

P0 seed of people, shows, appearances, timeline records, organizations, and X handle notes. Hosted import is applied; this folder remains the offline seed and the source for reversible merges. The live wiki reads `*_public` views, not these CSVs.

## Ownership

- Owns: CSV files, `DATA_DICTIONARY.md`, column vocabularies, id schemes (`UP-####`, `POD-###`, `APP-###`, `EVT-###`, `STM-###`, `ORG-###`).
- Does not own: hosted schema (`../supabase/AGENTS.md`) or Next.js rendering.

## Local Contracts

- Blank means unknown. Never treat blank as false, zero, or inapplicable.
- Multi-value cells use `|`. Dates are ISO at variable precision.
- Extraordinary claims stay recorded as claims. Skeptics and official positions are first-class rows.
- `tools/harvest.py` expects `full_name`/`aka`; the canonical people file uses `name`/`aliases`. Do not silently rename production columns to match the harvester.
- New people enter with provenance (`data_sources = added` style), at least one source, and a research note.

## Child DOX Index

- none

## Implementation Bias

Inherits the repository root `AGENTS.md` **Implementation Bias**: meet current
requirements and phase; no backward-compatibility theater by default; simplest
complete solution; prefer established libraries; infer intent from the query
plus project context; check end-user objective and avoid overcomplicating
codebase or UI. Record any true compatibility constraints for this subtree
under `Local Contracts` only.
