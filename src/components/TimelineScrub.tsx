"use client";

import { useMemo, useState } from "react";
import RecordList, { type RecordItem } from "@/components/RecordList";
import { decadeOf } from "@/lib/format";

function itemDecade(item: RecordItem): string {
  return decadeOf(!item.date || item.date === "date unknown" ? null : item.date);
}

export default function TimelineScrub({ items, empty }: { items: RecordItem[]; empty: string }) {
  const [decade, setDecade] = useState("");

  const decades = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = itemDecade(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.keys()].sort((a, b) => {
      if (a === "undated") return 1;
      if (b === "undated") return -1;
      return b.localeCompare(a);
    });
  }, [items]);

  const visible = decade ? items.filter((item) => itemDecade(item) === decade) : items;

  if (items.length === 0) {
    return <RecordList items={[]} empty={empty} />;
  }

  return (
    <div className="timeline-scrub">
      {decades.length > 1 ? (
        <div className="g-segmented" role="group" aria-label="Decades">
          {decades.map((item) => (
            <button
              key={item}
              type="button"
              className="g-button"
              data-size="sm"
              aria-pressed={decade === item}
              onClick={() => setDecade((current) => (current === item ? "" : item))}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <RecordList items={visible} empty={empty} />
    </div>
  );
}
