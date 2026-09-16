export const dynamic = "force-dynamic";

import Link from "next/link";
import { DetailItem, DetailList } from "@/components/DetailList";
import EmptyState from "@/components/EmptyState";
import PageFrame from "@/components/PageFrame";
import RecordList from "@/components/RecordList";
import ScoreChip, { formatScore } from "@/components/ScoreChip";
import { LeadSlot } from "@/components/StoryRow";
import { toStoryCard } from "@/lib/feed";
import { SCORE_TAGS } from "@/lib/types";
import { entityHref, loadStoriesByCluster, loadStory } from "@/lib/stories";

function componentLines(components: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!components) return [];
  const mix = components.mix && typeof components.mix === "object" ? (components.mix as Record<string, unknown>) : {};
  const rows: { label: string; value: string }[] = [];
  const model = typeof components.model === "number" ? components.model : null;
  const mixed = typeof components.mixed === "number" ? components.mixed : null;
  if (model != null) rows.push({ label: "Model", value: formatScore(model) });
  if (mixed != null) rows.push({ label: "Mixed", value: formatScore(mixed) });
  for (const [key, value] of Object.entries(mix)) {
    if (typeof value !== "number") continue;
    rows.push({ label: key.replaceAll("_", " "), value: formatScore(value) });
  }
  return rows;
}

export default async function StoryPage({ params }: PageProps<"/story/[id]">) {
  const { id } = await params;
  const story = await loadStory(id);

  if (!story) {
    return (
      <PageFrame
        layout="main-aside"
        aside={
          <section className="g-card" data-hover="none" aria-labelledby="story-status">
            <header className="g-card__header">
              <h2 className="g-heading" id="story-status">
                Not in the feed
              </h2>
            </header>
            <div className="g-card__body">
              <p className="g-caption">No story is stored for this id. Scores apply to the story, not the person.</p>
            </div>
          </section>
        }
      >
        <EmptyState
          title="Not in the feed"
          action={
            <Link href="/" className="g-link">
              Back to the feed
            </Link>
          }
        >
          <p>No story is stored for this id.</p>
        </EmptyState>
      </PageFrame>
    );
  }

  const siblings = story.cluster_id ? await loadStoriesByCluster(story.cluster_id, story.story_id) : [];
  const scores = [...story.scores].sort(
    (a, b) => SCORE_TAGS.indexOf(a.tag) - SCORE_TAGS.indexOf(b.tag),
  );

  return (
    <PageFrame
      layout="main-aside"
      aside={
        <>
          <section className="g-card" data-hover="none" aria-labelledby="story-source">
            <header className="g-card__header">
              <h2 className="g-heading" id="story-source">
                Source
              </h2>
            </header>
            <div className="g-card__body">
              {story.homepage_url ? (
                <a href={story.homepage_url} className="g-link">
                  {story.source_name || "Outlet"}
                </a>
              ) : (
                <p className="g-caption">{story.source_name || "Outlet unknown"}</p>
              )}
              {story.canonical_url ? (
                <a href={story.canonical_url} className="g-link">
                  Open original
                </a>
              ) : (
                <p className="g-caption">No source URL stored.</p>
              )}
            </div>
          </section>
          {siblings.length > 0 ? (
            <section className="g-card" data-hover="none" aria-labelledby="story-siblings">
              <header className="g-card__header">
                <h2 className="g-heading" id="story-siblings">
                  Also covered
                </h2>
              </header>
              <div className="g-card__body">
                <RecordList
                  items={siblings.map((item) => ({
                    href: `/story/${item.story_id}`,
                    title: item.title,
                    meta: item.source_name ?? undefined,
                  }))}
                />
              </div>
            </section>
          ) : null}
        </>
      }
    >
      <LeadSlot story={toStoryCard(story)} />
      <section className="g-card" data-hover="none" aria-labelledby="story-scores">
        <header className="g-card__header">
          <h2 className="g-heading" id="story-scores">
            Scores
          </h2>
        </header>
        <div className="g-card__body">
          {scores.length === 0 ? (
            <p className="g-caption">No scores stored for this story.</p>
          ) : (
            <div className="g-stack">
              {scores.map((item) => {
                const parts = componentLines(item.components);
                return (
                  <div key={item.tag} className="prose-block">
                    <div className="g-row">
                      <ScoreChip tag={item.tag} score={item.score ?? undefined} />
                      {item.confidence ? <span className="g-meta">{item.confidence}</span> : null}
                    </div>
                    {item.rationale ? <p className="g-caption">{item.rationale}</p> : <p className="g-caption">No rationale stored.</p>}
                    {parts.length > 0 ? (
                      <DetailList>
                        {parts.map((part) => (
                          <DetailItem key={part.label} label={part.label} value={part.value} />
                        ))}
                      </DetailList>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <p className="g-meta">Scores apply to the story, not the person.</p>
        </div>
      </section>
      {story.entities.length > 0 ? (
        <section className="g-card" data-hover="none" aria-labelledby="story-entities">
          <header className="g-card__header">
            <h2 className="g-heading" id="story-entities">
              Named in this story
            </h2>
          </header>
          <div className="g-card__body">
            <RecordList
              items={story.entities.map((entity) => ({
                href: entityHref(entity),
                title: entity.name,
                meta: entity.entity_type,
              }))}
            />
          </div>
        </section>
      ) : null}
    </PageFrame>
  );
}
