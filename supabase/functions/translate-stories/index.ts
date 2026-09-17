import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret, USER_AGENT } from "../_shared/schedulerAuth.ts";
import { assertSafeUrl, fetchFollowingRedirects } from "../_shared/ssrf.ts";
import { excerptLooksUsable, htmlToExcerpt } from "../_shared/html.ts";
import { hostnameOf } from "../_shared/canonicalize.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";
import { translateWithOpenRouter } from "../_shared/openrouter.ts";

const WORKER = "translate-stories";
const TIME_BUDGET_MS = 105_000;

type StoryRow = {
  story_id: string;
  canonical_url: string;
  title: string;
  excerpt: string | null;
  source_id: string;
  status: string;
  title_original: string | null;
  translate_attempts: number;
};

type SourceRow = { source_id: string; name: string; homepage_url: string };
type Supabase = ReturnType<typeof serviceClient>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const supabase = serviceClient();
  const runId = await openRun(supabase, WORKER);
  let original = 0;
  let translated = 0;
  let failed = 0;
  let released = 0;
  const errors: unknown[] = [];
  const started = Date.now();

  try {
    const { data: claimed, error: claimError } = await supabase.rpc("claim_translate_stories", {
      worker_id: WORKER,
      max_n: 5,
    });
    if (claimError) throw claimError;
    const stories = (claimed ?? []) as StoryRow[];

    for (let i = 0; i < stories.length; i += 1) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        const leftover = stories.slice(i);
        for (const story of leftover) {
          await unlock(supabase, story.story_id);
          released += 1;
        }
        break;
      }

      const story = stories[i];
      try {
        const sourceRow = await loadSource(supabase, story.source_id);
        const page = await readExcerpt(story, sourceRow);
        const result = await translateWithOpenRouter({
          title: story.title,
          excerpt: page.excerpt,
          sourceName: sourceRow?.name ?? "unknown",
        });
        const language = /^[a-z]{2}$/.test(result.language) ? result.language : "und";
        const patch: Record<string, unknown> = {
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString(),
        };
        if (page.persistExcerpt) patch.excerpt = page.excerpt;

        if (language === "en" || language === "und") {
          patch.translation_status = "original";
          patch.language = "en";
          await supabase.from("stories").update(patch).eq("story_id", story.story_id);
          original += 1;
          continue;
        }

        if (!result.titleEn || !result.summary) throw new Error("translate_incomplete");
        if (!story.title_original) patch.title_original = story.title;
        patch.title = result.titleEn;
        patch.summary = result.summary;
        patch.language = language;
        patch.translation_status = "translated";
        await supabase.from("stories").update(patch).eq("story_id", story.story_id);
        translated += 1;
      } catch (cause) {
        failed += 1;
        const message = cause instanceof Error ? cause.message : String(cause);
        errors.push({ story_id: story.story_id, error: message, reason: message });
        const nextAttempts = (story.translate_attempts ?? 0) + 1;
        const patch: Record<string, unknown> = {
          translate_attempts: nextAttempts,
          last_error: "translate_failed",
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString(),
        };
        if (story.status === "pending" && nextAttempts >= 3) patch.translation_status = "failed";
        await supabase.from("stories").update(patch).eq("story_id", story.story_id);
      }
    }

    const counts = {
      claimed: stories.length,
      original,
      translated,
      failed,
      released_time_budget: released,
    };
    await closeRun(supabase, runId, counts, errors);
    return jsonResponse({ ok: true, ...counts, errors }, 200, corsHeaders);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, {
      original,
      translated,
      failed,
      released_time_budget: released,
    }, errors);
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});

async function loadSource(supabase: Supabase, sourceId: string): Promise<SourceRow | null> {
  const { data } = await supabase
    .from("sources")
    .select("source_id,name,homepage_url")
    .eq("source_id", sourceId)
    .single();
  return (data as SourceRow | null) ?? null;
}

async function readExcerpt(
  story: StoryRow,
  source: SourceRow | null,
): Promise<{ excerpt: string; persistExcerpt: boolean }> {
  const current = (story.excerpt ?? "").trim().slice(0, 8000);
  if (excerptLooksUsable(current)) return { excerpt: current, persistExcerpt: false };
  if (!source) return { excerpt: current, persistExcerpt: false };
  const siteHost = hostnameOf(source.homepage_url);
  if (!siteHost) return { excerpt: current, persistExcerpt: false };
  const html = await fetchHtml(story.canonical_url, siteHost);
  if (!html) return { excerpt: current, persistExcerpt: false };
  const fromPage = htmlToExcerpt(html);
  if (excerptLooksUsable(fromPage)) return { excerpt: fromPage, persistExcerpt: true };
  return { excerpt: current || fromPage, persistExcerpt: false };
}

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

async function unlock(supabase: Supabase, storyId: string): Promise<void> {
  await supabase
    .from("stories")
    .update({
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("story_id", storyId);
}
