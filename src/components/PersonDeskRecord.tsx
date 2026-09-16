"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { getPersonRecord } from "@/app/people/actions";
import { DetailItem, DetailList } from "@/components/DetailList";
import type { DeskWindowOpen } from "@/components/DeskWindows";
import { useDeskWindowsOptional } from "@/components/DeskWindows";
import { Prose } from "@/components/Prose";
import RecordList, { RecordRow, type RecordItem } from "@/components/RecordList";
import type { FactItem } from "@/components/FactSheet";
import type { PersonRecordModel } from "@/lib/person-record";

const PERSON_WINDOW_SIZE = { width: 720, height: 800 };

export function personWindowSpec(personId: string, title: string): DeskWindowOpen {
  return {
    id: `dir-${personId}`,
    title,
    meta: personId,
    href: `/people/${personId}`,
    width: PERSON_WINDOW_SIZE.width,
    height: PERSON_WINDOW_SIZE.height,
    content: <PersonDeskRecord personId={personId} />,
  };
}

function hasFact(item: FactItem): boolean {
  if (!item.value) return false;
  return Array.isArray(item.value) ? item.value.length > 0 : true;
}

function personIdFromHref(href?: string): string | null {
  if (!href) return null;
  const match = href.match(/^\/people\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function RecordSection({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-desk`;
  return (
    <section className="desk-record__section" aria-labelledby={headingId}>
      <header className="desk-record__section-head">
        <h3 className="g-eyebrow desk-record__h" id={headingId}>
          {title}
        </h3>
        {extra}
      </header>
      {children}
    </section>
  );
}

function FactBlock({ title, items }: { title: string; items: FactItem[] }) {
  const visible = items.filter(hasFact);
  if (visible.length === 0) return null;
  return (
    <RecordSection title={title}>
      <DetailList>
        {visible.map((item) => (
          <DetailItem key={item.label} label={item.label} value={item.value} />
        ))}
      </DetailList>
    </RecordSection>
  );
}

function NeighborList({ items }: { items: RecordItem[] }) {
  const desk = useDeskWindowsOptional();
  if (items.length === 0) {
    return <p className="g-caption">No shared appearance edges.</p>;
  }
  if (!desk) {
    return <RecordList items={items} />;
  }
  return (
    <RecordList>
      {items.map((item, index) => {
        const personId = personIdFromHref(item.href);
        return (
          <RecordRow key={`${item.href ?? item.title}-${index}`} title={item.title} meta={item.meta} date={item.date}>
            {personId ? (
              <button type="button" className="g-link" onClick={() => desk.open(personWindowSpec(personId, item.title))}>
                {item.title}
              </button>
            ) : (
              <span className="g-body">{item.title}</span>
            )}
          </RecordRow>
        );
      })}
    </RecordList>
  );
}

export default function PersonDeskRecord({ personId }: { personId: string }) {
  const reactId = useId();
  const [model, setModel] = useState<PersonRecordModel | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setModel(null);
    getPersonRecord(personId)
      .then((data) => {
        if (cancelled) return;
        setModel(data);
        setStatus(data ? "ready" : "missing");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  if (status === "loading") {
    return <p className="g-terminal__dim">Loading.</p>;
  }
  if (status === "error") {
    return <p className="g-terminal__error">Record could not be loaded.</p>;
  }
  if (status === "missing" || !model) {
    return <p className="g-caption">No record for this id.</p>;
  }

  return (
    <article className="desk-record" aria-labelledby={`${reactId}-name`}>
      <header className="desk-record__mast">
        <h2 id={`${reactId}-name`} className="sr-only">
          {model.name}
        </h2>
        <div className="desk-record__marks">
          {model.role ? <span className="g-badge">{model.role}</span> : null}
          <span className="g-badge">{model.tier}</span>
          <span className="g-caption">Scores apply to material, not to people.</span>
        </div>
        <p className="g-body">Attributed statements stay attributed. This window does not score the person.</p>
      </header>

      <RecordSection title="Attributed position">
        <p className="g-caption">Stance {model.stance}</p>
        <Prose label="Position summary" value={model.position} />
        <Prose label="Claims / contributions" value={model.claims} />
        <Prose label="Counterpoints" value={model.counterpoints} />
      </RecordSection>

      <div className="desk-record__facts">
        <FactBlock title="Identity" items={model.identity} />
        <FactBlock title="Provenance" items={model.provenance} />
      </div>

      {model.links.length > 0 ? (
        <RecordSection title="Profiles">
          <RecordList items={model.links} />
        </RecordSection>
      ) : null}

      <RecordSection title="Sources">
        <RecordList items={model.sources} empty="No source URL stored on this row." />
      </RecordSection>

      <RecordSection title="Organizations">
        <RecordList items={model.orgs} empty="No affiliations stored on this row." />
      </RecordSection>

      {model.shows.length > 0 ? (
        <RecordSection title="Associated shows">
          <RecordList items={model.shows} />
        </RecordSection>
      ) : null}

      {model.news.length > 0 ? (
        <RecordSection title="In the news">
          <RecordList items={model.news} />
        </RecordSection>
      ) : null}

      {model.posts.length > 0 ? (
        <RecordSection title="Posts">
          <RecordList items={model.posts} />
        </RecordSection>
      ) : null}

      {model.episodes.length > 0 ? (
        <RecordSection title="Episode guests">
          <RecordList items={model.episodes} />
        </RecordSection>
      ) : null}

      <RecordSection
        title="Appearances"
        extra={
          model.graphHref ? (
            <Link href={model.graphHref} className="g-link">
              On the graph
            </Link>
          ) : null
        }
      >
        <RecordList items={model.appearances} empty="No appearances listed." />
      </RecordSection>

      <RecordSection title="Timeline">
        <RecordList items={model.timeline} empty="No timeline rows listed." />
      </RecordSection>

      <RecordSection title="Also appeared with">
        <NeighborList items={model.neighbors} />
      </RecordSection>
    </article>
  );
}
