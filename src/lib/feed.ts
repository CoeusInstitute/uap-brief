import { storyAssessment, type AssessmentPair } from "@/lib/assessment";
import type { Story } from "@/lib/types";

export const FRONT_MIDDLE = 6;
export const FRONT_RAIL = 12;
export const FRONT_SMALL = 18;

const FORM_LABELS: Record<string, string> = {
  news: "Story",
  analysis: "Analysis",
  opinion: "Opinion",
  press_release: "Press release",
  podcast: "Podcast",
  video: "Video",
};

export function formLabel(form: string | null | undefined): string | null {
  const raw = form?.trim();
  if (!raw) return null;
  const known = FORM_LABELS[raw.toLowerCase()];
  if (known) return known;
  const words = raw.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type StoryCard = {
  id: string;
  href: string;
  title: string;
  /** Model brief when stored; cleaned excerpt otherwise. */
  brief?: string | null;
  imageUrl?: string | null;
  /** True when the picture was generated for a story that had no source image. */
  illustrated?: boolean;
  outlet?: string | null;
  publishedAt?: string | null;
  assessment?: AssessmentPair | null;
  canonicalUrl?: string | null;
  form: string | null;
  formLabel: string | null;
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
  image_origin?: string | null;
  source_name?: string | null;
  published_at?: string | null;
  canonical_url?: string | null;
  form?: string | null;
  scores?: { tag: string; score?: number | null }[];
}): StoryCard {
  const summary = story.summary?.trim();
  return {
    id: story.story_id,
    href: `/story/${story.story_id}`,
    title: story.title,
    brief: summary || displayExcerpt(story.excerpt),
    imageUrl: story.image_status === "stored" && story.image_url ? story.image_url : null,
    illustrated: story.image_origin === "generated",
    outlet: story.source_name,
    publishedAt: story.published_at,
    assessment: storyAssessment(story),
    canonicalUrl: story.canonical_url,
    form: story.form?.trim() || null,
    formLabel: formLabel(story.form),
  };
}

export function formatStoryDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatStoryDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
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

export type FrontLayout = {
  lead: StoryCard | null;
  middle: StoryCard[];
  railLead: StoryCard | null;
  railList: StoryCard[];
  small: StoryCard[];
  earlier: StoryCard[];
};

function hasStoredImage(story: { image_status?: string | null; image_url?: string | null }): boolean {
  return story.image_status === "stored" && Boolean(story.image_url);
}

function takeSlots(pool: Story[], count: number, preferImage: boolean): Story[] {
  if (!preferImage) return pool.slice(0, count);
  const imaged = pool.filter(hasStoredImage).slice(0, count);
  if (imaged.length >= count) return imaged;
  const fillers = pool.filter((story) => !hasStoredImage(story)).slice(0, count - imaged.length);
  return [...imaged, ...fillers];
}

export function layoutFront(stories: Story[]): FrontLayout {
  const used = new Set<string>();
  const remaining = () => stories.filter((story) => !used.has(story.story_id));
  const take = (story: Story) => {
    used.add(story.story_id);
    return toStoryCard(story);
  };

  const leadSource = pickLead(stories.filter(hasStoredImage)) ?? pickLead(stories);
  const lead = leadSource ? take(leadSource) : null;
  const middle = takeSlots(remaining(), FRONT_MIDDLE, true).map(take);
  const afterMiddle = remaining();
  const railSource = afterMiddle.find(hasStoredImage) ?? afterMiddle[0] ?? null;
  const railLead = railSource ? take(railSource) : null;
  const railList = remaining().slice(0, FRONT_RAIL).map(take);
  const small = takeSlots(remaining(), FRONT_SMALL, true).map(take);
  const earlier = remaining().map(toStoryCard);

  return { lead, middle, railLead, railList, small, earlier };
}
