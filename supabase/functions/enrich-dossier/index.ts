import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret } from "../_shared/schedulerAuth.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";
import { completeJson } from "../_shared/openrouter.ts";
import { canonicalizeUrl, hostnameOf } from "../_shared/canonicalize.ts";
import { matchesPersonRecord, normalizeName } from "../_shared/normalize.ts";

const WORKER = "enrich-dossier";
const SOURCE_TYPES = new Set([
  "mainstream_press",
  "podcast",
  "youtube",
  "radio",
  "tv",
  "x",
  "linkedin",
  "official",
  "scholarly",
  "archive",
  "other",
]);
const LINK_TYPES = new Set([
  "website",
  "wikipedia",
  "wikidata",
  "imdb",
  "linkedin",
  "youtube_channel",
  "x",
  "other",
]);
const APPEARANCE_ROLES = new Set(["guest", "subject_of_episode"]);
const DATE_PRECISION = new Set(["unknown", "day", "month", "year"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const MAINSTREAM = new Set([
  "newsnationnow.com",
  "nytimes.com",
  "washingtonpost.com",
  "cnn.com",
  "space.com",
  "thedebrief.org",
  "defensescoop.com",
  "twz.com",
  "liberationtimes.com",
  "askapol.com",
  "newspaceeconomy.ca",
  "unknowncountry.com",
  "pbs.org",
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "theguardian.com",
  "foxnews.com",
]);

type QueueRow = {
  queue_id: string;
  person_id: string;
  payload: { candidates?: Candidate[]; name?: string; missing?: string[] };
  attempts: number;
};
type Candidate = {
  url?: string;
  title?: string;
  outlet?: string;
  snippet?: string;
  published?: string;
  discovered_via?: string;
  link_hint?: string;
};
type ShowRow = {
  podcast_id: string;
  podcast_name: string;
  aliases: string[] | null;
  youtube_url: string | null;
  primary_url: string | null;
};
type PersonRow = {
  person_id: string;
  name: string;
  aliases: string[] | null;
  primary_role: string | null;
};
type Supabase = ReturnType<typeof serviceClient>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const supabase = serviceClient();
  const runId = await openRun(supabase, WORKER);
  const started = Date.now();
  let maxN = 2;
  try {
    const body = await req.json();
    if (Number.isFinite(Number(body?.max_n))) maxN = Math.max(1, Math.min(15, Number(body.max_n)));
  } catch {
    maxN = 2;
  }
  const counts = {
    persons: 0,
    sources_written: 0,
    links_written: 0,
    edges_added: 0,
    episodes_added: 0,
    podcasts_minted: 0,
    drops: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    cost_estimate_usd: 0,
  };
  const errors: unknown[] = [];

  try {
    const { data: claimed, error: claimError } = await supabase.rpc("claim_enrichment_batch", {
      worker_id: WORKER,
      max_n: maxN,
    });
    if (claimError) throw claimError;
    const rows = (claimed ?? []) as QueueRow[];
    const { data: shows } = await supabase.from("podcasts").select("podcast_id,podcast_name,aliases,youtube_url,primary_url");
    const podcasts = (shows ?? []) as ShowRow[];
    const showCounts = await unknownShowCounts(supabase);
    const ids = {
      appearance: await nextNumericId(supabase, "appearances", "appearance_id", "APP-"),
      podcast: await nextNumericId(supabase, "podcasts", "podcast_id", "POD-"),
    };

    for (const row of rows) {
      if (Date.now() - started > 105_000) {
        await supabase.rpc("complete_enrichment_item", {
          p_queue_id: row.queue_id,
          p_status: "pending",
          p_error: "released_time_budget",
        });
        continue;
      }
      try {
        const result = await processPerson(supabase, row, podcasts, showCounts, ids);
        counts.persons += 1;
        counts.sources_written += result.sources;
        counts.links_written += result.links;
        counts.edges_added += result.edges;
        counts.episodes_added += result.episodes;
        counts.podcasts_minted += result.minted;
        counts.drops += result.drops;
        counts.prompt_tokens += result.usage.prompt_tokens;
        counts.completion_tokens += result.usage.completion_tokens;
        counts.cost_estimate_usd += result.usage.cost ?? 0;
        await supabase.rpc("complete_enrichment_item", {
          p_queue_id: row.queue_id,
          p_status: "done",
          p_error: null,
        });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        errors.push({ person_id: row.person_id, error: message });
        await supabase.rpc("complete_enrichment_item", {
          p_queue_id: row.queue_id,
          p_status: row.attempts >= 3 ? "failed" : "pending",
          p_error: message.slice(0, 500),
        });
      }
    }

    await closeRun(supabase, runId, counts, errors);
    return jsonResponse({ ok: true, ...counts, errors }, 200, corsHeaders);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, counts, errors);
    return jsonResponse({ ok: false, error: message, ...counts }, 500, corsHeaders);
  }
});

