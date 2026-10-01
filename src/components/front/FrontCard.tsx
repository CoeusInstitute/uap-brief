import FrontMedia from "@/components/front/FrontMedia";
import ScoreReadout, { ScoreCaption } from "@/components/front/ScoreReadout";
import StoryLink from "@/components/front/StoryLink";
import TimeAgo from "@/components/front/TimeAgo";
import type { StoryCard } from "@/lib/feed";

export default function FrontCard({
  story,
  now,
  rail = false,
}: {
  story: StoryCard;
  now: string;
  rail?: boolean;
}) {
  return (
    <article className="front-card">
      <FrontMedia
        story={story}
        sizes={rail ? "20rem" : "(min-width: 60rem) 17rem, (min-width: 40rem) 50vw, 100vw"}
      >
        <ScoreReadout variant="meter" pair={story.assessment ?? null} />
      </FrontMedia>
      {story.formLabel ? <p className="front-badge">{story.formLabel}</p> : null}
      <h3 className="front-card__title">
        <StoryLink story={story}>{story.title}</StoryLink>
      </h3>
      <p className="g-meta">
        <TimeAgo iso={story.publishedAt} now={now} />
      </p>
      <ScoreCaption pair={story.assessment ?? null} />
    </article>
  );
}
