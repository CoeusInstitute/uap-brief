export const dynamic = "force-dynamic";

import FactSheet from "@/components/FactSheet";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { Prose } from "@/components/Prose";
import RecordList from "@/components/RecordList";
import { loadEpisodesForShow } from "@/lib/desk";
import { displayWords, shortDate, words } from "@/lib/format";
import { loadAppearancesByPodcast, loadPodcast } from "@/lib/registry";
import { loadWikiIndex, namedLinks } from "@/lib/wiki";
import { notFound } from "next/navigation";

export default async function PodcastPage({ params }: PageProps<"/podcasts/[id]">) {
  const { id } = await params;
  const show = await loadPodcast(id);
  if (!show) notFound();

  const [appearances, wiki, episodes] = await Promise.all([
    loadAppearancesByPodcast(show.podcast_id),
    loadWikiIndex(),
    loadEpisodesForShow(show.podcast_id),
  ]);
  const hosts = namedLinks(show.host_names, (name) => {
    const person = wiki.person(name);
    return person ? { href: `/people/${person.person_id}`, title: person.name } : null;
  });
  const notable = namedLinks(show.notable_recurring_guests, (name) => {
    const person = wiki.person(name);
    return person ? { href: `/people/${person.person_id}`, title: person.name } : null;
  });
  const seenGuests = new Set<string>();
  const episodeGuests = episodes.flatMap((episode) =>
    episode.guests.flatMap((guest) => {
      if (seenGuests.has(guest.person_id)) return [];
      seenGuests.add(guest.person_id);
      const person = wiki.personById.get(guest.person_id);
      return [{ href: `/people/${guest.person_id}`, title: person?.name || guest.person_id }];
    }),
  );

  return (
    <PageFrame
      layout="main-aside"
      header={
        <PageHeader
          eyebrow={show.podcast_id}
          title={show.podcast_name}
          meta={
            <>
              {show.reach_tier ? <span className="g-badge">{displayWords(show.reach_tier)}</span> : null}
              {show.category ? <span className="g-badge">{displayWords(show.category)}</span> : null}
            </>
          }
        >
          <p>Guests from the show record. Episodes from stored feed items.</p>
        </PageHeader>
      }
      aside={
        <FactSheet
          title="Show record"
          items={[
            { label: "Hosts", value: show.host_names },
            { label: "Network", value: show.network_producer },
            { label: "Reach tier", value: words(show.reach_tier) },
            { label: "Category", value: words(show.category) },
            { label: "Status", value: show.status },
            { label: "Cadence", value: show.cadence },
            { label: "Focus", value: show.focus_tags },
            { label: "Feed discovery", value: show.feed_discovery_status },
          ]}
          footer={
            <>
              {show.primary_url ? (
                <a href={show.primary_url} className="g-button g-button--outline" data-size="sm">
                  Show page
                </a>
              ) : null}
              {show.feed_url ? (
                <a href={show.feed_url} className="g-button g-button--outline" data-size="sm">
                  Feed
                </a>
              ) : null}
              {show.youtube_url ? (
                <a href={show.youtube_url} className="g-button g-button--outline" data-size="sm">
                  YouTube
                </a>
              ) : null}
            </>
          }
        />
      }
    >
      <section className="g-card" data-hover="none" aria-labelledby="hosts-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="hosts-title">
            Hosts
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList items={hosts} empty="No hosts stored on this row." />
        </div>
      </section>
      {show.notes ? (
        <section className="g-card" data-hover="none" aria-labelledby="notes-title">
          <header className="g-card__header">
            <h2 className="g-heading" id="notes-title">
              Notes
            </h2>
          </header>
          <div className="g-card__body">
            <Prose label="Notes" value={show.notes} />
          </div>
        </section>
      ) : null}
      <section className="g-card" data-hover="none" aria-labelledby="episodes-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="episodes-title">
            Episodes
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList
            items={episodes.map((episode) => ({
              href: episode.url ?? undefined,
              title: episode.title,
              date: shortDate(episode.pub_date),
            }))}
            empty="No episodes stored for this show."
          />
        </div>
      </section>
      <section className="g-card" data-hover="none" aria-labelledby="guests-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="guests-title">
            Guests
          </h2>
        </header>
        <div className="g-card__body">
          <RecordList
            items={[
              ...notable,
              ...episodeGuests.filter((guest) => !notable.some((row) => row.href === guest.href)),
              ...appearances
                .filter((row) => !seenGuests.has(row.person_id) && !notable.some((item) => item.href === `/people/${row.person_id}`))
                .map((row) => ({
                  href: `/people/${row.person_id}`,
                  title: row.person_name || row.person_id,
                  meta: [row.role, row.episode_title, row.topic_tags.join(" · ")].filter(Boolean).join(" · ") || undefined,
                  date: row.episode_date || undefined,
                })),
            ]}
            empty="No guests listed."
          />
        </div>
      </section>
    </PageFrame>
  );
}
