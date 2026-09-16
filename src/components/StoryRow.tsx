import Image from "next/image";
import Link from "next/link";
import AssessmentLine from "@/components/AssessmentLine";
import type { StoryCard } from "@/lib/feed";

function formatStoryDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function LeadSlot({ story }: { story?: StoryCard | null }) {
  if (!story) return null;
  return <StoryRow story={story} featured />;
}

function StoryMedia({ story, featured }: { story: StoryCard; featured: boolean }) {
  if (!story.imageUrl) {
    // Rows keep an empty well so the thumbnail column stays aligned; the lead simply has no media.
    return featured ? null : <div className="g-surface story-row__media" data-surface="well" aria-hidden="true" />;
  }
  return (
    <Link href={story.href} className="story-row__media" tabIndex={-1} aria-hidden="true">
      <Image
        src={story.imageUrl}
        alt=""
        fill
        sizes={featured ? "(min-width: 60rem) 76rem, 100vw" : "(min-width: 40rem) 18rem, 100vw"}
        priority={featured}
      />
    </Link>
  );
}

export default function StoryRow({ story, featured = false }: { story: StoryCard; featured?: boolean }) {
  const date = formatStoryDate(story.publishedAt);
  const kicker = [story.outlet, date].filter(Boolean).join(" · ");
  const line = story.assessment ? <AssessmentLine pair={story.assessment} /> : null;

  if (featured) {
    return (
      <article className="g-card lead-slot" data-hover="none">
        <StoryMedia story={story} featured />
        <div className="g-card__body">
          {kicker ? <p className="g-meta">{kicker}</p> : null}
          <h2 className="g-heading">
            <Link href={story.href} className="g-link">
              {story.title}
            </Link>
          </h2>
          {story.brief ? <p className="g-caption story-row__brief">{story.brief}</p> : null}
          {line}
        </div>
      </article>
    );
  }

  return (
    <article className="story-row">
      <StoryMedia story={story} featured={false} />
      <div className="story-row__body">
        {kicker ? <p className="g-meta">{kicker}</p> : null}
        <h3 className="g-heading">
          <Link href={story.href} className="g-link">
            {story.title}
          </Link>
        </h3>
        {story.brief ? <p className="g-caption story-row__brief">{story.brief}</p> : null}
        {line}
      </div>
    </article>
  );
}