async function processPerson(
  supabase: Supabase,
  row: QueueRow,
  shows: ShowRow[],
  showCounts: Map<string, number>,
  ids: { appearance: Counter; podcast: Counter },
) {
  const { data: person, error } = await supabase
    .from("people")
    .select("person_id,name,aliases,primary_role")
    .eq("person_id", row.person_id)
    .single();
  if (error || !person) throw new Error(error?.message ?? "person not found");
  const record = person as PersonRow;
  const aliases = record.aliases ?? [];
  const rawCandidates = (row.payload?.candidates ?? []).slice(0, 80).map((candidate) => ({
    ...candidate,
    url: normalizeRecordUrl(candidate.url ?? ""),
  })).filter((candidate) => candidate.url);
  const allow = new Set(rawCandidates.map((candidate) => candidate.url as string));
  const snippets = new Map(rawCandidates.map((candidate) => [candidate.url as string, String(candidate.snippet ?? "").slice(0, 400)]));
  const annotated = rawCandidates.map((candidate) => ({
    ...candidate,
    matched_podcast_id: matchShow(candidate, shows)?.podcast_id ?? null,
  }));

  const { json, usage } = await completeJson(
    "You extract sourced dossier records for UAP Brief. Score nothing and label no one. Return JSON only. Use only URLs from the candidate list. Never invent URLs, dates, outlets, or appearances. If a date is not in the candidate, published_date must be null and date_precision unknown. Drop wrong-person hits and pure noise. Mainstream news domains are source_type mainstream_press with the outlet named.",
    {
      instruction:
        "For this person, emit sources, links, and appearance_edges that demonstrably involve them. Classification vocabularies: source_type=mainstream_press|podcast|youtube|radio|tv|x|linkedin|official|scholarly|archive|other; role=guest|host|co_host|interviewee|subject|author|featured|mention; link_type=website|wikipedia|wikidata|imdb|linkedin|youtube_channel|x|other; appearance role=guest|subject_of_episode; date_precision=unknown|day|month|year; confidence=high|medium|low. If matched_podcast_id is set, emit an appearance_edge with that podcast_id. Unknown shows stay in sources unless the show name is clearly repeated.",
      person: {
        person_id: record.person_id,
        name: record.name,
        aliases,
        primary_role: record.primary_role,
      },
      candidates: annotated.map((candidate) => ({
        url: candidate.url,
        title: candidate.title ?? "",
        outlet: candidate.outlet ?? "",
        snippet: String(candidate.snippet ?? "").slice(0, 400),
        published: candidate.published ?? "",
        discovered_via: candidate.discovered_via ?? "",
        matched_podcast_id: candidate.matched_podcast_id,
        link_hint: candidate.link_hint ?? "",
      })),
    },
  );

  const parsed = validateModel(json, allow, record.name, aliases);
  const deterministic = deterministicEdges(annotated, shows, record);
  const appearanceMap = new Map<string, ModelAppearance>();
  for (const edge of [...parsed.appearances, ...deterministic]) {
    if (!appearanceMap.has(edge.url)) appearanceMap.set(edge.url, edge);
  }

  let sources = 0;
  let links = 0;
  let edges = 0;
  let episodes = 0;
  let minted = 0;
  const drops = parsed.drops + (rawCandidates.length - annotated.length);

  for (const source of parsed.sources) {
    const domain = hostnameOf(source.url) ?? "";
    const sourceType = inferSourceType(source.url, source.source_type, domain);
    const { error: insertError } = await supabase.from("person_sources").upsert(
      {
        person_id: record.person_id,
        url: source.url,
        title: source.title.slice(0, 500),
        outlet: source.outlet.slice(0, 200),
        domain,
        source_type: sourceType,
        role: source.role,
        published_date: source.published_date,
        date_precision: source.date_precision,
        confidence: source.confidence,
        notes: source.notes.slice(0, 500),
        excerpt: snippets.get(source.url) ?? "",
        discovered_via: source.discovered_via || "web_trace",
      },
      { onConflict: "person_id,url", ignoreDuplicates: true },
    );
    if (!insertError) sources += 1;
  }

  for (const link of parsed.links) {
    const { error: insertError } = await supabase.from("person_links").upsert(
      {
        person_id: record.person_id,
        link_type: link.link_type,
        url: link.url,
        label: link.label.slice(0, 200),
      },
      { onConflict: "person_id,link_type,url", ignoreDuplicates: true },
    );
    if (!insertError) links += 1;
  }

  const { data: existingApps } = await supabase
    .from("appearances")
    .select("source_url")
    .eq("person_id", record.person_id);
  const haveApp = new Set((existingApps ?? []).map((item) => item.source_url).filter(Boolean));

  for (const edge of appearanceMap.values()) {
    const show = await resolveOrMintShow(edge, shows, showCounts, ids, supabase);
    if (!show) {
      const { error: insertError } = await supabase.from("person_sources").upsert(
        {
          person_id: record.person_id,
          url: edge.url,
          title: edge.episode_title || edge.url,
          outlet: edge.podcast_name || "",
          domain: hostnameOf(edge.url) ?? "",
          source_type: inferSourceType(edge.url, "podcast", hostnameOf(edge.url) ?? ""),
          role: edge.role,
          published_date: edge.published_date,
          date_precision: edge.date_precision,
          confidence: edge.confidence,
          notes: "unknown show (single record; not minted)",
          discovered_via: "youtube_trace",
        },
        { onConflict: "person_id,url", ignoreDuplicates: true },
      );
      if (!insertError) sources += 1;
      continue;
    }
    if (show.minted) {
      minted += 1;
      shows.push({
        podcast_id: show.podcast_id,
        podcast_name: show.podcast_name,
        aliases: [],
        youtube_url: edge.url.includes("youtube.com") ? edge.url : null,
        primary_url: null,
      });
    }
    if (haveApp.has(edge.url)) continue;
    const episodeOk = await insertEpisode(supabase, show.podcast_id, edge, record.person_id);
    if (episodeOk) episodes += 1;
    const appearanceId = ids.appearance.next();
    const { error: appError } = await supabase.from("appearances").insert({
      appearance_id: appearanceId,
      person_id: record.person_id,
      person_name: record.name,
      podcast_id: show.podcast_id,
      podcast_name: show.podcast_name,
      role: edge.role,
      episode_title: edge.episode_title,
      episode_date: edge.episode_date,
      date_precision: edge.date_precision,
      topic_tags: [],
      source_url: edge.url,
      confidence: edge.confidence,
      provenance: "enrichment",
    });
    if (!appError) {
      edges += 1;
      haveApp.add(edge.url);
    }
  }

  return { sources, links, edges, episodes, minted, drops, usage };
}

