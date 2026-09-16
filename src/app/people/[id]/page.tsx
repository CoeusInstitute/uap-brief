export const dynamic = "force-dynamic";

import Link from "next/link";
import FactSheet from "@/components/FactSheet";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { Prose, ProseSection } from "@/components/Prose";
import RecordList from "@/components/RecordList";
import TimelineScrub from "@/components/TimelineScrub";
import { loadPersonRecord } from "@/lib/person-record";
import { notFound } from "next/navigation";

export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const model = await loadPersonRecord(id);
  if (!model) notFound();

  return (
    <PageFrame
      layout="main-aside"
      header={
        <PageHeader
          eyebrow={model.id}
          title={model.name}
          meta={
            <>
              {model.role ? <span className="g-badge">{model.role}</span> : null}
              <span className="g-badge">{model.tier}</span>
              <span className="g-caption">Scores apply to material, not to people.</span>
            </>
          }
        >
          <p>Attributed statements stay attributed. This page does not score the person.</p>
        </PageHeader>
      }
      aside={
        <>
          <FactSheet title="Identity" items={model.identity} />
          <FactSheet title="Provenance" items={model.provenance} />
        </>
      }
    >
      <ProseSection title="Attributed position">
        <p className="g-caption">Stance {model.stance}</p>
        <Prose label="Position summary" value={model.position} />
        <Prose label="Claims / contributions" value={model.claims} />
        <Prose label="Counterpoints" value={model.counterpoints} />
      </ProseSection>

      {model.links.length > 0 ? (
        <section className="g-card" data-hover="none" aria-labelledby="profiles-title">
          <header className="g-card__header">
            <h2 className="g-heading" id="profiles-title">
              Profiles
            </h2>
          </header>
          <div className="g-card__body">
            <RecordList items={model.links} />
          </div>
        </section>
      ) : null}

      <section className="g-card" data-hover="none" aria-labelledby="sources-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="sources-title">
            Sources
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList items={model.sources} empty="No source URL stored on this row." />
        </div>
      </section>

      <section className="g-card" data-hover="none" aria-labelledby="orgs-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="orgs-title">
            Organizations
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList items={model.orgs} empty="No affiliations stored on this row." />
        </div>
      </section>

      {model.shows.length > 0 ? (
        <section className="g-card" data-hover="none" aria-labelledby="shows-title">
          <header className="g-card__header">
            <h2 className="g-heading" id="shows-title">
              Associated shows
            </h2>
          </header>
          <div className="g-card__body">
            <RecordList items={model.shows} />
          </div>
        </section>
      ) : null}

      {model.news.length > 0 ? (
        <section className="g-card" data-hover="none" aria-labelledby="news-title">
          <header className="g-card__header">
            <h2 className="g-heading" id="news-title">
              In the news
            </h2>
          </header>
          <div className="g-card__body">
            <RecordList items={model.news} />
          </div>
        </section>
      ) : null}

      {model.posts.length > 0 ? (
        <section className="g-card" data-hover="none" aria-labelledby="posts-title">
          <header className="g-card__header">
            <h2 className="g-heading" id="posts-title">
              Posts
            </h2>
          </header>
          <div className="g-card__body">
            <RecordList items={model.posts} />
          </div>
        </section>
      ) : null}

      {model.episodes.length > 0 ? (
        <section className="g-card" data-hover="none" aria-labelledby="guest-eps-title">
          <header className="g-card__header">
            <h2 className="g-heading" id="guest-eps-title">
              Episode guests
            </h2>
          </header>
          <div className="g-card__body">
            <RecordList items={model.episodes} />
          </div>
        </section>
      ) : null}

      <section className="g-card" data-hover="none" aria-labelledby="appearances-title">
        <header className="g-card__header">
          <div>
            <h2 className="g-heading" id="appearances-title">
              Appearances
            </h2>
          </div>
          {model.graphHref ? (
            <Link href={model.graphHref} className="g-link">
              On the graph
            </Link>
          ) : null}
        </header>
        <div className="g-card__body">
          <RecordList items={model.appearances} empty="No appearances listed." />
        </div>
      </section>

      <section className="g-card" data-hover="none" aria-labelledby="timeline-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="timeline-title">
            Timeline
          </h2>
        </header>
        <div className="g-card__body">
          <TimelineScrub items={model.timeline} empty="No timeline rows listed." />
        </div>
      </section>

      <section className="g-card" data-hover="none" aria-labelledby="neighbors-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="neighbors-title">
            Also appeared with
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList items={model.neighbors} empty="No shared appearance edges." />
        </div>
      </section>
    </PageFrame>
  );
}
