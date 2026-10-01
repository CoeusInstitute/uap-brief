import { storyAssessment, type AssessmentPair } from "@/lib/assessment";
import { displayExcerpt, formLabel } from "@/lib/feed";
import { loadStory } from "@/lib/stories";
import { SCORE_TAGS, type ScoreTag } from "@/lib/types";

export type StoryRecordScore = {
  tag: ScoreTag;
  score: number | null;
  confidence: string | null;
  rationale: string | null;
};

export type StoryRecordModel = {
  id: string;
  title: string;
  href: string;
  canonicalUrl: string | null;
  outlet: string | null;
  homepageUrl: string | null;
  publishedAt: string | null;
  formLabel: string | null;
  imageUrl: string | null;
  illustrated: boolean;
  brief: string | null;
  assessment: AssessmentPair | null;
  scores: StoryRecordScore[];
};

export async function loadStoryRecord(id: string): Promise<StoryRecordModel | null> {
  const story = await loadStory(id);
  if (!story) return null;
  const summary = story.summary?.trim();
  return {
    id: story.story_id,
    title: story.title,
    href: `/story/${story.story_id}`,
    canonicalUrl: story.canonical_url || null,
    outlet: story.source_name,
    homepageUrl: story.homepage_url,
    publishedAt: story.published_at,
    formLabel: formLabel(story.form),
    imageUrl: story.image_status === "stored" && story.image_url ? story.image_url : null,
    illustrated: story.image_origin === "generated",
    brief: summary || displayExcerpt(story.excerpt, 1200),
    assessment: storyAssessment(story),
    scores: [...story.scores]
      .sort((a, b) => SCORE_TAGS.indexOf(a.tag) - SCORE_TAGS.indexOf(b.tag))
      .map((item) => ({
        tag: item.tag,
        score: item.score,
        confidence: item.confidence,
        rationale: item.rationale,
      })),
  };
}
