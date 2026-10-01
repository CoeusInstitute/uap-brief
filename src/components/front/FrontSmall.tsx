import FrontMedia from "@/components/front/FrontMedia";
import ScoreReadout from "@/components/front/ScoreReadout";
import StoryLink from "@/components/front/StoryLink";
import TimeAgo from "@/components/front/TimeAgo";
import type { StoryCard } from "@/lib/feed";

export default function FrontSmall({ story, now }: { story: StoryCard; now: string }) {
  return (
    <article className="front-small__cell">
      <div className="front-small__media">
        <FrontMedia story={story} sizes="80px" square />
        {story.formLabel ? <p className="front-badge">{story.formLabel}</p> : null}
      </div>
      <div className="front-small__copy">
        <h3 className="front-small__title">
          <StoryLink story={story}>{story.title}</StoryLink>
        </h3>
        <p className="front-meta g-meta">
          <TimeAgo iso={story.publishedAt} now={now} />
          <ScoreReadout variant="micro" pair={story.assessment ?? null} />
        </p>
      </div>
    </article>
  );
}
