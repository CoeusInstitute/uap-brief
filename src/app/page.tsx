export const dynamic = "force-dynamic";

import Link from "next/link";
import FeedFilter from "@/components/FeedFilter";
import PageFrame from "@/components/PageFrame";
import StoryRow, { LeadSlot } from "@/components/StoryRow";
import { filterStories, hasActiveFeedFilter, parseFeedQuery, pickLead, toStoryCard } from "@/lib/feed";
import { loadStories } from "@/lib/stories";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const query = parseFeedQuery(await searchParams);
  const allStories = await loadStories();
  const stories = filterStories(allStories, query);
  const lead = pickLead(stories);
  const rest = stories.filter((story) => story.story_id !== lead?.story_id).map(toStoryCard);
  const filtered = hasActiveFeedFilter(query);

  return (
    <>
      <FeedFilter query={query} />
      <PageFrame layout="single">
        {lead ? <LeadSlot story={toStoryCard(lead)} /> : null}
        {rest.length > 0 ? (
          <div className="story-list">
            {rest.map((story) => (
              <StoryRow key={story.id} story={story} />
            ))}
          </div>
        ) : null}
        {stories.length === 0 ? (
          <section className="g-card" data-hover="none" aria-labelledby="feed-empty">
            <header className="g-card__header">
              <h2 className="g-heading" id="feed-empty">
                {filtered ? "No stories match this filter." : "No stories in the feed yet."}
              </h2>
            </header>
            {filtered ? (
              <div className="g-card__body">
                <Link href="/" className="g-link">
                  Clear filter
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}
      </PageFrame>
    </>
  );
}
