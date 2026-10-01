import FrontMedia from "@/components/front/FrontMedia";
import ScoreReadout from "@/components/front/ScoreReadout";
import StoryLink from "@/components/front/StoryLink";
import TimeAgo from "@/components/front/TimeAgo";
import type { StoryCard } from "@/lib/feed";

export default function FrontLead({ story, now }: { story: StoryCard; now: string }) {
  return (
    <article className="front-lead" data-media={story.imageUrl ? "image" : "none"}>
      <header className="front-lead__head">
        {story.formLabel ? <p className="front-badge">{story.formLabel}</p> : null}
        <h2 className="front-lead__title">
          <StoryLink story={story}>{story.title}</StoryLink>
        </h2>
      </header>
      <div className="front-lead__copy">
        {story.outlet || story.publishedAt ? (
          <p className="g-meta front-lead__meta">
            {story.outlet ? <span>{story.outlet}</span> : null}
            {story.outlet && story.publishedAt ? <span aria-hidden="true"> · </span> : null}
            <TimeAgo iso={story.publishedAt} now={now} />
          </p>
        ) : null}
        {story.brief ? <p className="g-caption front-lead__brief">{story.brief}</p> : null}
        <ScoreReadout variant="panel" pair={story.assessment ?? null} />
      </div>
      {story.imageUrl ? (
        <FrontMedia story={story} sizes="(min-width: 60rem) 34rem, 100vw" priority />
      ) : null}
    </article>
  );
}
