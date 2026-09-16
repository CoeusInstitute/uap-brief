import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import type { EntityStat, MethodologyRow, SourceStat, Story, StoryEntity, StoryScore, TagStat, TagTrend } from "@/lib/types";
import { isScoreTag, type ScoreTag } from "@/lib/types";

type Row = Record<string, unknown>;

const STORY_COLUMNS =
  "story_id, canonical_url, title, published_at, excerpt, summary, image_url, image_status, form, source_name, homepage_url, cluster_id, scores, entities";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asScoreTag(value: unknown): ScoreTag | null {
  return typeof value === "string" && isScoreTag(value) ? value : null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mapScores(value: unknown): StoryScore[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Row;
    const tag = asScoreTag(row.tag);
    if (!tag) return [];
    return [
      {
        tag,
        score: asNullableNumber(row.score),
        confidence: asNullableString(row.confidence),
        rationale: asNullableString(row.rationale),
        components: asObject(row.components),
        methodology_version: asNullableString(row.methodology_version),
      },
    ];
  });
}

function mapEntities(value: unknown): StoryEntity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Row;
    const entity_id = asString(row.entity_id);
    const name = asString(row.name);
    if (!entity_id || !name) return [];
    return [{ entity_type: asString(row.entity_type), entity_id, name }];
  });
}

function mapStory(row: Row): Story {
  return {
    story_id: asString(row.story_id),
    canonical_url: asString(row.canonical_url),
    title: asString(row.title),
    published_at: asNullableString(row.published_at),
    excerpt: asNullableString(row.excerpt),
    summary: asNullableString(row.summary),
    image_url: asNullableString(row.image_url),
    image_status: asNullableString(row.image_status),
    form: asNullableString(row.form),
    source_name: asNullableString(row.source_name),
    homepage_url: asNullableString(row.homepage_url),
    cluster_id: asNullableString(row.cluster_id),
    scores: mapScores(row.scores),
    entities: mapEntities(row.entities),
  };
}

export function entityHref(entity: { entity_type: string; entity_id: string }): string | undefined {
  if (entity.entity_type === "person") return `/people/${entity.entity_id}`;
  if (entity.entity_type === "organization") return `/organizations/${entity.entity_id}`;
  if (entity.entity_type === "podcast") return `/podcasts/${entity.entity_id}`;
  return undefined;
}

export const loadStories = cache(async (): Promise<Story[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("stories_public")
    .select(STORY_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapStory(row as Row));
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const loadStory = cache(async (id: string): Promise<Story | null> => {
  if (!UUID_RE.test(id)) return null;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("stories_public")
    .select(STORY_COLUMNS)
    .eq("story_id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapStory(data as Row) : null;
});

export const loadStoriesByCluster = cache(async (clusterId: string, exceptId: string): Promise<Story[]> => {
  if (!clusterId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("stories_public")
    .select(STORY_COLUMNS)
    .eq("cluster_id", clusterId)
    .neq("story_id", exceptId)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapStory(row as Row));
});

export const loadStoriesForEntity = cache(async (entityType: string, entityId: string): Promise<Story[]> => {
  const supabase = createServerClient();
  const { data: links, error: linkError } = await supabase
    .from("story_entities_public")
    .select("story_id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (linkError) throw linkError;
  const ids = [...new Set((links ?? []).map((row) => asString((row as Row).story_id)).filter(Boolean))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("stories_public")
    .select(STORY_COLUMNS)
    .in("story_id", ids)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapStory(row as Row));
});

export const loadTagStats = cache(async (): Promise<TagStat[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("tag_stats").select("tag, n, avg_score").order("tag");
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const item = row as Row;
    const tag = asString(item.tag);
    if (!isScoreTag(tag)) return [];
    return [
      {
        tag,
        n: asNullableNumber(item.n) ?? 0,
        avg_score: asNullableNumber(item.avg_score),
      },
    ];
  });
});

export const loadSourceStats = cache(async (): Promise<SourceStat[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("source_stats").select("source_id, name, homepage_url, ready_stories").order("name");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const item = row as Row;
    return {
      source_id: asString(item.source_id),
      name: asString(item.name),
      homepage_url: asNullableString(item.homepage_url),
      ready_stories: asNullableNumber(item.ready_stories) ?? 0,
    };
  });
});

export const loadTagTrends = cache(async (): Promise<TagTrend[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("tag_trends").select("week, tag, n").order("week", { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const item = row as Row;
    const tag = asString(item.tag);
    if (!isScoreTag(tag)) return [];
    return [
      {
        week: asNullableString(item.week) ?? "",
        tag,
        n: asNullableNumber(item.n) ?? 0,
      },
    ];
  });
});

export const loadMethodology = cache(async (): Promise<MethodologyRow[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("methodology_public").select("version, status, notes").order("version");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const item = row as Row;
    return {
      version: asString(item.version),
      status: asNullableString(item.status),
      notes: asNullableString(item.notes),
    };
  });
});

export const loadEntityStats = cache(async (): Promise<EntityStat[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("entity_stats").select("entity_type, entity_id, n").order("n", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const item = row as Row;
    return {
      entity_type: asString(item.entity_type),
      entity_id: asString(item.entity_id),
      n: asNullableNumber(item.n) ?? 0,
    };
  });
});
