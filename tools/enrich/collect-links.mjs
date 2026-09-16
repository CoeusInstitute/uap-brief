import {
  canonicalizeUrl,
  hostnameOf,
  loadPeople,
  markCollector,
  matchesPerson,
  normalizeName,
  parseArgs,
  personIdsForWave,
  readState,
  runMcporterExa,
  serviceClient,
  shouldSkipPerson,
  sleep,
  USER_AGENT,
  writeQueue,
  writeState,
} from "./lib.mjs";

const args = parseArgs();
const supabase = serviceClient();
const ids = await personIdsForWave(supabase, args.wave || 1, args.ids);
const people = await loadPeople(supabase, ids);
const state = readState();
let collected = 0;
let skipped = 0;

for (const person of people) {
  if (shouldSkipPerson(state, person.person_id, "links", args.force)) {
    skipped += 1;
    if (args.dryRun) console.log(`SKIP ${person.person_id} links`);
    continue;
  }
  if (args.dryRun) {
    console.log(`FETCH ${person.person_id} links`);
    continue;
  }
  const found = [];
  found.push(...(await wikipediaLinks(person)));
  await sleep(1200);
  found.push(...(await wikidataLinks(person)));
  await sleep(1200);
  const searches = [
    {
      query: `${person.name} site:linkedin.com/in`,
      objective: `Capture the LinkedIn profile URL for ${person.name} only. Do not include other people.`,
      via: "links",
      kind: "linkedin",
    },
    {
      query: `${person.name} official website`,
      objective: `Find the personal or official website for ${person.name}. Prefer first-party homepages.`,
      via: "links",
      kind: "website",
    },
    {
      query: `${person.name} site:x.com`,
      objective: `Find the X/Twitter profile URL for ${person.name}. Prefer x.com/{handle} profiles, not status posts.`,
      via: "x_trace",
      kind: "x",
    },
  ];
  for (const search of searches) {
    try {
      const rows = await runMcporterExa(search.query, search.objective);
      for (const row of rows) {
        const url = canonicalizeUrl(row.url);
        if (!url) continue;
        const host = hostnameOf(url);
        if (search.kind === "linkedin" && !host.includes("linkedin.com")) continue;
        if (search.kind === "x" && !/(^|\.)(x\.com|twitter\.com)$/.test(host)) continue;
        if (search.kind === "website" && (host.includes("linkedin.com") || host.includes("wikipedia.org"))) continue;
        const text = `${row.title} ${row.snippet} ${url}`;
        if (!matchesPerson(text, person) && search.kind !== "linkedin") continue;
        found.push({
          url,
          title: row.title ?? "",
          outlet: host,
          snippet: String(row.snippet ?? "").slice(0, 400),
          published: row.published ?? "",
          discovered_via: search.via,
          link_hint: search.kind,
        });
      }
    } catch (error) {
      console.error(`${person.person_id} ${search.kind}: ${error instanceof Error ? error.message : error}`);
    }
    await sleep(1500);
  }
  writeQueue(person.person_id, {
    name: person.name,
    wave: args.wave || 1,
    candidates: found,
  });
  markCollector(state, person.person_id, "links", {
    wave: args.wave || 1,
    name: person.name,
    links_candidates: found.length,
  });
  collected += 1;
  console.log(`${person.person_id} links ${found.length}`);
}

writeState(state);
console.log(`links collected=${collected} skipped=${skipped}`);

async function wikipediaLinks(person) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", person.name);
  url.searchParams.set("srlimit", "5");
  url.searchParams.set("format", "json");
  const json = await fetchJson(url);
  const hits = json.query?.search ?? [];
  const out = [];
  for (const hit of hits) {
    const title = String(hit.title ?? "");
    if (!isExactOrFirstLast(title, person)) continue;
    const page = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    out.push({
      url: page,
      title,
      outlet: "Wikipedia",
      snippet: String(hit.snippet ?? "").replace(/<[^>]+>/g, ""),
      published: "",
      discovered_via: "links",
      link_hint: "wikipedia",
    });
  }
  return out;
}

async function wikidataLinks(person) {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", person.name);
  url.searchParams.set("language", "en");
  url.searchParams.set("type", "item");
  url.searchParams.set("limit", "5");
  url.searchParams.set("format", "json");
  const json = await fetchJson(url);
  const hits = json.search ?? [];
  const out = [];
  for (const hit of hits) {
    const title = String(hit.label ?? hit.display?.label?.value ?? "");
    if (!isExactOrFirstLast(title, person)) continue;
    const page = hit.concepturi || (hit.id ? `https://www.wikidata.org/wiki/${hit.id}` : "");
    if (!canonicalizeUrl(page)) continue;
    out.push({
      url: page,
      title: title || hit.id,
      outlet: "Wikidata",
      snippet: String(hit.description ?? ""),
      published: "",
      discovered_via: "links",
      link_hint: "wikidata",
    });
  }
  return out;
}

function isExactOrFirstLast(title, person) {
  const names = [person.name, ...(person.aliases ?? [])];
  return names.some((name) => normalizeName(title) === normalizeName(name) || firstLastOnly(title, name));
}

function firstLastOnly(title, name) {
  const hay = normalizeName(title);
  const tokens = normalizeName(name).split(" ").filter(Boolean);
  if (tokens.length < 2) return false;
  return hay.includes(tokens[0]) && hay.includes(tokens[tokens.length - 1]);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.json();
}
