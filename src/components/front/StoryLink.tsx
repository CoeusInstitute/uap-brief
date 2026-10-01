"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { DeskWindowOpen } from "@/components/DeskWindows";
import { useDeskWindowsOptional } from "@/components/DeskWindows";
import StoryDeskRecord from "@/components/front/StoryDeskRecord";

export type StoryLinkTarget = {
  id: string;
  title: string;
  outlet?: string | null;
  href: string;
};

export function storyWindowSpec(story: StoryLinkTarget): DeskWindowOpen {
  return {
    id: `story-${story.id}`,
    title: story.title,
    meta: story.outlet ?? undefined,
    href: story.href,
    width: 600,
    height: 680,
    content: <StoryDeskRecord storyId={story.id} />,
  };
}

export default function StoryLink({
  story,
  className,
  tabIndex,
  ariaHidden,
  children,
}: {
  story: StoryLinkTarget;
  className?: string;
  tabIndex?: number;
  ariaHidden?: boolean;
  children: ReactNode;
}) {
  const desk = useDeskWindowsOptional();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!desk) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    desk.open(storyWindowSpec(story));
  }

  return (
    <Link
      href={story.href}
      className={className}
      tabIndex={tabIndex}
      aria-hidden={ariaHidden || undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
