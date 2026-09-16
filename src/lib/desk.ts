import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";

export type EpisodeGuest = {
  person_id: string;
  match_method?: string;
};

export type DeskEpisode = {
  episode_id: string;
  podcast_id: string;
  podcast_name: string;
  title: string;
  pub_date: string | null;
  url: string | null;
  guests: EpisodeGuest[];
};

export type DeskPost = {
  post_id: string;
  handle: string;
  person_id: string | null;
  posted_at: string | null;
  url: string | null;
  text: string | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function mapGuests(value: unknown): EpisodeGuest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = (item as { person_id?: unknown }).person_id;
    if (typeof id !== "string" || !id) return [];
    const method = (item as { match_method?: unknown }).match_method;
    return [{ person_id: id, match_method: typeof method === "string" ? method : undefined }];
  });
}

function mapEpisode(row: {
  episode_id: unknown;
  podcast_id: unknown;
  podcast_name: unknown;
  title: unknown;
  pub_date: unknown;
  url: unknown;
  guests?: unknown;
}): DeskEpisode {
  return {
    episode_id: asString(row.episode_id),
    podcast_id: asString(row.podcast_id),
    podcast_name: asString(row.podcast_name),
    title: asString(row.title),
    pub_date: asNullableString(row.pub_date),
    url: asNullableString(row.url),
    guests: mapGuests(row.guests),
  };
}

export const loadEpisodesForShow = cache(async (podcastId: string, limit = 12): Promise<DeskEpisode[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("episodes_public")
    .select("episode_id, podcast_id, podcast_name, title, pub_date, url, guests")
    .eq("podcast_id", podcastId)
    .order("pub_date", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => mapEpisode(row));
});

export const loadEpisodesForPerson = cache(async (personId: string, limit = 12): Promise<DeskEpisode[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("episodes_public")
    .select("episode_id, podcast_id, podcast_name, title, pub_date, url, guests")
    .order("pub_date", { ascending: false, nullsFirst: false })
    .limit(80);
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapEpisode(row))
    .filter((episode) => episode.guests.some((guest) => guest.person_id === personId))
    .slice(0, limit);
});

export const loadPostsForPerson = cache(async (personId: string, limit = 12): Promise<DeskPost[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("x_posts_public")
    .select("post_id, handle, person_id, posted_at, url, text")
    .eq("person_id", personId)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    post_id: asString(row.post_id),
    handle: asString(row.handle),
    person_id: asNullableString(row.person_id),
    posted_at: asNullableString(row.posted_at),
    url: asNullableString(row.url),
    text: asNullableString(row.text),
  }));
});
