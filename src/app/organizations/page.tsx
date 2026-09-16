import DirectoryIndex, { type DirectoryFilter, type DirectoryRow } from "@/components/DirectoryIndex";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { displayWords } from "@/lib/format";
import { loadOrganizations } from "@/lib/registry";

const filters: DirectoryFilter[] = [
  { id: "gov", label: "Government" },
  { id: "research", label: "Research" },
  { id: "media", label: "Media" },
  { id: "active", label: "Active" },
];

export default async function OrganizationsPage() {
  const orgs = await loadOrganizations();
  const rows: DirectoryRow[] = orgs
    .slice()
    .sort((a, b) => a.org_name.localeCompare(b.org_name))
    .map((org) => {
      const type = displayWords(org.org_type, "type unknown");
      const status = org.status || "—";
      const lowered = type.toLowerCase();
      return {
        href: `/organizations/${org.org_id}`,
        key: org.org_id,
        searchText: [org.org_name, org.org_id, org.aliases.join(" "), org.key_people.join(" "), org.org_type]
          .join(" ")
          .toLowerCase(),
        filters: [
          lowered.includes("government") || lowered.includes("military") || lowered.includes("congressional")
            ? "gov"
            : "",
          lowered.includes("research") || lowered.includes("academic") || lowered.includes("scientific")
            ? "research"
            : "",
          lowered.includes("media") || lowered.includes("outlet") || lowered.includes("podcast") ? "media" : "",
          status === "active" ? "active" : "",
        ].filter(Boolean),
        id: org.org_id,
        title: org.org_name,
        summary: type,
        mark: status,
        facts: [
          { label: "Id", value: org.org_id },
          { label: "Type", value: type },
          { label: "Status", value: status },
          { label: "Country", value: org.country },
          { label: "Aliases", value: org.aliases },
          { label: "Key people", value: org.key_people },
          { label: "Role", value: org.role_in_discourse },
        ],
      };
    });

  return (
    <PageFrame
      header={
        <PageHeader title="Organizations">
          <p>{orgs.length} organizations, programs, and sites.</p>
        </PageHeader>
      }
    >
      <DirectoryIndex
        noun="organizations"
        rows={rows}
        filters={filters}
        placeholder="name, alias, or people"
        emptyLabel="No organizations match that filter."
        starterFilter="active"
        starterLabel="Active set"
      />
    </PageFrame>
  );
}
