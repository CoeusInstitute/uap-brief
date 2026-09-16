import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret, USER_AGENT } from "../_shared/schedulerAuth.ts";
import { canonicalizeUrl, hostnameOf, sha256Hex } from "../_shared/canonicalize.ts";
import { assertSafeUrl, fetchFollowingRedirects, hostAllowedForFeed, hostAllowedForSource } from "../_shared/ssrf.ts";
import { discoverFeedHref } from "../_shared/html.ts";
import { parseFeed } from "../_shared/rss.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";
import { normalizeName } from "../_shared/normalize.ts";

type SourceRow = {
  source_id: string;
  name: string;
  homepage_url: string;
  rss_url: string | null;
};

const FEED_PATHS = ["/feed", "/feed/", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml"];
const PER_SOURCE = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const supabase = serviceClient();
  const runId = await openRun(supabase, "ingest-news");
  let inserted = 0;
  let feedsOk = 0;
  let feedsFailed = 0;
  let skippedEvergreen = 0;
  const errors: unknown[] = [];

  try {
    const { data: sources, error } = await supabase
      .from("sources")
      .select("source_id,name,homepage_url,rss_url")
      .eq("kind", "news")
      .eq("active", true);
    if (error) throw error;

    for (const source of (sources ?? []) as SourceRow[]) {
      try {
        const siteHost = hostnameOf(source.homepage_url);
        if (!siteHost) throw new Error(`Bad homepage for ${source.name}`);
        const feedUrl = source.rss_url ?? (await discoverFeed(source.homepage_url, siteHost));
        if (!feedUrl) {
          feedsFailed += 1;
          errors.push({ source: source.name, error: "No feed discovered" });
          continue;
        }
        if (!source.rss_url) {
          await supabase.from("sources").update({ rss_url: feedUrl }).eq("source_id", source.source_id);
        }

        const response = await fetchFollowingRedirects(
          feedUrl,
          (raw) => assertFeedUrl(raw, siteHost),
          {
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html",
            },
            timeoutMs: 15000,
          },
        );
        if (!response.ok) {
          feedsFailed += 1;
          errors.push({ source: source.name, error: `Feed HTTP ${response.status}` });
          continue;
        }
        const items = parseFeed(await response.text()).slice(0, PER_SOURCE);
        if (items.length === 0) {
          feedsFailed += 1;
          errors.push({ source: source.name, error: "Empty feed" });
          continue;
        }
        feedsOk += 1;

        for (const item of items) {
          const canonical = canonicalizeUrl(item.link);
          if (!canonical) continue;
          const host = hostnameOf(canonical);
          if (!host || !hostAllowedForSource(host, siteHost)) continue;
          const title = item.title.slice(0, 500);
          if (isEvergreen(title, canonical)) {
            skippedEvergreen += 1;
            continue;
          }
          let publishedAt: string | null = null;
          if (item.publishedAt) {
            const parsed = new Date(item.publishedAt);
            if (!Number.isNaN(parsed.getTime())) publishedAt = parsed.toISOString();
          }
          const dedupe_hash = await sha256Hex(`${normalizeName(item.title)}|${host}`);
          const { data: created, error: insertError } = await supabase
            .from("stories")
            .insert({
              canonical_url: canonical,
              source_id: source.source_id,
              title,
              published_at: publishedAt,
              excerpt: (item.excerpt || item.title).slice(0, 8000),
              status: "pending",
              dedupe_hash,
            })
            .select("story_id")
            .maybeSingle();
          if (!insertError && created?.story_id) {
            inserted += 1;
            await assignCluster(supabase, String(created.story_id), title, publishedAt);
          }
        }

        await supabase
          .from("sources")
          .update({ last_fetch_at: new Date().toISOString() })
          .eq("source_id", source.source_id);
      } catch (cause) {
        feedsFailed += 1;
        errors.push({
          source: source.name,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }

    await closeRun(supabase, runId, {
      inserted,
      feeds_ok: feedsOk,
      feeds_failed: feedsFailed,
      skipped_evergreen: skippedEvergreen,
    }, errors);
    return jsonResponse({
      ok: true,
      inserted,
      feeds_ok: feedsOk,
      feeds_failed: feedsFailed,
      skipped_evergreen: skippedEvergreen,
      errors,
    }, 200, corsHeaders);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, {
      inserted,
      feeds_ok: feedsOk,
      feeds_failed: feedsFailed,
      skipped_evergreen: skippedEvergreen,
    }, errors);
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});

async function discoverFeed(homepage: string, siteHost: string): Promise<string | null> {
  try {
    const home = await fetchFollowingRedirects(
      homepage,
      (raw) => assertSafeUrl(raw, siteHost),
      { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, timeoutMs: 12000 },
    );
    if (home.ok) {
      const fromHtml = discoverFeedHref(await home.text(), homepage);
      const discoveredHost = fromHtml ? hostnameOf(fromHtml) : null;
      if (fromHtml && discoveredHost && hostAllowedForFeed(discoveredHost, siteHost)) {
        if (await feedLooksValid(fromHtml, siteHost)) return fromHtml;
      }
    }
  } catch {
    // try path candidates
  }

  for (const path of FEED_PATHS) {
    const candidate = new URL(path, homepage).toString();
    if (await feedLooksValid(candidate, siteHost)) return candidate;
  }
  return null;
}

async function feedLooksValid(url: string, siteHost: string): Promise<boolean> {
  try {
    const response = await fetchFollowingRedirects(
      url,
      (raw) => assertFeedUrl(raw, siteHost),
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
        timeoutMs: 10000,
      },
    );
    if (!response.ok) return false;
    return parseFeed(await response.text()).length > 0;
  } catch {
    return false;
  }
}

function isEvergreen(title: string, url: string): boolean {
  if (/^(About Our|About our|About FOIA)/.test(title)) return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\/(about|contact|privacy|terms)(\/|$)/.test(path);
  } catch {
    return false;
  }
}

function assertFeedUrl(raw: string, siteHost: string): URL {
  const url = assertSafeUrl(raw);
  if (!hostAllowedForFeed(url.hostname, siteHost)) {
    throw new Error(`Host ${url.hostname} is not allowed for source ${siteHost}`);
  }
  return url;
}

async function assignCluster(
  supabase: ReturnType<typeof serviceClient>,
  storyId: string,
  title: string,
  publishedAt: string | null,
): Promise<void> {
  const key = await sha256Hex(normalizeName(title));
  let query = supabase.from("stories").select("story_id, title, cluster_id, published_at").neq("story_id", storyId);
  if (publishedAt) {
    const center = new Date(publishedAt).getTime();
    query = query
      .gte("published_at", new Date(center - 48 * 60 * 60 * 1000).toISOString())
      .lte("published_at", new Date(center + 48 * 60 * 60 * 1000).toISOString());
  }
  const { data } = await query.limit(40);
  let clusterId: string | null = null;
  for (const row of data ?? []) {
    const other = await sha256Hex(normalizeName(String(row.title ?? "")));
    if (other === key && row.cluster_id) {
      clusterId = String(row.cluster_id);
      break;
    }
  }
  await supabase.from("stories").update({ cluster_id: clusterId ?? crypto.randomUUID() }).eq("story_id", storyId);
}
