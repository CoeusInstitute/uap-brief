import FactSheet from "@/components/FactSheet";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { Prose, ProseSection } from "@/components/Prose";
import RecordList from "@/components/RecordList";
import { words } from "@/lib/format";
import { loadOrganization } from "@/lib/registry";
import { loadWikiCorpus, namedLinks, peopleForOrg, timelineForOrg } from "@/lib/wiki";
import { notFound } from "next/navigation";

export default async function OrganizationPage({ params }: PageProps<"/organizations/[id]">) {
  const { id } = await params;
  const [org, corpus] = await Promise.all([loadOrganization(id), loadWikiCorpus()]);
  if (!org) notFound();

  const keyPeople = namedLinks(org.key_people, (name) => {
    const person = corpus.wiki.person(name);
    return person ? { href: `/people/${person.person_id}`, title: person.name } : null;
  });
  const affiliated = peopleForOrg(org, corpus.people, corpus.wiki);
  const mentions = timelineForOrg(org, corpus.timeline);

  return (
    <PageFrame
      layout="main-aside"
      header={
        <PageHeader
          eyebrow={org.org_id}
          title={org.org_name}
          meta={
            <>
              {org.org_type ? <span className="g-badge">{words(org.org_type)}</span> : null}
              {org.status ? <span className="g-badge">{org.status}</span> : null}
            </>
          }
        />
      }
      aside={
        <FactSheet
          title="Organization"
          items={[
            { label: "Type", value: words(org.org_type) },
            { label: "Status", value: org.status },
            { label: "Country", value: org.country },
            { label: "Aliases", value: org.aliases },
            { label: "Key people", value: org.key_people },
            { label: "Confidence", value: org.confidence },
          ]}
          footer={
            org.url ? (
              <a href={org.url} className="g-button g-button--outline" data-size="sm">
                Source
              </a>
            ) : null
          }
        />
      }
    >
      <ProseSection title="Role in discourse">
        <Prose label="Recorded role" value={org.role_in_discourse} />
        {!org.role_in_discourse ? <p className="g-caption">No role summary stored on this row.</p> : null}
      </ProseSection>

      <section className="g-card" data-hover="none" aria-labelledby="key-people-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="key-people-title">
            Key people
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList items={keyPeople} empty="No key people stored on this row." />
        </div>
      </section>

      <section className="g-card" data-hover="none" aria-labelledby="affiliated-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="affiliated-title">
            People listing this affiliation
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList
            items={affiliated.map((person) => ({
              href: `/people/${person.person_id}`,
              title: person.name,
              meta: words(person.primary_role) || undefined,
            }))}
            empty="No people list this organization as an affiliation."
          />
        </div>
      </section>

      <section className="g-card" data-hover="none" aria-labelledby="mentions-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="mentions-title">
            Timeline mentions
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList
            items={mentions.map((row) => ({
              href: `/events/${row.record_id}`,
              title: row.title,
              meta: row.record_type,
              date: row.date || "date unknown",
            }))}
            empty="No timeline rows mention this organization."
          />
        </div>
      </section>
    </PageFrame>
  );
}
