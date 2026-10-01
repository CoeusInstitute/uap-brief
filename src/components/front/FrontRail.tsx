import FrontCard from "@/components/front/FrontCard";
import FrontHeadline from "@/components/front/FrontHeadline";
import type { StoryCard } from "@/lib/feed";

export default function FrontRail({
  lead,
  items,
  now,
}: {
  lead: StoryCard | null;
  items: StoryCard[];
  now: string;
}) {
  return (
    <section className="front-rail" aria-labelledby="front-latest">
      <h2 id="front-latest" className="sr-only">
        Latest
      </h2>
      <p className="front-rail__kicker" aria-hidden="true">
        <span className="dossier-window__led" data-active="true" />
        <span>Latest</span>
      </p>
      {lead ? <FrontCard story={lead} now={now} rail /> : null}
      {items.length > 0 ? (
        <ol className="front-rail__list">
          {items.map((story) => (
            <li key={story.id}>
              <FrontHeadline story={story} now={now} />
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
