"use client";

import { useEffect, useState } from "react";
import { formatStoryDateTime } from "@/lib/feed";

function formatAge(diffMs: number): string {
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours < 48) return `${hours}h ${remainMinutes}m ago`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}d ${remainHours}h ago`;
}

export default function TimeAgo({ iso, now }: { iso?: string | null; now: string }) {
  const published = iso ? Date.parse(iso) : Number.NaN;
  const [tick, setTick] = useState(() => Date.parse(now));
  const [title, setTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (Number.isNaN(published)) return;
    setTick(Date.now());
    setTitle(formatStoryDateTime(iso) ?? undefined);
    const id = window.setInterval(() => setTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [iso, published]);

  if (!iso || Number.isNaN(published) || Number.isNaN(tick)) return null;
  return (
    <time dateTime={iso} title={title}>
      {formatAge(Math.max(0, tick - published))}
    </time>
  );
}
