# Person profile photos (Track F)

Every person carries a verified profile image for the frontend (shown when a user opens that person's card).

## Data model
- `people.photo_url` — public URL of the image (Supabase Storage bucket `person-images`, object path `<person_id>.<ext>`)
- `people.photo_source_url` — the page the image came from (provenance)
- `people.photo_source_type` — `wikipedia` | `wikidata` | `web_profile` | `official_site` | `x_avatar` | `youtube_avatar` | `squad_verified` | `web_search`
- `people.photo_confidence` — `high` | `medium` | `low`
- `people.photo_checked_at` — last lookup timestamp (misses included)
- `people.photo_notes` — QC notes (duplicate-hash flags, low-res flags, deferrals)
- Public view **`people_public`** exposes `photo_url`, `photo_source_type`, `photo_confidence` — use that from the web app.

## Frontend usage
```ts
const { data } = await supabase.from("people_public")
  .select("person_id,name,photo_url,photo_source_type,photo_confidence")
  .eq("person_id", id).single();
// photo_url === null -> render an initials placeholder; never guess an image client-side.
```
Optional polish: a small source badge from `photo_source_type`; `medium` confidence images are displayable but reviewable.

## Provenance rules (strict, enforced by the pipeline)
1. Automatic assignment only from structurally person-linked sources: the person's Wikipedia page image, their Wikidata entity portrait (P18), their official/personal site (`og:image`), or their X account avatar via the official API with a display-name cross-check against the registry name.
2. The X display-name check refuses stale/reassigned handles (e.g. an `EyesOnCinema` handle X later reassigned to an unrelated account was refused).
3. Duplicate images across different people are blocked and flagged in `photo_notes`.
4. Nobody gets a guessed image. Misses stay `null` with `photo_checked_at`/`photo_notes` recorded for the next phase.

## Pipeline implementation
- **F1 (deterministic, bulk):** `.enrich/photos/collect_photos.py` — Wikipedia (+ thumbnail fallback for oversized originals), Wikidata P18, official-site og:image (up to 5 site links; skips generated OG cards and logos are flagged in notes).
- **F1.5 (X avatars):** edge function `x-avatar` (official X API via `X_BEARER_TOKEN`, batched handle lookup, $0.01/lookup) + a runner pass; storage uploads at 400x400.
- **F2 (verification squads):** for remaining gaps, web-search with page-identity rules (only pages ABOUT the person count; no listicles/collages/name-collisions), written to `.enrich/queue2/`-style review then applied.
- **Upgrades:** low-res or `medium` images get replaced when a better verified source is found; provenance is always rewritten with the new source.

## Ops notes
- Bucket `person-images` is public-read; uploads use the service key with `x-upsert`.
- Migration `20260916180000_p7_person_photos.sql`; function `x-avatar` deployed via `supabase functions deploy x-avatar --project-ref agrijbcilmymfsnkdpoh --use-api`.