type ModelSource = {
  url: string;
  title: string;
  outlet: string;
  source_type: string;
  role: string;
  published_date: string | null;
  date_precision: string;
  confidence: string;
  notes: string;
  discovered_via: string;
};
type ModelLink = { link_type: string; url: string; label: string };
type ModelAppearance = {
  podcast_id: string | null;
  podcast_name: string;
  episode_title: string;
  episode_date: string | null;
  published_date: string | null;
  url: string;
  role: string;
  confidence: string;
  date_precision: string;
};

function validateModel(
  json: Record<string, unknown>,
  allow: Set<string>,
  name: string,
  aliases: string[],
) {
  const sources: ModelSource[] = [];
  const links: ModelLink[] = [];
  const appearances: ModelAppearance[] = [];
  let drops = 0;
  for (const row of asArray(json.sources)) {
    const url = takeAllowedUrl(row.url, allow);
    if (!url || !matchesPersonRecord(`${row.title ?? ""} ${row.outlet ?? ""} ${url}`, name, aliases)) {
      drops += 1;
      continue;
    }
    sources.push({
      url,
      title: String(row.title ?? ""),
      outlet: String(row.outlet ?? ""),
      source_type: SOURCE_TYPES.has(String(row.source_type)) ? String(row.source_type) : "other",
      role: String(row.role ?? ""),
      published_date: cleanDate(row.published_date),
      date_precision: DATE_PRECISION.has(String(row.date_precision)) ? String(row.date_precision) : "unknown",
      confidence: CONFIDENCE.has(String(row.confidence)) ? String(row.confidence) : "medium",
      notes: String(row.notes ?? ""),
      discovered_via: String(row.discovered_via ?? ""),
    });
  }
  for (const row of asArray(json.links)) {
    const url = takeAllowedUrl(row.url, allow);
    const linkType = String(row.link_type ?? "other");
    if (!url || !LINK_TYPES.has(linkType)) {
      drops += 1;
      continue;
    }
    links.push({ link_type: linkType, url, label: String(row.label ?? "") });
  }
  for (const row of asArray(json.appearance_edges)) {
    const url = takeAllowedUrl(row.url, allow);
    const role = String(row.role ?? "guest");
    if (!url || !APPEARANCE_ROLES.has(role)) {
      drops += 1;
      continue;
    }
    const podcastId = String(row.podcast_id ?? "").match(/^POD-\d+$/) ? String(row.podcast_id) : null;
    appearances.push({
      podcast_id: podcastId,
      podcast_name: String(row.podcast_name ?? row.outlet ?? ""),
      episode_title: String(row.episode_title ?? row.title ?? ""),
      episode_date: typeof row.episode_date === "string" && row.episode_date.trim() ? row.episode_date.trim() : null,
      published_date: cleanDate(row.published_date ?? row.episode_date),
      url,
      role,
      confidence: CONFIDENCE.has(String(row.confidence)) ? String(row.confidence) : "medium",
      date_precision: DATE_PRECISION.has(String(row.date_precision)) ? String(row.date_precision) : "unknown",
    });
  }
  return { sources, links, appearances, drops };
}

