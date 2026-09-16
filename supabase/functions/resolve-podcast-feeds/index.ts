import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret, USER_AGENT } from "../_shared/schedulerAuth.ts";
import { assertSafeUrl, fetchFollowingRedirects } from "../_shared/ssrf.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";

const ITUNES_LOOKUP = "https://itunes.apple.com/lookup?id={id}&entity=podcast";
const SHOW_CAP = 20;

type ShowRow = {
  podcast_id: string;
  podcast_name: string;
  feed_url: string | null;
  apple_lookup: string | null;
  youtube_url: string | null;
  subscribers: number | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const supabase = serviceClient();
  const runId = await openRun(supabase, "resolve-podcast-feeds");
  let itunes = 0;
  let youtube = 0;
  let skipped = 0;
  const errors: unknown[] = [];

  try {
    const { data, error } = await supabase
      .from("podcasts")
      .select("podcast_id,podcast_name,feed_url,apple_lookup,youtube_url,subscribers")
      .is("feed_url", null)
      .limit(80);
    if (error) throw error;

    let attempted = 0;
    for (const show of (data ?? []) as ShowRow[]) {
      if (attempted >= SHOW_CAP) break;
      const itunesId = show.apple_lookup?.startsWith("itunes:") ? show.apple_lookup.slice(7) : null;
      const ytTarget = youtubeUnresolved(show.youtube_url);
      if (!itunesId && !ytTarget) {
        skipped += 1;
        continue;
      }
      attempted += 1;
      const patch: Record<string, unknown> = {};
      if (itunesId) {
        try {
          const feedUrl = await lookupItunes(itunesId);
          if (feedUrl) {
            patch.feed_url = feedUrl;
            patch.feed_discovery_status = "itunes_id";
            itunes += 1;
          }
        } catch (cause) {
          errors.push({ podcast_id: show.podcast_id, error: cause instanceof Error ? cause.message : String(cause) });
        }
      }
      if (ytTarget) {
        try {
          const resolved = await lookupYoutube(ytTarget);
          if (resolved?.channelId) {
            patch.youtube_url = `https://www.youtube.com/channel/${resolved.channelId}`;
            if (!patch.feed_url) {
              patch.feed_url = `https://www.youtube.com/feeds/videos.xml?channel_id=${resolved.channelId}`;
              patch.feed_discovery_status = "youtube_api";
            }
            if (show.subscribers == null && resolved.subscribers != null) {
              patch.subscribers = resolved.subscribers;
            }
            youtube += 1;
          }
        } catch (cause) {
          errors.push({ podcast_id: show.podcast_id, error: cause instanceof Error ? cause.message : String(cause) });
        }
      }
      if (Object.keys(patch).length) {
        await supabase.from("podcasts").update(patch).eq("podcast_id", show.podcast_id);
      }
    }

    await closeRun(supabase, runId, { itunes, youtube, skipped, attempted }, errors);
    return jsonResponse({ ok: true, itunes, youtube, skipped, attempted, errors }, 200, corsHeaders);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, { itunes, youtube, skipped }, errors);
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});

function youtubeUnresolved(url: string | null): { handle?: string; custom?: string } | null {
  if (!url) return null;
  if (/youtube\.com\/channel\/UC[\w-]+/i.test(url)) return null;
  const handle = url.match(/youtube\.com\/@([\w.-]+)/i);
  if (handle) return { handle: handle[1] };
  const custom = url.match(/youtube\.com\/c\/([\w.-]+)/i);
  if (custom) return { custom: custom[1] };
  return null;
}

async function lookupItunes(id: string): Promise<string | null> {
  if (!/^\d+$/.test(id)) return null;
  const url = ITUNES_LOOKUP.replace("{id}", id);
  const response = await fetchFollowingRedirects(url, (raw) => assertSafeUrl(raw), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    timeoutMs: 10000,
  });
  if (!response.ok) throw new Error(`iTunes HTTP ${response.status}`);
  const json = (await response.json()) as { results?: Array<{ feedUrl?: string }> };
  const feed = json.results?.[0]?.feedUrl;
  return typeof feed === "string" && feed.startsWith("http") ? feed : null;
}

async function lookupYoutube(target: { handle?: string; custom?: string }): Promise<{ channelId: string; subscribers: number | null } | null> {
  const key = Deno.env.get("YOUTUBE_API_KEY") ?? "";
  if (!key) return null;
  const params = new URLSearchParams({ part: "id,statistics", key });
  if (target.handle) params.set("forHandle", target.handle);
  else if (target.custom) params.set("forHandle", target.custom);
  else return null;
  const url = `https://www.googleapis.com/youtube/v3/channels?${params}`;
  const response = await fetchFollowingRedirects(url, (raw) => assertSafeUrl(raw), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    timeoutMs: 10000,
  });
  if (!response.ok) throw new Error(`YouTube HTTP ${response.status}`);
  const json = (await response.json()) as {
    items?: Array<{ id?: string; statistics?: { subscriberCount?: string } }>;
  };
  const item = json.items?.[0];
  if (!item?.id || !/^UC[\w-]+$/.test(item.id)) return null;
  const raw = item.statistics?.subscriberCount;
  const subscribers = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  return { channelId: item.id, subscribers };
}
