import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import type { Appearance, Organization, Person, Podcast, TimelineRecord } from "@/lib/types";

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapPerson(row: Row): Person {
  return {
    person_id: asString(row.person_id),
    name: asString(row.name),
    aliases: asStringArray(row.aliases),
    status: asNullableString(row.status),
    primary_role: asNullableString(row.primary_role),
    role_tags: asStringArray(row.role_tags),
    prominence_tier: asNullableString(row.prominence_tier),
    country_or_region: asNullableString(row.country_or_region),
    activity_period: asNullableString(row.activity_period),
    affiliations: asStringArray(row.affiliations),
    positions_or_titles: asNullableString(row.positions_or_titles),
    works_or_platforms: asStringArray(row.works_or_platforms),
    stance_category: asNullableString(row.stance_category),
    position_statement_summary: asNullableString(row.position_statement_summary),
    key_claims_or_contributions: asNullableString(row.key_claims_or_contributions),
    evidence_basis: asStringArray(row.evidence_basis),
    claim_status: asNullableString(row.claim_status),
    record_confidence: asNullableString(row.record_confidence),
    controversies_or_counterpoints: asNullableString(row.controversies_or_counterpoints),
    associated_podcast_ids: asStringArray(row.associated_podcast_ids),
    source_1_title: asNullableString(row.source_1_title),
    source_1_url: asNullableString(row.source_1_url),
    source_1_type: asNullableString(row.source_1_type),
    source_2_title: asNullableString(row.source_2_title),
    source_2_url: asNullableString(row.source_2_url),
    source_2_type: asNullableString(row.source_2_type),
    source_count: asNullableNumber(row.source_count),
    data_sources: asNullableString(row.data_sources),
    last_verified: asNullableString(row.last_verified),
  };
}

function mapPodcast(row: Row): Podcast {
  return {
    podcast_id: asString(row.podcast_id),
    podcast_name: asString(row.podcast_name),
    aliases: asStringArray(row.aliases),
    host_names: asStringArray(row.host_names),
    network_producer: asNullableString(row.network_producer),
    country: asNullableString(row.country),
    status: asNullableString(row.status),
    cadence: asNullableString(row.cadence),
    focus_tags: asStringArray(row.focus_tags),
    reach_tier: asNullableString(row.reach_tier),
    category: asNullableString(row.category),
    primary_url: asNullableString(row.primary_url),
    feed_url: asNullableString(row.feed_url),
    youtube_url: asNullableString(row.youtube_url),
    feed_discovery_status: asNullableString(row.feed_discovery_status),
    notable_recurring_guests: asStringArray(row.notable_recurring_guests),
    notes: asNullableString(row.notes),
    confidence: asNullableString(row.confidence),
  };
}

function mapOrganization(row: Row): Organization {
  return {
    org_id: asString(row.org_id),
    org_name: asString(row.org_name),
    aliases: asStringArray(row.aliases),
    org_type: asNullableString(row.org_type),
    country: asNullableString(row.country),
    status: asNullableString(row.status),
    key_people: asStringArray(row.key_people),
    role_in_discourse: asNullableString(row.role_in_discourse),
    url: asNullableString(row.url),
    confidence: asNullableString(row.confidence),
  };
}

function mapAppearance(row: Row): Appearance {
  return {
    appearance_id: asString(row.appearance_id),
    person_id: asString(row.person_id),
    person_name: asNullableString(row.person_name),
    podcast_id: asString(row.podcast_id),
    podcast_name: asNullableString(row.podcast_name),
    role: asNullableString(row.role),
    episode_title: asNullableString(row.episode_title),
    episode_date: asNullableString(row.episode_date),
    episode_date_sort: asNullableString(row.episode_date_sort),
    topic_tags: asStringArray(row.topic_tags),
    source_url: asNullableString(row.source_url),
    confidence: asNullableString(row.confidence),
  };
}

