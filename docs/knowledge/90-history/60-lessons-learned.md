# Lessons Learned

> Generated from `60-lessons-learned.jsonl`. Do not edit directly.

## LL-0007 — coverage1 undercounted sourced people; web first pass marked people done with 0 results after total Exa failure

- Date: `2026-09-16T16:07:10+00:00`
- Severity: `medium`
- Component: `tools/enrich`
- Tags: enrich, postgrest, verify

**Root cause:** PostgREST caps a single select at 1000 rows; a failed collector pass still wrote youtube/web=done so re-runs skipped the person

**Repair:** Paginate verify selects with range(from, from+999). Do not markCollector when every web query failed; use --force to retry

**Verification:** selectAll pagination reports coverage1 775/849; --force web retry produced 33 drops and candidates for all 13 Wave 1 people

## LL-0006 — First enrich-dossier invoke claiming 15 people hit hosted IDLE_TIMEOUT at 150s

- Date: `2026-09-16T16:06:52+00:00`
- Severity: `high`
- Component: `enrich-dossier`
- Tags: enrich, edge, timeout

**Root cause:** Hosted Edge Functions idle timeout is 150s; classifying many candidates with high-reasoning OpenRouter exceeds that window

**Repair:** Default max_n=2, release leftover claimed rows to pending at 105s with released_time_budget, loop invokes until the queue is done

**Verification:** 13/13 enrichment_queue status=done; person_sources 2028; leftovers from the timeout run were reclaimed on later invokes

## LL-0005 — spawn of mcporter.cmd failed with ENOENT/EINVAL so Exa search returned nothing for Wave 1 people

- Date: `2026-09-16T16:06:36+00:00`
- Severity: `medium`
- Component: `tools/enrich`
- Tags: enrich, windows, exa

**Root cause:** Node spawn of a .cmd shim is EINVAL on this Windows host; Exa --args=@file and quoted three-word queries also broke argument parsing

**Repair:** Spawn powershell.exe -NoProfile -Command with mcporter and psQuote unquoted query= values; never spawn .cmd directly

**Verification:** After the spawn fix, Wave 1 web collector kept candidates for all 13 people (617 kept, 33 drops) and queue-load wrote 1003 candidates

## LL-0004 — Every UFO Sightings Daily story landed image_status=placeholder while the page clearly carried og:image.

- Date: `2026-09-16T14:42:00+00:00`
- Severity: `medium`
- Component: `edge-functions`
- Tags: feed, images, ssrf

**Root cause:** Canonical URLs use the apex host, which fails TLS from the Edge runtime; the fetch fell back to the RSS excerpt with no HTML, so no image could be found.

**Repair:** fetchHtml in score-stories retries the same path on the www. host; placeholders were reset to pending and the backfill re-ran (41/65 stored, remaining pages declare no og:image).

**Verification:** stories: briefed 65/65, image stored 41, placeholder 24, pending 0; feed DOM 41 img, 0 broken.

## LL-0003 — page-frame was 303941px tall; story bodies were 77px wide; lead excerpt dumped site chrome including Skip to content and privacy policy.

- Date: `2026-09-16T14:16:56+00:00`
- Severity: `high`
- Component: `ui`
- Tags: feed, layout

**Root cause:** The only story-row child auto-placed into the empty thumb column. Kit overflow-wrap:anywhere then broke copy by letter. score-stories stored up to 8000 chars of stripped HTML when RSS excerpts were short.

**Repair:** Drop the unused thumb column; override desk wrap to break-word; clamp and reject chrome excerpts in displayExcerpt; strip nav/header/footer in htmlToExcerpt.

**Verification:** Live CDP: frame 303941/77px/anywhere -> 7167/819px/break-word; lead chrome gone; npx next build passed.

## LL-0002 — Menu stayed visible at 1661px desktop width even though CSS set .site-nav-toggle { display: none } below 40rem.

- Date: `2026-09-16T14:10:44+00:00`
- Severity: `low`
- Component: `ui`
- Tags: graphite, nav

**Root cause:** graphite-ui .g-button { display: inline-flex } has equal or higher specificity and wins over an unprefixed display:none.

**Repair:** Hide and show the toggle with .graphite-ui .site-nav-toggle.g-button so kit display cannot leak the control on wide viewports.

**Verification:** CDP at 1661px menuDisplay=none; Emulation 390px Menu collapsed then Close/expanded with Feed through About links.

## LL-0001 — First score batch filled the public feed with evergreen About pages

- Date: `2026-09-16T12:48:20+00:00`
- Severity: `medium`
- Component: `score-stories`
- Tags: ingest, scoring

**Root cause:** claim_pending_stories ordered by created_at ascending so oldest pending rows scored first

**Repair:** Order claim by published_at desc, created_at desc

**Verification:** stories_public lead became the 2026-09-16 UFO Sightings Daily item; next build passed
