import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret, USER_AGENT } from "../_shared/schedulerAuth.ts";
import { assertSafeUrl, fetchFollowingRedirects } from "../_shared/ssrf.ts";
import { canonicalizeUrl, hostnameOf } from "../_shared/canonicalize.ts";
import { parseFeed } from "../_shared/rss.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";
import { matchPeople, type PersonAlias } from "../_shared/entities.ts";
import { UAP_TERMS } from "../_shared/uap-terms.ts";

type ShowRow = {
  podcast_id: string;
  podcast_name: string;
  feed_url: string | null;
  youtube_url: string | null;
  subscribers: number | null;
  focus_tags: string[] | null;
  category: string | null;
};

const REACH_FLOOR = 50_000;
const PER_SHOW = 10;
const SHOW_CAP = 12;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const supabase = serviceClient();
  const runId = await openRun(supabase, "ingest-podcasts");
  let inserted = 0;
  let skippedReach = 0;
  let skippedNoFeed = 0;
  let showsOk = 0;
  const errors: unknown[] = [];

  try {
    const { data: people } = await supabase.from("person_aliases").select("normalized_alias,person_id");
    const aliases = (people ?? []) as PersonAlias[];
    const { data: shows, error } = await supabase
      .from("podcasts")
      .select("podcast_id,podcast_name,feed_url,youtube_url,subscribers,focus_tags,category");
    if (error) throw error;

    const { data: episodeRows } = await supabase.from("episodes").select("podcast_id");
    const episodeCounts = new Map<string, number>();
    for (const row of episodeRows ?? []) {
      const id = String(row.podcast_id ?? "");
      episodeCounts.set(id, (episodeCounts.get(id) ?? 0) + 1);
    }
    const queued = (shows ?? []) as ShowRow[];
    queued.sort((a, b) => {
      const aFeed = Number(Boolean(a.feed_url || youtubeFeed(a.youtube_url)));
      const bFeed = Number(Boolean(b.feed_url || youtubeFeed(b.youtube_url)));
      if (bFeed !== aFeed) return bFeed - aFeed;
      return (episodeCounts.get(a.podcast_id) ?? 0) - (episodeCounts.get(b.podcast_id) ?? 0);
    });
    let attempted = 0;
    for (const show of queued) {
      if (show.subscribers != null && show.subscribers < REACH_FLOOR) {
        skippedReach += 1;
        continue;
      }
      const feedUrl = show.feed_url || youtubeFeed(show.youtube_url);
      if (!feedUrl) {
        skippedNoFeed += 1;
        continue;
      }
      if (attempted >= SHOW_CAP) continue;
      attempted += 1;
      const siteHost = hostnameOf(feedUrl);
      if (!siteHost) {
        skippedNoFeed += 1;
        continue;
      }
      try {
        const response = await fetchFollowingRedirects(
          feedUrl,
          (raw) => assertSafeUrl(raw),
          {
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
            },
            timeoutMs: 15000,
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const items = parseFeed(await response.text()).slice(0, PER_SHOW);
        const focused = isUapFocused(show);
        for (const item of items) {
          if (!focused && !looksUap(`${item.title} ${item.excerpt}`)) continue;
          const url = canonicalizeUrl(item.link);
          if (!url) continue;
          let pubDate: string | null = null;
          if (item.publishedAt) {
            const parsed = new Date(item.publishedAt);
            if (!Number.isNaN(parsed.getTime())) pubDate = parsed.toISOString();
          }
          const guests = matchPeople(`${item.title}\n${item.excerpt}`, aliases).map((hit) => ({
            person_id: hit.entity_id,
            match_method: hit.match_method,
          }));
          const { error: insertError } = await supabase.from("episodes").insert({
            podcast_id: show.podcast_id,
            title: item.title.slice(0, 500),
            pub_date: pubDate,
            url,
            guests,
            relevance: { uap: focused || looksUap(`${item.title} ${item.excerpt}`) },
          });
          if (!insertError) inserted += 1;
        }
        showsOk += 1;
      } catch (cause) {
        errors.push({
          podcast_id: show.podcast_id,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }

    await closeRun(supabase, runId, { inserted, shows_ok: showsOk, skipped_reach: skippedReach, skipped_no_feed: skippedNoFeed }, errors);
    return jsonResponse(
      { ok: true, inserted, shows_ok: showsOk, skipped_reach: skippedReach, skipped_no_feed: skippedNoFeed, errors },
      200,
      corsHeaders,
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, { inserted, shows_ok: showsOk, skipped_reach: skippedReach, skipped_no_feed: skippedNoFeed }, errors);
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});

function isUapFocused(show: ShowRow): boolean {
  const hay = `${show.category ?? ""} ${(show.focus_tags ?? []).join(" ")} ${show.podcast_name}`.toLowerCase();
  return UAP_TERMS.some((term) => hay.includes(term));
}

function looksUap(text: string): boolean {
  const hay = text.toLowerCase();
  return UAP_TERMS.some((term) => hay.includes(term));
}

function youtubeFeed(url: string | null): string | null {
  if (!url) return null;
  const channel = url.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (channel) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channel[1]}`;
  const user = url.match(/youtube\.com\/user\/([\w-]+)/i);
  if (user) return `https://www.youtube.com/feeds/videos.xml?user=${user[1]}`;
  return null;
}