function deterministicEdges(candidates: Array<Candidate & { matched_podcast_id: string | null }>, shows: ShowRow[], person: PersonRow): ModelAppearance[] {
  const edges: ModelAppearance[] = [];
  for (const candidate of candidates) {
    if (!candidate.matched_podcast_id || !candidate.url) continue;
    const text = `${candidate.title ?? ""} ${candidate.outlet ?? ""}`;
    if (!matchesPersonRecord(text, person.name, person.aliases ?? [])) continue;
    const show = shows.find((row) => row.podcast_id === candidate.matched_podcast_id);
    edges.push({
      podcast_id: candidate.matched_podcast_id,
      podcast_name: show?.podcast_name ?? candidate.outlet ?? "",
      episode_title: candidate.title ?? "",
      episode_date: null,
      published_date: cleanDate(candidate.published),
      url: candidate.url,
      role: "guest",
      confidence: "high",
      date_precision: cleanDate(candidate.published) ? "day" : "unknown",
    });
  }
  return edges;
}

async function resolveOrMintShow(
  edge: ModelAppearance,
  shows: ShowRow[],
  showCounts: Map<string, number>,
  ids: { podcast: Counter },
  supabase: Supabase,
): Promise<{ podcast_id: string; podcast_name: string; minted: boolean } | null> {
  if (edge.podcast_id) {
    const known = shows.find((row) => row.podcast_id === edge.podcast_id);
    if (known) return { podcast_id: known.podcast_id, podcast_name: known.podcast_name, minted: false };
  }
  const byName = matchShow({ title: edge.episode_title, outlet: edge.podcast_name, url: edge.url }, shows);
  if (byName) return { podcast_id: byName.podcast_id, podcast_name: byName.podcast_name, minted: false };
  const key = normalizeName(edge.podcast_name || "");
  if (!key || (showCounts.get(key) ?? 0) < 2) return null;
  const podcastId = ids.podcast.next();
  const name = edge.podcast_name || "Unknown show";
  const { error } = await supabase.from("podcasts").insert({
    podcast_id: podcastId,
    podcast_name: name,
    notes: "minted by enrich-dossier from repeated appearance records",
    confidence: "medium",
    youtube_url: edge.url.includes("youtube.com") ? edge.url : null,
    feed_discovery_status: "unknown",
  });
  if (error) return null;
  showCounts.set(key, showCounts.get(key) ?? 2);
  return { podcast_id: podcastId, podcast_name: name, minted: true };
}

