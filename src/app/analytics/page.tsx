export const dynamic = "force-dynamic";

import MetricCard, { MetricStrip } from "@/components/MetricCard";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { shortDate, tierLabel } from "@/lib/format";
import { loadOrganizations, loadPeople, loadPodcasts, loadRegistryCounts } from "@/lib/registry";
import { loadEntityStats, loadSourceStats, loadTagStats, loadTagTrends } from "@/lib/stories";

export default async function AnalyticsPage() {
  const [counts, tags, sources, people, organizations, podcasts, trends, entities] = await Promise.all([
    loadRegistryCounts(),
    loadTagStats(),
    loadSourceStats(),
    loadPeople(),
    loadOrganizations(),
    loadPodcasts(),
    loadTagTrends(),
    loadEntityStats(),
  ]);

  const names = new Map<string, string>();
  for (const person of people) names.set(`person:${person.person_id}`, person.name);
  for (const org of organizations) names.set(`organization:${org.org_id}`, org.org_name);
  for (const show of podcasts) names.set(`podcast:${show.podcast_id}`, show.podcast_name);

  const tiers = { core: 0, major: 0, notable: 0, untiered: 0 };
  for (const person of people) {
    const tier = tierLabel(person.prominence_tier);
    if (tier === "core") tiers.core += 1;
    else if (tier === "major") tiers.major += 1;
    else if (tier === "notable") tiers.notable += 1;
    else tiers.untiered += 1;
  }

  return (
    <PageFrame
      header={
        <>
          <PageHeader title="Analytics">
            <p>Counts from stored rows. Empty means no Ready scores yet, not a guess.</p>
          </PageHeader>
          <MetricStrip>
            <MetricCard label="People" value={counts.people} href="/people" featured />
            <MetricCard label="Shows" value={counts.podcasts} href="/podcasts" />
            <MetricCard label="Organizations" value={counts.organizations} href="/organizations" />
            <MetricCard label="Appearances" value={counts.appearances} href="/graph" />
            <MetricCard label="Timeline records" value={counts.timeline} href="/events" />
          </MetricStrip>
        </>
      }
    >
      <section className="g-card" data-hover="none" aria-labelledby="tier-stats">
        <header className="g-card__header">
          <h2 className="g-heading" id="tier-stats">
            People by tier
          </h2>
        </header>
        <div className="g-card__body">
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th className="numeric">People</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Core</td>
                  <td className="numeric">{tiers.core}</td>
                </tr>
                <tr>
                  <td>Major</td>
                  <td className="numeric">{tiers.major}</td>
                </tr>
                <tr>
                  <td>Notable</td>
                  <td className="numeric">{tiers.notable}</td>
                </tr>
                <tr>
                  <td>Untiered</td>
                  <td className="numeric">{tiers.untiered}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="g-card" data-hover="none" aria-labelledby="tag-stats">
        <header className="g-card__header">
          <h2 className="g-heading" id="tag-stats">
            Tags
          </h2>
        </header>
        <div className="g-card__body">
          {tags.length === 0 ? (
            <p className="g-caption">No tag stats stored.</p>
          ) : (
            <div className="g-table-wrap">
              <table className="g-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th className="numeric">Stories</th>
                    <th className="numeric">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((row) => (
                    <tr key={row.tag}>
                      <td>{row.tag}</td>
                      <td className="numeric">{row.n}</td>
                      <td className="numeric g-mono">{row.avg_score == null ? "—" : row.avg_score.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <section className="g-card" data-hover="none" aria-labelledby="tag-trends">
        <header className="g-card__header">
          <h2 className="g-heading" id="tag-trends">
            Tag trends
          </h2>
        </header>
        <div className="g-card__body">
          {trends.length === 0 ? (
            <p className="g-caption">No weekly tag counts stored.</p>
          ) : (
            <div className="g-table-wrap">
              <table className="g-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Tag</th>
                    <th className="numeric">Stories</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.slice(0, 24).map((row) => (
                    <tr key={`${row.week}-${row.tag}`}>
                      <td>{shortDate(row.week) ?? row.week.slice(0, 10)}</td>
                      <td>{row.tag}</td>
                      <td className="numeric">{row.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <section className="g-card" data-hover="none" aria-labelledby="entity-stats">
        <header className="g-card__header">
          <h2 className="g-heading" id="entity-stats">
            Named entities
          </h2>
        </header>
        <div className="g-card__body">
          {entities.length === 0 ? (
            <p className="g-caption">No entity matches stored on Ready stories.</p>
          ) : (
            <div className="g-table-wrap">
              <table className="g-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th className="numeric">Stories</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.slice(0, 24).map((row) => (
                    <tr key={`${row.entity_type}-${row.entity_id}`}>
                      <td>{names.get(`${row.entity_type}:${row.entity_id}`) || row.entity_id}</td>
                      <td>{row.entity_type}</td>
                      <td className="numeric">{row.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <section className="g-card" data-hover="none" aria-labelledby="source-stats">
        <header className="g-card__header">
          <h2 className="g-heading" id="source-stats">
            Outlets
          </h2>
        </header>
        <div className="g-card__body">
          {sources.length === 0 ? (
            <p className="g-caption">No outlet stats stored.</p>
          ) : (
            <div className="g-table-wrap">
              <table className="g-table">
                <thead>
                  <tr>
                    <th>Outlet</th>
                    <th className="numeric">Ready stories</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((row) => (
                    <tr key={row.source_id}>
                      <td>
                        {row.homepage_url ? (
                          <a href={row.homepage_url} className="g-link">
                            {row.name}
                          </a>
                        ) : (
                          row.name
                        )}
                      </td>
                      <td className="numeric">{row.ready_stories}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </PageFrame>
  );
}
