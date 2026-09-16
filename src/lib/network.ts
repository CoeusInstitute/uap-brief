import type { Appearance } from "@/lib/types";

export type NetworkNode = {
  id: string;
  name: string;
  kind: "person" | "show";
  href: string;
  degree: number;
};

export type NetworkLink = {
  source: string;
  target: string;
  role: string | null;
  date: string | null;
};

export type AppearanceNetwork = {
  nodes: NetworkNode[];
  links: NetworkLink[];
};

export function buildAppearanceNetwork(appearances: Appearance[]): AppearanceNetwork {
  const nodes = new Map<string, NetworkNode>();
  const links: NetworkLink[] = [];

  function touch(id: string, name: string, kind: NetworkNode["kind"], href: string) {
    const current = nodes.get(id);
    if (current) {
      current.degree += 1;
      if (name && current.name === id) current.name = name;
      return;
    }
    nodes.set(id, { id, name: name || id, kind, href, degree: 1 });
  }

  for (const row of appearances) {
    if (!row.person_id || !row.podcast_id) continue;
    touch(row.person_id, row.person_name ?? "", "person", `/people/${row.person_id}`);
    touch(row.podcast_id, row.podcast_name ?? "", "show", `/podcasts/${row.podcast_id}`);
    links.push({
      source: row.person_id,
      target: row.podcast_id,
      role: row.role,
      date: row.episode_date,
    });
  }

  return {
    nodes: [...nodes.values()].sort((a, b) => a.name.localeCompare(b.name)),
    links,
  };
}
