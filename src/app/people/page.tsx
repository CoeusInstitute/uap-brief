import DirectoryIndex, { type DirectoryFilter, type DirectoryRow } from "@/components/DirectoryIndex";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { displayWords, tierLabel } from "@/lib/format";
import { loadPeople } from "@/lib/registry";

const filters: DirectoryFilter[] = [
  { id: "core", label: "Core" },
  { id: "major", label: "Major" },
  { id: "notable", label: "Notable" },
  { id: "untiered", label: "Untiered" },
];

export default async function PeoplePage() {
  const people = await loadPeople();
  const rows: DirectoryRow[] = people
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((person) => {
      const tier = tierLabel(person.prominence_tier);
      const role = displayWords(person.primary_role, "role unknown");
      return {
        href: `/people/${person.person_id}`,
        key: person.person_id,
        searchText: [person.name, person.person_id, person.aliases.join(" "), person.primary_role, person.affiliations.join(" ")]
          .join(" ")
          .toLowerCase(),
        filters: [tier],
        id: person.person_id,
        title: person.name,
        summary: role,
        mark: tier,
        facts: [
          { label: "Id", value: person.person_id },
          { label: "Role", value: role },
          { label: "Tier", value: tier },
          { label: "Region", value: person.country_or_region },
          { label: "Aliases", value: person.aliases },
          { label: "Affiliations", value: person.affiliations },
          { label: "Sources", value: person.source_count == null ? null : String(person.source_count) },
        ],
      };
    });

  return (
    <PageFrame
      header={
        <PageHeader title="People">
          <p>
            {people.length} people. Blank fields are unknown, not false. Scores apply to the story, not the person.
          </p>
        </PageHeader>
      }
    >
      <DirectoryIndex
        noun="people"
        rows={rows}
        filters={filters}
        placeholder="name, alias, or id"
        emptyLabel="No people match that filter."
        starterFilter="core"
        starterLabel="Core set"
        notice="Scores apply to the story, not the person."
        windowKind="person"
      />
    </PageFrame>
  );
}
