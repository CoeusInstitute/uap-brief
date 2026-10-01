import Image from "next/image";
import type { ReactNode } from "react";
import StoryLink from "@/components/front/StoryLink";
import type { StoryCard } from "@/lib/feed";

export default function FrontMedia({
  story,
  sizes,
  priority = false,
  square = false,
  children,
}: {
  story: StoryCard;
  sizes: string;
  priority?: boolean;
  square?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={square ? "front-media front-media--square" : "front-media"}>
      {story.imageUrl ? (
        <StoryLink story={story} className="front-media__link" tabIndex={-1} ariaHidden>
          <Image
            src={story.imageUrl}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            style={square ? { objectFit: "cover" } : undefined}
          />
        </StoryLink>
      ) : (
        <div className="g-surface front-media__well" data-surface="well" aria-hidden="true" />
      )}
      {story.illustrated && square ? (
        <span className="front-media__mark" title="Illustration" role="img" aria-label="Illustration">
          IL
        </span>
      ) : null}
      {story.illustrated && !square ? <span className="front-media__illustration">Illustration</span> : null}
      {children}
    </div>
  );
}
