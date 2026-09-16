import DirectoryIndex, { type DirectoryFilter, type DirectoryRow } from "@/components/DirectoryIndex";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { displayWords } from "@/lib/format";
import { loadPodcasts } from "@/lib/registry";

const filters: DirectoryFilter[] = [
  { id: "news", label: "News" },
  { id: "interview", label: "Interview" },
  { id: "active", label: "Active" },
];

export default async function PodcastsPage() {
  const podcasts = await loadPodcasts();
  const rows: DirectoryRow[] = podcasts
    .slice()
    .sort((a, b) => a.podcast_name.localeCompare(b.podcast_name))
    .map((show) => {
      const category = displayWords(show.category, "—");
      const status = show.status || "—";
      const hosts = show.host_names.join(" · ") || "host unknown";
      return {
        href: `/podcasts/${show.podcast_id}`,
        key: show.podcast_id,
        searchText: [show.podcast_name, show.podcast_id, show.host_names.join(" "), show.focus_tags.join(" "), show.category]
          .join(" ")
          .toLowerCase(),
        filters: [
          category.toLowerCase().includes("news") ? "news" : "",
          category.toLowerCase().includes("interview") ? "interview" : "",
          status === "active" ? "active" : "",
        ].filter(Boolean),
        id: show.podcast_id,
        title: show.podcast_name,
        summary: hosts,
        mark: status,
        facts: [
          { label: "Id", value: show.podcast_id },
          { label: "Hosts", value: show.host_names },
          { label: "Category", value: category },
          { label: "Reach", value: displayWords(show.reach_tier, "—") },
          { label: "Status", value: status },
          { label: "Focus", value: show.focus_tags },
          { label: "Network", value: show.network_producer },
        ],
      };
    });

  return (
    <PageFrame
      header={
        <PageHeader title="Podcasts">
          <p>{podcasts.length} shows.</p>
        </PageHeader>
      }
    >
      <DirectoryIndex
        noun="shows"
        rows={rows}
        filters={filters}
        placeholder="show, host, or tag"
        emptyLabel="No shows match that filter."
        starterFilter="active"
        starterLabel="Active shows"
      />
    </PageFrame>
  );
}
