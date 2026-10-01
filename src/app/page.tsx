export const dynamic = "force-dynamic";

import Link from "next/link";
import FeedFilter from "@/components/FeedFilter";
import FrontCard from "@/components/front/FrontCard";
import FrontLead from "@/components/front/FrontLead";
import FrontRail from "@/components/front/FrontRail";
import FrontSmall from "@/components/front/FrontSmall";
import ScoreReadout from "@/components/front/ScoreReadout";
import StoryLink from "@/components/front/StoryLink";
import PageFrame from "@/components/PageFrame";
import { filterStories, formatStoryDate, hasActiveFeedFilter, layoutFront, parseFeedQuery } from "@/lib/feed";
import { loadStories } from "@/lib/stories";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const query = parseFeedQuery(await searchParams);
  const allStories = await loadStories();
  const stories = filterStories(allStories, query);
  const filtered = hasActiveFeedFilter(query);
  const front = layoutFront(stories);
  const now = new Date().toISOString();
  const hasRail = Boolean(front.railLead) || front.railList.length > 0;
  const hasFollow = front.middle.length > 0 || front.small.length > 0;

  return (
    <>
      <FeedFilter query={query} />
      <PageFrame
        layout="front"
        aside={hasRail ? <FrontRail lead={front.railLead} items={front.railList} now={now} /> : undefined}
      >
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
        ) : (
          <>
            {front.lead ? (
              <section aria-labelledby="front-top">
                <h2 id="front-top" className="sr-only">
                  Top stories
                </h2>
                <FrontLead story={front.lead} now={now} />
              </section>
            ) : null}
            {front.lead && hasFollow ? <div className="front-divider" /> : null}
            {hasFollow ? (
              <section aria-labelledby="front-more">
                <h2 id="front-more" className="sr-only">
                  More stories
                </h2>
                {front.middle.length > 0 ? (
                  <div className="front-mid">
                    {front.middle.map((story) => (
                      <FrontCard key={story.id} story={story} now={now} />
                    ))}
                  </div>
                ) : null}
                {front.small.length > 0 ? (
                  <div className="front-small">
                    {front.small.map((story) => (
                      <FrontSmall key={story.id} story={story} now={now} />
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
            {front.earlier.length > 0 ? (
              <section className="front-earlier" aria-labelledby="front-earlier">
                <h2 id="front-earlier" className="sr-only">
                  Earlier
                </h2>
                <p className="front-kicker" aria-hidden="true">
                  Earlier
                </p>
                <ul className="front-earlier__list">
                  {front.earlier.map((story) => {
                    const date = formatStoryDate(story.publishedAt);
                    return (
                      <li key={story.id} className="front-earlier__row">
                        <h3 className="front-earlier__title">
                          <StoryLink story={story}>{story.title}</StoryLink>
                        </h3>
                        <p className="front-earlier__meta g-meta">
                          {story.outlet ? <span>{story.outlet}</span> : null}
                          {date ? <span>{date}</span> : null}
                          <ScoreReadout variant="micro" pair={story.assessment ?? null} />
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </PageFrame>
    </>
  );
}
