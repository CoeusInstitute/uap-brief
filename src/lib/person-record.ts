import { cache } from "react";
import type { FactItem } from "@/components/FactSheet";
import type { RecordItem } from "@/components/RecordList";
import { loadEpisodesForPerson, loadPostsForPerson } from "@/lib/desk";
import { displayWords, shortDate, tierLabel, words } from "@/lib/format";
import { loadAppearancesByPerson, loadPerson, loadTimelineForPerson } from "@/lib/registry";
import { loadStoriesForEntity } from "@/lib/stories";
import { createServerClient } from "@/lib/supabase/server";
import type { Person } from "@/lib/types";
import { appearanceNeighbors, loadWikiCorpus, namedLinks } from "@/lib/wiki";

export type PersonRecordModel = {
  id: string;
  name: string;
  role?: string;
  tier: string;
  identity: FactItem[];
  provenance: FactItem[];
  stance: string;
  position: string | null;
  claims: string | null;
  counterpoints: string | null;
  sources: RecordItem[];
  links: RecordItem[];
  orgs: RecordItem[];
  shows: RecordItem[];
  news: RecordItem[];
  posts: RecordItem[];
  episodes: RecordItem[];
  appearances: RecordItem[];
  graphHref: string | null;
  timeline: RecordItem[];
  neighbors: RecordItem[];
};

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

function seedSources(person: Person): RecordItem[] {
  const items: RecordItem[] = [];
  if (person.source_1_url) {
    items.push({
      href: person.source_1_url,
      title: person.source_1_title || person.source_1_url,
      meta: person.source_1_type || undefined,
    });
  }
  if (person.source_2_url) {
    items.push({
      href: person.source_2_url,
      title: person.source_2_title || person.source_2_url,
      meta: person.source_2_type || undefined,
    });
  }
  return items;
}

async function loadHostedSources(personId: string): Promise<RecordItem[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("person_sources_public")
    .select("url, title, outlet, domain, source_type, published_date")
    .eq("person_id", personId)
    .order("published_date", { ascending: false, nullsFirst: false })
    .limit(80);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const url = asString((row as Row).url);
    if (!url) return [];
    const title = asNullableString((row as Row).title) || asNullableString((row as Row).outlet) || url;
    const meta =
      [asNullableString((row as Row).outlet), words(asNullableString((row as Row).source_type))]
        .filter(Boolean)
        .join(" · ") || undefined;
    return [
      {
        href: url,
        title,
        meta,
        date: shortDate(asNullableString((row as Row).published_date)),
      },
    ];
  });
}

async function loadHostedLinks(personId: string): Promise<RecordItem[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("person_links_public")
    .select("link_type, url, label")
    .eq("person_id", personId)
    .order("link_type");
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const url = asString((row as Row).url);
    if (!url) return [];
    const kind = words(asNullableString((row as Row).link_type));
    const label = asNullableString((row as Row).label) || kind || url;
    return [
      {
        href: url,
        title: label,
        meta: kind && kind !== label ? kind : undefined,
      },
    ];
  });
}

export const loadPersonRecord = cache(async (id: string): Promise<PersonRecordModel | null> => {
  const person = await loadPerson(id);
  if (!person) return null;

  const [personAppearances, personTimeline, corpus, inNews, posts, guestEpisodes, hostedSources, links] =
    await Promise.all([
      loadAppearancesByPerson(person.person_id),
      loadTimelineForPerson(person.person_id, person.name),
      loadWikiCorpus(),
      loadStoriesForEntity("person", person.person_id),
      loadPostsForPerson(person.person_id),
      loadEpisodesForPerson(person.person_id),
      loadHostedSources(person.person_id),
      loadHostedLinks(person.person_id),
    ]);

  const role = words(person.primary_role);
  const tier = tierLabel(person.prominence_tier);
  const sources = hostedSources.length > 0 ? hostedSources : seedSources(person);
  const orgs = namedLinks(person.affiliations, (name) => {
    const org = corpus.wiki.org(name);
    return org ? { href: `/organizations/${org.org_id}`, title: org.org_name } : null;
  });
  const shows = person.associated_podcast_ids.map((podcastId) => {
    const show = corpus.wiki.showById.get(podcastId);
    return show
      ? { href: `/podcasts/${show.podcast_id}`, title: show.podcast_name }
      : { title: podcastId };
  });

  return {
    id: person.person_id,
    name: person.name,
    role,
    tier,
    identity: [
      { label: "Aliases", value: person.aliases },
      { label: "Status", value: person.status },
      { label: "Primary role", value: role },
      { label: "Role tags", value: person.role_tags },
      { label: "Prominence", value: person.prominence_tier },
      { label: "Region", value: person.country_or_region },
      { label: "Activity", value: person.activity_period },
      { label: "Affiliations", value: person.affiliations },
      { label: "Titles", value: person.positions_or_titles },
      { label: "Works / platforms", value: person.works_or_platforms },
    ],
    provenance: [
      { label: "Data sources", value: person.data_sources },
      { label: "Last verified", value: person.last_verified },
      { label: "Record confidence", value: words(person.record_confidence) },
      { label: "Claim status", value: words(person.claim_status) },
      { label: "Evidence basis", value: person.evidence_basis },
    ],
    stance: displayWords(person.stance_category),
    position: person.position_statement_summary,
    claims: person.key_claims_or_contributions,
    counterpoints: person.controversies_or_counterpoints,
    sources,
    links,
    orgs,
    shows,
    news: inNews.map((story) => ({
      href: `/story/${story.story_id}`,
      title: story.title,
      meta: story.source_name ?? undefined,
      date: shortDate(story.published_at),
    })),
    posts: posts.map((post) => ({
      href: post.url ?? undefined,
      title: post.text ? post.text.slice(0, 90) : `@${post.handle.replace(/^@/, "")}`,
      meta: `@${post.handle.replace(/^@/, "")}`,
      date: shortDate(post.posted_at),
    })),
    episodes: guestEpisodes.map((episode) => ({
      href: episode.url ?? `/podcasts/${episode.podcast_id}`,
      title: episode.title,
      meta: episode.podcast_name,
      date: shortDate(episode.pub_date),
    })),
    appearances: personAppearances.map((row) => ({
      href: row.source_url || `/podcasts/${row.podcast_id}`,
      title: row.episode_title || row.podcast_name || row.podcast_id,
      meta: [row.podcast_name, row.role, row.topic_tags.join(" · ")].filter(Boolean).join(" · ") || undefined,
      date: row.episode_date || undefined,
    })),
    graphHref: personAppearances.length > 0 ? `/graph?q=${encodeURIComponent(person.name)}` : null,
    timeline: personTimeline.map((row) => ({
      href: `/events/${row.record_id}`,
      title: row.title,
      meta: row.record_type,
      date: row.date || "date unknown",
    })),
    neighbors: appearanceNeighbors(person.person_id, corpus.appearances),
  };
});
