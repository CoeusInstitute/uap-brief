import { cache } from "react";
import type { RecordItem } from "@/components/RecordList";
import { decadeOf } from "@/lib/format";
import { loadAppearances, loadOrganizations, loadPeople, loadPodcasts, loadTimeline } from "@/lib/registry";
import type { Appearance, Organization, Person, Podcast, TimelineRecord } from "@/lib/types";

export function splitPipe(value?: string | null): string[] {
  if (!value) return [];
  return value.split("|").map((part) => part.trim()).filter(Boolean);
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function coreKeys(value: string): string[] {
  const base = normalizeName(value);
  if (!base) return [];
  const keys = [base];
  const parts = base.split(" ");
  if (parts.length >= 3 && parts.slice(1, -1).every((part) => part.length === 1)) {
    keys.push(`${parts[0]} ${parts[parts.length - 1]}`);
  }
  return keys;
}

function queryKeys(value: string): string[] {
  const keys = coreKeys(value);
  const parts = normalizeName(value).split(" ").filter(Boolean);
  if (parts.length >= 3) {
    keys.push(`${parts[0]} ${parts[parts.length - 1]}`);
  }
  return [...new Set(keys)];
}

function remember<T extends { id: string }>(map: Map<string, T | "ambiguous">, key: string, item: T) {
  if (!key) return;
  const current = map.get(key);
  if (!current) {
    map.set(key, item);
    return;
  }
  if (current !== "ambiguous" && current.id !== item.id) {
    map.set(key, "ambiguous");
  }
}

function lookup<T>(map: Map<string, T | "ambiguous">, name: string): T | null {
  for (const key of queryKeys(name)) {
    const hit = map.get(key);
    if (hit && hit !== "ambiguous") return hit;
  }
  return null;
}

export type WikiIndex = {
  person: (name: string) => Person | null;
  org: (name: string) => Organization | null;
  show: (name: string) => Podcast | null;
  personById: Map<string, Person>;
  orgById: Map<string, Organization>;
  showById: Map<string, Podcast>;
};

export function buildWikiIndex(input: {
  people: Person[];
  organizations: Organization[];
  podcasts: Podcast[];
}): WikiIndex {
  const people = new Map<string, { id: string; row: Person } | "ambiguous">();
  const orgs = new Map<string, { id: string; row: Organization } | "ambiguous">();
  const shows = new Map<string, { id: string; row: Podcast } | "ambiguous">();
  const personById = new Map<string, Person>();
  const orgById = new Map<string, Organization>();
  const showById = new Map<string, Podcast>();

  for (const row of input.people) {
    personById.set(row.person_id, row);
    const packed = { id: row.person_id, row };
    for (const key of [...coreKeys(row.name), ...row.aliases.flatMap(coreKeys)]) {
      remember(people, key, packed);
    }
  }
  for (const row of input.organizations) {
    orgById.set(row.org_id, row);
    const packed = { id: row.org_id, row };
    for (const key of [...coreKeys(row.org_name), ...row.aliases.flatMap(coreKeys)]) {
      remember(orgs, key, packed);
    }
  }
  for (const row of input.podcasts) {
    showById.set(row.podcast_id, row);
    const packed = { id: row.podcast_id, row };
    for (const key of [...coreKeys(row.podcast_name), ...row.aliases.flatMap(coreKeys)]) {
      remember(shows, key, packed);
    }
  }

  return {
    person: (name) => lookup(people, name)?.row ?? null,
    org: (name) => lookup(orgs, name)?.row ?? null,
    show: (name) => lookup(shows, name)?.row ?? null,
    personById,
    orgById,
    showById,
  };
}

export function namedLinks(
  names: string[],
  resolve: (name: string) => { href: string; title: string } | null,
): RecordItem[] {
  return names.map((name) => {
    const hit = resolve(name);
    return hit ? { href: hit.href, title: hit.title } : { title: name };
  });
}

export function relatedTimeline(
  record: TimelineRecord,
  records: TimelineRecord[],
  wiki: WikiIndex,
): TimelineRecord[] {
  const seeds = new Set<string>();
  if (record.person_id) seeds.add(record.person_id);
  for (const name of splitPipe(record.actors)) {
    const person = wiki.person(name);
    if (person) seeds.add(person.person_id);
  }
  if (seeds.size === 0) return [];

  return records
    .filter((row) => {
      if (row.record_id === record.record_id) return false;
      if (row.person_id && seeds.has(row.person_id)) return true;
      return splitPipe(row.actors).some((name) => {
        const person = wiki.person(name);
        return Boolean(person && seeds.has(person.person_id));
      });
    })
    .slice(0, 8);
}

export function timelineInDecade(record: TimelineRecord, records: TimelineRecord[]): TimelineRecord[] {
  const decade = decadeOf(record.date);
  return records
    .filter((row) => row.record_id !== record.record_id && decadeOf(row.date) === decade)
    .slice(0, 8);
}

export function peopleForOrg(org: Organization, people: Person[], wiki: WikiIndex): Person[] {
  return people
    .filter((person) => person.affiliations.some((affiliation) => wiki.org(affiliation)?.org_id === org.org_id))
    .slice(0, 12);
}

export function timelineForOrg(org: Organization, records: TimelineRecord[]): TimelineRecord[] {
  const needles = [org.org_name, ...org.aliases].map(normalizeName).filter((needle) => needle.length >= 3);
  if (needles.length === 0) return [];
  return records
    .filter((row) => {
      const hay = normalizeName([row.title, row.actors, row.venue, row.summary].filter(Boolean).join(" "));
      return needles.some((needle) => hay.includes(needle));
    })
    .slice(0, 8);
}

export function appearanceNeighbors(personId: string, appearances: Appearance[]): RecordItem[] {
  const shows = new Set(appearances.filter((row) => row.person_id === personId).map((row) => row.podcast_id));
  const counts = new Map<string, { title: string; href: string; n: number }>();
  for (const row of appearances) {
    if (!shows.has(row.podcast_id) || row.person_id === personId) continue;
    const current = counts.get(row.person_id);
    if (current) {
      current.n += 1;
      continue;
    }
    counts.set(row.person_id, {
      href: `/people/${row.person_id}`,
      title: row.person_name || row.person_id,
      n: 1,
    });
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title))
    .slice(0, 8)
    .map((row) => ({ href: row.href, title: row.title, meta: `${row.n} shared show${row.n === 1 ? "" : "s"}` }));
}

export const loadWikiIndex = cache(async (): Promise<WikiIndex> => {
  const [people, organizations, podcasts] = await Promise.all([loadPeople(), loadOrganizations(), loadPodcasts()]);
  return buildWikiIndex({ people, organizations, podcasts });
});

export const loadWikiCorpus = cache(async () => {
  const [wiki, people, timeline, appearances] = await Promise.all([
    loadWikiIndex(),
    loadPeople(),
    loadTimeline(),
    loadAppearances(),
  ]);
  return { wiki, people, timeline, appearances };
});
