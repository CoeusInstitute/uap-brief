import NetworkDesk from "@/components/NetworkDesk";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import { buildAppearanceNetwork } from "@/lib/network";
import { loadAppearances } from "@/lib/registry";

export default async function GraphPage({ searchParams }: PageProps<"/graph">) {
  const params = await searchParams;
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const appearances = await loadAppearances();
  const network = buildAppearanceNetwork(appearances);

  return (
    <PageFrame
      header={
        <PageHeader title="Graph">
          <p>
            {network.links.length} appearance edges among {network.nodes.length} people and shows.
          </p>
        </PageHeader>
      }
    >
      <NetworkDesk network={network} initialQuery={initialQuery} />
    </PageFrame>
  );
}
