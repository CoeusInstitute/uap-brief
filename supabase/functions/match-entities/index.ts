import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret } from "../_shared/schedulerAuth.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";
import { matchOrgs, matchPeople, matchShows, type OrgAlias, type PersonAlias, type ShowRow } from "../_shared/entities.ts";

const OUTLET_FRAGMENTS = ["news center", "sightings daily", "sighting news"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const supabase = serviceClient();
  const runId = await openRun(supabase, "match-entities");
  let stories = 0;
  let episodes = 0;
  const errors: unknown[] = [];

  try {
    const [{ data: people }, { data: orgs }, { data: shows }] = await Promise.all([
      supabase.from("person_aliases").select("normalized_alias,person_id"),
      supabase.from("org_aliases").select("normalized_alias,org_id"),
      supabase.from("podcasts").select("podcast_id,podcast_name,aliases"),
    ]);
    const personAliases = (people ?? []) as PersonAlias[];
    const orgAliases = (orgs ?? []) as OrgAlias[];
    const showRows = ((shows ?? []) as ShowRow[]).filter((show) => !isOutletFragment(show.podcast_name));

    const { data: storyRows, error: storyError } = await supabase
      .from("stories")
      .select("story_id,title,excerpt")
      .is("matched_at", null)
      .in("status", ["pending", "processing", "review", "ready"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (storyError) throw storyError;

    for (const story of storyRows ?? []) {
      const text = `${story.title}\n${story.excerpt ?? ""}`;
      const hits = [
        ...matchPeople(text, personAliases),
        ...matchOrgs(text, orgAliases),
        ...matchShows(text, showRows),
      ];
      if (hits.length) {
        const { error } = await supabase.from("story_entities").upsert(
          hits.map((hit) => ({ story_id: story.story_id, ...hit })),
          { onConflict: "story_id,entity_type,entity_id" },
        );
        if (error) errors.push({ story_id: story.story_id, error: error.message });
      }
      await supabase
        .from("stories")
        .update({ matched_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("story_id", story.story_id);
      stories += 1;
    }

    const { data: episodeRows, error: episodeError } = await supabase
      .from("episodes")
      .select("episode_id,title,guests")
      .order("created_at", { ascending: false })
      .limit(20);
    if (episodeError) throw episodeError;

    for (const episode of (episodeRows ?? []).filter((row) => !Array.isArray(row.guests) || row.guests.length === 0)) {
      const existing = Array.isArray(episode.guests) ? episode.guests : [];
      const text = String(episode.title ?? "");
      const peopleHits = matchPeople(text, personAliases);
      const guests = [
        ...existing,
        ...peopleHits.map((hit) => ({ person_id: hit.entity_id, match_method: hit.match_method })),
      ];
      const unique = new Map<string, { person_id: string; match_method: string }>();
      for (const guest of guests) {
        const id = String((guest as { person_id?: string }).person_id ?? "");
        if (id) unique.set(id, { person_id: id, match_method: String((guest as { match_method?: string }).match_method ?? "alias_exact") });
      }
      await supabase.from("episodes").update({ guests: [...unique.values()] }).eq("episode_id", episode.episode_id);
      episodes += 1;
    }

    await closeRun(supabase, runId, { stories, episodes, candidates: 0 }, errors);
    return jsonResponse({ ok: true, stories, episodes, candidates: 0, errors }, 200, corsHeaders);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, { stories, episodes, candidates: 0 }, errors);
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});

function isOutletFragment(name: string): boolean {
  const hay = name.toLowerCase();
  return OUTLET_FRAGMENTS.some((fragment) => hay.includes(fragment));
}
