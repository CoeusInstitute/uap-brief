# Gates: feed stall, images, hydration

Scope: Restore daily UAP news ingest after 2026-09-23, restore featured-image storage, and settle the reported hydration error.

- [x] G1: Newest Ready story on stories_public is dated after 2026-09-23, or a fresh ingest run has inserted at least one new story row since the fix.
  EVIDENCE: Ready rows scored 2026-10-01 21:30Z include "Why Might a UFO Glow, Then Vanish?" published 2026-09-30 16:42:47+00 and "Should UFOs Be Shot Down?" published 2026-09-30 11:30:11+00. Feed at http://localhost:3000/ shows both under the lead.

- [x] G2: Hosted cron jobs for ingest-news, gate-stories, translate-stories, and score-stories are active and have a recent successful run (or a successful manual tick after the fix).
  EVIDENCE: cron.job active for all four. gate-stories 2026-10-01 21:20Z claimed 5, accepted 3, rejected 2, failed 0. translate-stories same minute claimed 3, original 2, translated 1. score-stories 21:30Z scored 2, images_stored 2, failed 0. Prior gate errors were OpenRouter 401 User not found; that error is gone after the secret replace.

- [x] G3: Among Ready stories published on or after 2026-09-16, image_status is not stuck entirely on pending; stored images exist for rows that have an og:image, and the lead or a recent row exposes a stored image_url.
  EVIDENCE: score-stories images_stored=2. Both new Ready rows are image_status=stored. HEAD of both public story-images URLs returned 200. The feed screenshot shows the Sep 30 UAPs News and GreWi rows with photographs.

- [x] G4: The reported Next hydration mismatch is either fixed in app code or shown to be only data-cursor-ref attributes injected by the IDE browser, with no app Date/locale/window branch in the feed render.
  EVIDENCE: The pasted diff is only data-cursor-ref on server HTML versus the IDE browser. Feed dates use Intl.DateTimeFormat en-US. src grep found typeof window only in DeskWindows.tsx, which is not in the mismatch tree. The overlay "1 issue" is that browser attribute, not a feed render bug.
