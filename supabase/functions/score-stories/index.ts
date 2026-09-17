import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret, USER_AGENT } from "../_shared/schedulerAuth.ts";
import { assertSafeUrl, fetchFollowingRedirects } from "../_shared/ssrf.ts";
import { excerptLooksUsable, extractOgImage, htmlToExcerpt } from "../_shared/html.ts";
import { hostnameOf } from "../_shared/canonicalize.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";
import { briefWithOpenRouter, PROMPT_VERSION, scoreWithOpenRouter } from "../_shared/openrouter.ts";
import { storeStoryImage } from "../_shared/images.ts";
import { deterministicComponents } from "../_shared/components.ts";
import { RETIRED_TAGS, TAGS, confidenceFrom, mixTag, needsReview, type Tag } from "../_shared/score-mix.ts";

const MODEL = "deepseek/deepseek-v4.1-flash";
const METHODOLOGY = "mix_v2";
const WORKER = "score-stories";

type StoryRow = {
  story_id: string;
  canonical_url: string;
  title: string;
  excerpt: string | null;
  source_id: string;
  cluster_id: string | null;
  status: string;
  summary: string | null;
  image_status: string;
  translation_status?: string;
};

type SourceRow = { source_id: string; name: string; homepage_url: string };
type Supabase = ReturnType<typeof serviceClient>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const mode = await readMode(req);
  const supabase = serviceClient();
  const runId = await openRun(supabase, WORKER);
  let scored = 0;
  let rescored = 0;
  let reviewed = 0;
  let failed = 0;
  let briefed = 0;
  let imagesStored = 0;
  const errors: unknown[] = [];

  try {
    const pendingMax = mode === "rescore" ? 0 : mode === "pending" ? 5 : 2;
    const stories: StoryRow[] = [];
    if (pendingMax > 0) {
      const { data: claimed, error: claimError } = await supabase.rpc("claim_pending_stories", {
        worker_id: WORKER,
        max_n: pendingMax,
      });
      if (claimError) throw claimError;
      stories.push(...((claimed ?? []) as StoryRow[]));
    }

    const rescoreSlots = mode === "pending" ? 0 : Math.max(0, 5 - stories.length);
    if (rescoreSlots > 0) {
      const { data: claimed, error: claimError } = await supabase.rpc("claim_rescore_prompt", {
        worker_id: WORKER,
        max_n: rescoreSlots,
        want_prompt: PROMPT_VERSION,
      });
      if (claimError) throw claimError;
      stories.push(...((claimed ?? []) as StoryRow[]));
    }

    for (const story of stories) {
      const inplace = story.status === "ready" || story.status === "review";
      try {
        const sourceRow = await loadSource(supabase, story.source_id);
        const page = await fetchPage(story, sourceRow, story.image_status !== "stored");
        const excerpt = page.excerpt;
        const { clusterSize, corroboration } = await coverageHints(supabase, story);
        const modelOut = await scoreWithOpenRouter({
          title: story.title,
          excerpt,
          sourceName: sourceRow?.name ?? "unknown",
        });
        if (!modelOut.summary) throw new Error("empty_summary");
        const components = deterministicComponents(story.title, excerpt, {
          corroboration,
          clusterSize,
          signals: modelOut.signals,
        });

        let review = false;
        const reasons: string[] = [];
        const rows = TAGS.map((tag: Tag) => {
          const rawScore = modelOut.scores[tag];
          const rationale = (modelOut.rationale[tag] ?? "").trim();
          // fail-soft: a dimension the model declined (no score AND no rationale) is skipped,
          // not fatal - a single empty dimension must not kill an otherwise scorable story.
          if (rawScore == null && !rationale) return null;
          const mixed = mixTag(tag, rawScore, components);
          if (needsReview(tag, mixed)) {
            review = true;
            reasons.push(tag);
          }
          return {
            story_id: story.story_id,
            tag,
            score: mixed,
            confidence: confidenceFrom(components),
            rationale,
            components: {
              mix: components,
              model: modelOut.scores[tag],
              mixed,
              primary_caution: modelOut.primaryCaution,
              primary_substance: modelOut.primarySubstance,
            },
            methodology_version: METHODOLOGY,
            prompt_version: PROMPT_VERSION,
            model: MODEL,
          };
        }).filter((row): row is NonNullable<typeof row> => row !== null);
        if (rows.length === 0) throw new Error("no_scorable_tags");

        const { error: scoreError } = await supabase.from("story_scores").upsert(rows, {
          onConflict: "story_id,tag",
        });
        if (scoreError) throw scoreError;

        const { error: retireError } = await supabase
          .from("story_scores")
          .delete()
          .eq("story_id", story.story_id)
          .in("tag", [...RETIRED_TAGS]);
        if (retireError) throw retireError;

        let image = { url: null as string | null, status: story.image_status as string };
        if (story.image_status !== "stored") {
          const stored = await storeImage(supabase, story.story_id, page.ogImage);
          image = stored;
          if (stored.status === "stored") imagesStored += 1;
        }

        if (review) {
          await supabase.from("review_queue").upsert(
            reasons.map((reason) => ({
              item_type: "story",
              item_id: story.story_id,
              reason,
              status: "open",
            })),
            { onConflict: "item_type,item_id,reason" },
          );
          reviewed += 1;
        }
        const keepTranslatedBrief =
          !inplace &&
          story.translation_status === "translated" &&
          Boolean(story.summary?.trim());
        await supabase
          .from("stories")
          .update({
            status: review ? "review" : "ready",
            excerpt,
            summary: keepTranslatedBrief ? story.summary : modelOut.summary,
            ...(story.image_status === "stored"
              ? {}
              : { image_url: image.url, image_status: image.status }),
            form: allowedForm(modelOut.form),
            locked_at: null,
            locked_by: null,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("story_id", story.story_id);
        scored += 1;
        if (inplace) rescored += 1;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        errors.push({ story_id: story.story_id, error: message, inplace });
        if (inplace) {
          await supabase
            .from("stories")
            .update({
              locked_at: null,
              locked_by: null,
              updated_at: new Date().toISOString(),
            })
            .eq("story_id", story.story_id);
        } else {
          failed += 1;
          await supabase
            .from("stories")
            .update({
              status: "failed",
              last_error: message.slice(0, 500),
              locked_at: null,
              locked_by: null,
              updated_at: new Date().toISOString(),
            })
            .eq("story_id", story.story_id);
        }
      }
    }

    if (mode !== "rescore") {
      const backfill = await backfillBriefs(supabase, stories.length === 0 ? 6 : 3, errors);
      briefed += backfill.briefed;
      imagesStored += backfill.imagesStored;
    }

    const counts = {
      claimed: stories.length,
      scored,
      rescored,
      reviewed,
      failed,
      briefed,
      images_stored: imagesStored,
      mode,
      prompt_version: PROMPT_VERSION,
    };
    await closeRun(supabase, runId, counts, errors);
    return jsonResponse({ ok: true, ...counts, errors }, 200, corsHeaders);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(
      supabase,
      runId,
      { scored, rescored, reviewed, failed, briefed, images_stored: imagesStored },
      errors,
    );
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});

async function readMode(req: Request): Promise<"mixed" | "rescore" | "pending"> {
  try {
    const body = await req.json() as { mode?: unknown };
    if (body.mode === "rescore" || body.mode === "pending") return body.mode;
  } catch {
    // cron ticks send no body
  }
  return "mixed";
}

async function coverageHints(
  supabase: Supabase,
  story: StoryRow,
): Promise<{ clusterSize: number; corroboration: number }> {
  if (story.cluster_id) {
    const { data } = await supabase
      .from("stories")
      .select("source_id")
      .eq("cluster_id", story.cluster_id);
    const rows = data ?? [];
    const sources = new Set(rows.map((row) => row.source_id));
    return {
      clusterSize: Math.max(1, rows.length),
      corroboration: Math.min(10, 2.5 * sources.size),
    };
  }
  const { data: siblings } = await supabase
    .from("stories")
    .select("source_id")
    .neq("story_id", story.story_id)
    .eq("title", story.title);
  const extra = new Set((siblings ?? []).map((row) => row.source_id));
  extra.add(story.source_id);
  return {
    clusterSize: 1 + (siblings ?? []).length,
    corroboration: Math.min(10, 2.5 * extra.size),
  };
}

async function backfillBriefs(
  supabase: Supabase,
  maxN: number,
  errors: unknown[],
): Promise<{ briefed: number; imagesStored: number }> {
  let briefed = 0;
  let imagesStored = 0;
  const { data, error } = await supabase.rpc("claim_brief_backfill", { worker_id: WORKER, max_n: maxN });
  if (error) {
    errors.push({ backfill: error.message });
    return { briefed, imagesStored };
  }
  for (const story of (data ?? []) as StoryRow[]) {
    const patch: Record<string, unknown> = { locked_at: null, locked_by: null, updated_at: new Date().toISOString() };
    try {
      const sourceRow = await loadSource(supabase, story.source_id);
      const needsImage = story.image_status === "pending";
      const page = await fetchPage(story, sourceRow, needsImage);
      if (!story.summary) {
        const summary = await briefWithOpenRouter({
          title: story.title,
          excerpt: page.excerpt,
          sourceName: sourceRow?.name ?? "unknown",
        });
        if (!summary) throw new Error("empty_summary");
        patch.summary = summary;
        briefed += 1;
      }
      if (needsImage) {
        const image = await storeImage(supabase, story.story_id, page.ogImage);
        patch.image_url = image.url;
        patch.image_status = image.status;
        if (image.status === "stored") imagesStored += 1;
      }
    } catch (cause) {
      errors.push({ story_id: story.story_id, backfill: cause instanceof Error ? cause.message : String(cause) });
    }
    await supabase.from("stories").update(patch).eq("story_id", story.story_id);
  }
  return { briefed, imagesStored };
}

async function loadSource(supabase: Supabase, sourceId: string): Promise<SourceRow | null> {
  const { data } = await supabase
    .from("sources")
    .select("source_id,name,homepage_url")
    .eq("source_id", sourceId)
    .single();
  return (data as SourceRow | null) ?? null;
}

/**
 * One page fetch per story: a usable body for scoring and the page's og:image.
 * Falls back to the stored excerpt when the fetch fails or the page is thin.
 */
async function fetchPage(
  story: StoryRow,
  source: SourceRow | null,
  wantImage = true,
): Promise<{ excerpt: string; ogImage: string | null }> {
  const current = (story.excerpt ?? "").trim().slice(0, 8000);
  const fallback = { excerpt: current, ogImage: null };
  if (excerptLooksUsable(current) && !wantImage) return fallback;
  if (!source) return fallback;
  const siteHost = hostnameOf(source.homepage_url);
  if (!siteHost) return fallback;
  const html = await fetchHtml(story.canonical_url, siteHost);
  if (!html) return fallback;
  const fromPage = htmlToExcerpt(html);
  return {
    excerpt: excerptLooksUsable(current) ? current : excerptLooksUsable(fromPage) ? fromPage : current,
    ogImage: wantImage ? extractOgImage(html, story.canonical_url) : null,
  };
}

/** Some apex hosts fail TLS while `www.` serves the same page; try both. */
async function fetchHtml(url: string, siteHost: string): Promise<string | null> {
  const candidates = [url];
  try {
    const parsed = new URL(url);
    if (!/^www\./i.test(parsed.hostname)) {
      parsed.hostname = `www.${parsed.hostname}`;
      candidates.push(parsed.toString());
    }
  } catch {
    return null;
  }
  for (const candidate of candidates) {
    try {
      const response = await fetchFollowingRedirects(
        candidate,
        (raw) => assertSafeUrl(raw, siteHost),
        { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, timeoutMs: 10000 },
      );
      if (response.ok) return await response.text();
    } catch {
      // try the next candidate
    }
  }
  return null;
}

async function storeImage(
  supabase: Supabase,
  storyId: string,
  ogImage: string | null,
): Promise<{ url: string | null; status: "stored" | "placeholder" }> {
  if (!ogImage) return { url: null, status: "placeholder" };
  const url = await storeStoryImage(supabase, storyId, ogImage);
  return url ? { url, status: "stored" } : { url: null, status: "placeholder" };
}

function allowedForm(value: string): "news" | "analysis" | "opinion" | "press_release" | "podcast" | "video" {
  const allowed = ["news", "analysis", "opinion", "press_release", "podcast", "video"] as const;
  return allowed.includes(value as (typeof allowed)[number]) ? (value as (typeof allowed)[number]) : "news";
}
