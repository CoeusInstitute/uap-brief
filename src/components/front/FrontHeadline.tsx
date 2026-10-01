import ScoreReadout from "@/components/front/ScoreReadout";
import StoryLink from "@/components/front/StoryLink";
import TimeAgo from "@/components/front/TimeAgo";
import type { StoryCard } from "@/lib/feed";

export default function FrontHeadline({ story, now }: { story: StoryCard; now: string }) {
  return (
    <article className="front-headline">
      <h3 className="front-headline__title">
        <StoryLink story={story}>{story.title}</StoryLink>
      </h3>
      <p className="front-meta g-meta">
        <TimeAgo iso={story.publishedAt} now={now} />
        <ScoreReadout variant="micro" pair={story.assessment ?? null} />
      </p>
    </article>
  );
}