function mapTimeline(row: Row): TimelineRecord {
  return {
    record_id: asString(row.record_id),
    record_type: asString(row.record_type),
    category: asNullableString(row.category),
    date: asNullableString(row.date),
    date_precision: asNullableString(row.date_precision),
    date_sort: asNullableString(row.date_sort),
    title: asString(row.title),
    actors: asNullableString(row.actors),
    person_id: asNullableString(row.person_id),
    venue: asNullableString(row.venue),
    summary: asNullableString(row.summary),
    significance: asNullableString(row.significance),
    claim_status: asNullableString(row.claim_status),
    source_url: asNullableString(row.source_url),
    confidence: asNullableString(row.confidence),
  };
}

export type RegistryCounts = {
  people: number;
  podcasts: number;
  organizations: number;
  timeline: number;
  appearances: number;
};

async function countView(view: string): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await supabase.from(view).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function loadRegistryCounts(): Promise<RegistryCounts> {
  const [people, podcasts, organizations, timeline, appearances] = await Promise.all([
    countView("people_public"),
    countView("podcasts_public"),
    countView("organizations_public"),
    countView("timeline_public"),
    countView("appearances_public"),
  ]);
  return { people, podcasts, organizations, timeline, appearances };
}

export const loadPeople = cache(async function loadPeople(): Promise<Person[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("people_public").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((row) => mapPerson(row as Row));
});

export async function loadPerson(id: string): Promise<Person | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("people_public").select("*").eq("person_id", id).maybeSingle();
  if (error) throw error;
  return data ? mapPerson(data as Row) : null;
}

export const loadPodcasts = cache(async function loadPodcasts(): Promise<Podcast[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("podcasts_public").select("*").order("podcast_name");
  if (error) throw error;
  return (data ?? []).map((row) => mapPodcast(row as Row));
});

export async function loadPodcast(id: string): Promise<Podcast | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("podcasts_public").select("*").eq("podcast_id", id).maybeSingle();
  if (error) throw error;
  return data ? mapPodcast(data as Row) : null;
}

export const loadOrganizations = cache(async function loadOrganizations(): Promise<Organization[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("organizations_public").select("*").order("org_name");
  if (error) throw error;
  return (data ?? []).map((row) => mapOrganization(row as Row));
});

export async function loadOrganization(id: string): Promise<Organization | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("organizations_public").select("*").eq("org_id", id).maybeSingle();
  if (error) throw error;
  return data ? mapOrganization(data as Row) : null;
}

export const loadAppearances = cache(async function loadAppearances(): Promise<Appearance[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("appearances_public").select("*").order("appearance_id");
  if (error) throw error;
  return (data ?? []).map((row) => mapAppearance(row as Row));
});

export async function loadAppearancesByPerson(personId: string): Promise<Appearance[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("appearances_public")
    .select("*")
    .eq("person_id", personId)
    .order("episode_date_sort", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapAppearance(row as Row));
}

export async function loadAppearancesByPodcast(podcastId: string): Promise<Appearance[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("appearances_public")
    .select("*")
    .eq("podcast_id", podcastId)
    .order("episode_date_sort", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapAppearance(row as Row));
}

export const loadTimeline = cache(async function loadTimeline(): Promise<TimelineRecord[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("timeline_public").select("*").order("date_sort", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapTimeline(row as Row));
});

export async function loadTimelineForPerson(personId: string, name: string): Promise<TimelineRecord[]> {
  const supabase = createServerClient();
  const [{ data: byId, error: idError }, { data: byName, error: nameError }] = await Promise.all([
    supabase.from("timeline_public").select("*").eq("person_id", personId),
    supabase.from("timeline_public").select("*").ilike("actors", `%${name}%`),
  ]);
  if (idError) throw idError;
  if (nameError) throw nameError;
  const merged = new Map<string, TimelineRecord>();
  for (const row of [...(byId ?? []), ...(byName ?? [])]) {
    const record = mapTimeline(row as Row);
    merged.set(record.record_id, record);
  }
  return [...merged.values()].sort((a, b) => (b.date_sort ?? "").localeCompare(a.date_sort ?? ""));
}

export async function loadTimelineRecord(id: string): Promise<TimelineRecord | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("timeline_public").select("*").eq("record_id", id).maybeSingle();
  if (error) throw error;
  return data ? mapTimeline(data as Row) : null;
}
