import { storyAssessment, type AssessmentPair } from "@/lib/assessment";

export type StoryCard = {
  id: string;
  href: string;
  title: string;
  /** Model brief when stored; cleaned excerpt otherwise. */
  brief?: string | null;
  imageUrl?: string | null;
  outlet?: string | null;
  publishedAt?: string | null;
  assessment?: AssessmentPair | null;
  canonicalUrl?: string | null;
};

type ScoredStory = {
  title: string;
  excerpt?: string | null;
  summary?: string | null;
  source_name?: string | null;
  scores?: { tag: string; score?: number | null }[];
};

const EXCERPT_CHROME =
  /skip to content|cookie (settings|policy)|privacy policy|terms of (use|service)|accept (all )?cookies|subscribe to (our|the)|manage consent/i;

export function displayExcerpt(value: string | null | undefined, maxChars = 240): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (EXCERPT_CHROME.test(cleaned)) return null;
  if (cleaned.length <= maxChars) return cleaned;
  const slice = cleaned.slice(0, maxChars);
  const at = slice.lastIndexOf(" ");
  return `${(at > 80 ? slice.slice(0, at) : slice).trimEnd()}…`;
}

export function toStoryCard(story: {
  story_id: string;
  title: string;
  excerpt?: string | null;
  summary?: string | null;
  image_url?: string | null;
  image_status?: string | null;
  source_name?: string | null;
  published_at?: string | null;
  canonical_url?: string | null;
  scores?: { tag: string; score?: number | null }[];
}): StoryCard {
  const summary = story.summary?.trim();
  return {
    id: story.story_id,
    href: `/story/${story.story_id}`,
    title: story.title,
    brief: summary || displayExcerpt(story.excerpt),
    imageUrl: story.image_status === "stored" && story.image_url ? story.image_url : null,
    outlet: story.source_name,
    publishedAt: story.published_at,
    assessment: storyAssessment(story),
    canonicalUrl: story.canonical_url,
  };
}

export type FeedQuery = { q: string };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseFeedQuery(searchParams: { q?: string | string[] }): FeedQuery {
  return { q: first(searchParams.q)?.trim() ?? "" };
}

export function hasActiveFeedFilter(query: FeedQuery): boolean {
  return query.q.length > 0;
}

export function filterStories<T extends ScoredStory>(stories: T[], query: FeedQuery): T[] {
  const needle = query.q.toLowerCase();
  if (!needle) return stories;
  return stories.filter((story) => {
    const hay = [story.title, story.summary ?? "", story.excerpt ?? "", story.source_name ?? ""].join(" ").toLowerCase();
    return hay.includes(needle);
  });
}

export function pickLead<T extends { form?: string | null; source_name?: string | null; published_at?: string | null }>(
  stories: T[],
): T | null {
  if (stories.length === 0) return null;
  const news = stories.filter((story) => (story.form ?? "").toLowerCase() === "news");
  const pool = news.length > 0 ? news : stories;
  const notSightings = pool.filter((story) => story.source_name !== "UFO Sightings Daily");
  const chosen = notSightings.length > 0 ? notSightings : pool;
  return [...chosen].sort((a, b) => {
    const aTime = a.published_at ? Date.parse(a.published_at) : 0;
    const bTime = b.published_at ? Date.parse(b.published_at) : 0;
    return bTime - aTime;
  })[0] ?? null;
}
