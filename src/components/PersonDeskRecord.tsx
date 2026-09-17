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

const PERSON_WINDOW_SIZE = { width: 840, height: 880 };

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

function nextIndex() {
  let n = 0;
  return () => String(++n).padStart(2, "0");
}

function DossierBlock({
  index,
  title,
  extra,
  children,
}: {
  index: string;
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-desk`;
  return (
    <section className="dossier-window__block" aria-labelledby={headingId}>
      <header className="dossier-window__index">
        <span className="dossier-window__n" aria-hidden="true">
          {index}
        </span>
        <h3 className="dossier-window__heading" id={headingId}>
          {title}
        </h3>
        <span className="dossier-window__hairline" aria-hidden="true" />
        {extra}
      </header>
      <div className="dossier-window__panel">{children}</div>
    </section>
  );
}

function FactBlock({ index, title, items }: { index: string; title: string; items: FactItem[] }) {
  const visible = items.filter(hasFact);
  if (visible.length === 0) return null;
  return (
    <DossierBlock index={index} title={title}>
      <DetailList>
        {visible.map((item) => (
          <DetailItem key={item.label} label={item.label} value={item.value} />
        ))}
      </DetailList>
    </DossierBlock>
  );
}

function NeighborList({ items }: { items: RecordItem[] }) {
  const desk = useDeskWindowsOptional();
  if (items.length === 0) {
    return <p className="dossier-window__empty">No shared appearance edges.</p>;
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
              <span>{item.title}</span>
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
    return <p className="dossier-window__empty">Loading record.</p>;
  }
  if (status === "error") {
    return <p className="dossier-window__empty" data-tone="error">Record could not be loaded.</p>;
  }
  if (status === "missing" || !model) {
    return <p className="dossier-window__empty">No record for this id.</p>;
  }

  const seq = nextIndex();
  const identity = model.identity.filter(hasFact);
  const provenance = model.provenance.filter(hasFact);

  return (
    <article className="dossier-window" aria-labelledby={`${reactId}-name`}>
      <header className="dossier-window__hero">
        <p className="dossier-window__filemark">Person file</p>
        <h2 id={`${reactId}-name`} className="dossier-window__name">
          {model.name}
        </h2>
        <dl className="dossier-window__meta">
          {model.role ? (
            <div>
              <dt>Role</dt>
              <dd>{model.role}</dd>
            </div>
          ) : null}
          <div>
            <dt>Tier</dt>
            <dd>{model.tier}</dd>
          </div>
          <div>
            <dt>Id</dt>
            <dd>{model.id}</dd>
          </div>
        </dl>
        <p className="dossier-window__disclaimer">Scores apply to material, not the person.</p>
      </header>

      <DossierBlock index={seq()} title="Attributed position">
        <div className="dossier-window__field">
          <span>Stance</span>
          <p>{model.stance}</p>
        </div>
        <Prose label="Position summary" value={model.position} />
        <Prose label="Claims / contributions" value={model.claims} />
        <Prose label="Counterpoints" value={model.counterpoints} />
      </DossierBlock>

      {identity.length > 0 || provenance.length > 0 ? (
        <div className="dossier-window__split">
          {identity.length > 0 ? <FactBlock index={seq()} title="Identity" items={identity} /> : null}
          {provenance.length > 0 ? <FactBlock index={seq()} title="Provenance" items={provenance} /> : null}
        </div>
      ) : null}

      {model.links.length > 0 ? (
        <DossierBlock index={seq()} title="Profiles">
          <RecordList items={model.links} />
        </DossierBlock>
      ) : null}

      <DossierBlock index={seq()} title="Sources">
        <RecordList items={model.sources} empty="No source URL stored on this row." />
      </DossierBlock>

      <DossierBlock index={seq()} title="Organizations">
        <RecordList items={model.orgs} empty="No affiliations stored on this row." />
      </DossierBlock>

      {model.shows.length > 0 ? (
        <DossierBlock index={seq()} title="Associated shows">
          <RecordList items={model.shows} />
        </DossierBlock>
      ) : null}

      {model.news.length > 0 ? (
        <DossierBlock index={seq()} title="In the news">
          <RecordList items={model.news} />
        </DossierBlock>
      ) : null}

      {model.posts.length > 0 ? (
        <DossierBlock index={seq()} title="Posts">
          <RecordList items={model.posts} />
        </DossierBlock>
      ) : null}

      {model.episodes.length > 0 ? (
        <DossierBlock index={seq()} title="Episode guests">
          <RecordList items={model.episodes} />
        </DossierBlock>
      ) : null}

      <DossierBlock
        index={seq()}
        title="Appearances"
        extra={
          model.graphHref ? (
            <Link href={model.graphHref} className="dossier-window__action">
              Graph
            </Link>
          ) : null
        }
      >
        <RecordList items={model.appearances} empty="No appearances listed." />
      </DossierBlock>

      <DossierBlock index={seq()} title="Timeline">
        <RecordList items={model.timeline} empty="No timeline rows listed." />
      </DossierBlock>

      <DossierBlock index={seq()} title="Also appeared with">
        <NeighborList items={model.neighbors} />
      </DossierBlock>
    </article>
  );
}