async function insertEpisode(supabase: Supabase, podcastId: string, edge: ModelAppearance, personId: string) {
  const { error } = await supabase.from("episodes").insert({
    podcast_id: podcastId,
    title: (edge.episode_title || "Untitled").slice(0, 500),
    pub_date: edge.published_date ? `${edge.published_date}T00:00:00Z` : null,
    url: edge.url,
    guests: [{ person_id: personId, match_method: "enrichment" }],
    relevance: { uap: true },
  });
  return !error;
}

function matchShow(candidate: { title?: string; outlet?: string; url?: string }, shows: ShowRow[]): ShowRow | null {
  const hay = `${candidate.title ?? ""} ${candidate.outlet ?? ""} ${candidate.url ?? ""}`;
  for (const show of shows) {
    const names = [show.podcast_name, ...(show.aliases ?? [])].filter(Boolean);
    if (names.some((name) => normalizeName(name).length >= 5 && normalizeName(hay).includes(normalizeName(name)))) {
      return show;
    }
    const handle = youtubeHandle(show.youtube_url);
    if (handle && hay.toLowerCase().includes(handle.toLowerCase())) return show;
  }
  return null;
}

function youtubeHandle(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/youtube\.com\/@([^/?]+)/i);
  return match?.[1] ?? null;
}

async function unknownShowCounts(supabase: Supabase) {
  const { data } = await supabase.from("enrichment_queue").select("payload");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const candidate of (row.payload?.candidates ?? []) as Candidate[]) {
      const key = normalizeName(candidate.outlet ?? "");
      if (key.length < 4) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

type Counter = { next: () => string };

async function nextNumericId(supabase: Supabase, table: string, column: string, prefix: string): Promise<Counter> {
  const { data, error } = await supabase.from(table).select(column);
  if (error) throw error;
  let max = 0;
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  for (const row of data ?? []) {
    const match = String((row as Record<string, unknown>)[column] ?? "").match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return {
    next() {
      max += 1;
      return `${prefix}${String(max).padStart(3, "0")}`;
    },
  };
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row) => row && typeof row === "object") as Array<Record<string, unknown>> : [];
}

function takeAllowedUrl(value: unknown, allow: Set<string>): string | null {
  const url = normalizeRecordUrl(String(value ?? ""));
  if (!url || !allow.has(url)) return null;
  return url;
}

function normalizeRecordUrl(raw: string): string | null {
  const canon = canonicalizeUrl(raw);
  if (!canon) return null;
  try {
    const url = new URL(canon);
    const host = url.hostname.replace(/^www\./i, "");
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/watch?v=${id}` : canon;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    return canon;
  } catch {
    return canon;
  }
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function inferSourceType(url: string, hinted: string, domain: string): string {
  if (SOURCE_TYPES.has(hinted) && hinted !== "other") return hinted;
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (domain.includes("linkedin.com")) return "linkedin";
  if (domain === "x.com" || domain === "twitter.com") return "x";
  if (domain.includes("wikipedia.org") || domain.includes("wikidata.org")) return "archive";
  if (MAINSTREAM.has(domain)) return "mainstream_press";
  return SOURCE_TYPES.has(hinted) ? hinted : "other";
}
