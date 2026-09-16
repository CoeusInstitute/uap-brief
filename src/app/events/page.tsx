import DirectoryIndex, { type DirectoryFilter, type DirectoryRow } from "@/components/DirectoryIndex";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { decadeOf, displayWords } from "@/lib/format";
import { loadTimeline } from "@/lib/registry";

const filters: DirectoryFilter[] = [
  { id: "event", label: "Events" },
  { id: "statement", label: "Statements" },
  { id: "hearing", label: "Hearings" },
];

function hearingCategory(category: string | null): boolean {
  const value = (category ?? "").toLowerCase();
  return (
    value.includes("hearing") ||
    value.includes("oversight") ||
    value.includes("committee") ||
    value.includes("legislative")
  );
}

export default async function EventsPage() {
  const records = await loadTimeline();
  const rows: DirectoryRow[] = records.map((record) => {
    const kind = record.record_type === "statement" ? "statement" : "event";
    const decade = decadeOf(record.date);
    return {
      href: `/events/${record.record_id}`,
      key: record.record_id,
      searchText: [record.title, record.record_id, record.actors, record.venue, record.category, record.summary]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      filters: [kind, hearingCategory(record.category) ? "hearing" : ""].filter(Boolean),
      id: record.record_id,
      title: record.title,
      summary: [record.date || "date unknown", displayWords(record.category, "category unknown")].join(" · "),
      group: decade,
      mark: record.record_type,
      facts: [
        { label: "Id", value: record.record_id },
        { label: "Date", value: record.date || "date unknown" },
        { label: "Precision", value: record.date_precision },
        { label: "Type", value: record.record_type },
        { label: "Category", value: displayWords(record.category, "unknown") },
        { label: "Actors", value: record.actors },
        { label: "Venue", value: record.venue },
        { label: "Significance", value: record.significance },
        { label: "Claim status", value: record.claim_status },
      ],
    };
  });

  return (
    <PageFrame
      header={
        <PageHeader title="Events">
          <p>{records.length} dated records. Events and statements stay attributed to the stored source.</p>
        </PageHeader>
      }
    >
      <DirectoryIndex
        noun="timeline"
        rows={rows}
        filters={filters}
        placeholder="title, actor, or venue"
        emptyLabel="No records match that filter."
        starterFilter="event"
        starterLabel="Events"
        rail="year"
      />
    </PageFrame>
  );
}
