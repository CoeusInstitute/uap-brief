import FactSheet from "@/components/FactSheet";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { Prose, ProseSection } from "@/components/Prose";
import RecordList from "@/components/RecordList";
import { decadeOf, displayWords } from "@/lib/format";
import { loadTimeline, loadTimelineRecord } from "@/lib/registry";
import { loadWikiIndex, namedLinks, relatedTimeline, splitPipe, timelineInDecade } from "@/lib/wiki";
import { notFound } from "next/navigation";

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const [record, wiki, records] = await Promise.all([loadTimelineRecord(id), loadWikiIndex(), loadTimeline()]);
  if (!record) notFound();

  const linkedPerson = record.person_id ? wiki.personById.get(record.person_id) : null;
  const people = namedLinks(splitPipe(record.actors), (name) => {
    const person = wiki.person(name);
    return person ? { href: `/people/${person.person_id}`, title: person.name } : null;
  });
  if (linkedPerson && !people.some((item) => item.href === `/people/${linkedPerson.person_id}`)) {
    people.unshift({ href: `/people/${linkedPerson.person_id}`, title: linkedPerson.name });
  }
  const related = relatedTimeline(record, records, wiki);
  const decade = decadeOf(record.date);
  const decadePeers = timelineInDecade(record, records);

  return (
    <PageFrame
      layout="main-aside"
      header={
        <PageHeader
          eyebrow={record.record_id}
          title={record.title}
          meta={
            <>
              <span className="g-badge">{record.record_type}</span>
              <span className="g-meta">
                {record.date || "date unknown"} · {record.date_precision || "precision unknown"}
              </span>
            </>
          }
        />
      }
      aside={
        <FactSheet
          title="Timeline record"
          items={[
            { label: "Category", value: displayWords(record.category, "") || null },
            { label: "Actors", value: record.actors },
            { label: "Venue", value: record.venue },
            { label: "Significance", value: record.significance },
            { label: "Claim status", value: record.claim_status },
            { label: "Confidence", value: record.confidence },
          ]}
          footer={
            record.source_url ? (
              <a href={record.source_url} className="g-link">
                Source
              </a>
            ) : (
              <span className="g-meta">No source URL stored on this row.</span>
            )
          }
        />
      }
    >
      <ProseSection title="Summary">
        <Prose label="Stored summary" value={record.summary} />
        {!record.summary ? <p className="g-caption">No summary stored on this row.</p> : null}
      </ProseSection>

      <section className="g-card" data-hover="none" aria-labelledby="people-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="people-title">
            People
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList items={people} empty="No actors stored on this row." />
          {people.some((item) => item.href) ? (
            <p className="g-caption">Names link when they match a registry row.</p>
          ) : null}
        </div>
      </section>

      <section className="g-card" data-hover="none" aria-labelledby="related-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="related-title">
            Related records
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList
            items={related.map((row) => ({
              href: `/events/${row.record_id}`,
              title: row.title,
              meta: row.record_type,
              date: row.date || "date unknown",
            }))}
            empty="No other records share a matched person."
          />
        </div>
      </section>

      <section className="g-card" data-hover="none" aria-labelledby="decade-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="decade-title">
            Also in the {decade}
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList
            items={decadePeers.map((row) => ({
              href: `/events/${row.record_id}`,
              title: row.title,
              meta: row.record_type,
              date: row.date || "date unknown",
            }))}
            empty="No other stored records in this decade."
          />
        </div>
      </section>
    </PageFrame>
  );
}
