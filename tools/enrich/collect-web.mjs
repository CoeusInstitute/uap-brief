import {
  canonicalizeUrl,
  loadPeople,
  markCollector,
  matchesPerson,
  parseArgs,
  personIdsForWave,
  readState,
  runMcporterExa,
  serviceClient,
  shouldSkipPerson,
  sleep,
  writeQueue,
  writeState,
} from "./lib.mjs";

const OUTLET_PROBES = ["NewsNation", "The Debrief", "Space.com"];
const args = parseArgs();
const supabase = serviceClient();
const ids = await personIdsForWave(supabase, args.wave || 1, args.ids);
const people = await loadPeople(supabase, ids);
const state = readState();
let collected = 0;
let skipped = 0;
let drops = 0;

for (const person of people) {
  if (shouldSkipPerson(state, person.person_id, "web", args.force)) {
    skipped += 1;
    if (args.dryRun) console.log(`SKIP ${person.person_id} web`);
    continue;
  }
  if (args.dryRun) {
    console.log(`FETCH ${person.person_id} web`);
    continue;
  }
  const queries = [
    `${person.name} UAP`,
    `${person.name} interview`,
    ...OUTLET_PROBES.map((outlet) => `${person.name} ${outlet}`),
  ];
  if (person.person_id === "UP-0507") queries.push("Michai Morin WOND radio");
  const found = [];
  let localDrops = 0;
  let queryErrors = 0;
  for (const query of queries) {
    let rows = [];
    try {
      rows = await runMcporterExa(
        query,
        `Find interviews, news coverage, radio/TV appearances, and profiles that name ${person.name}. Exclude unrelated people with similar names.`,
      );
    } catch (error) {
      queryErrors += 1;
      console.error(`${person.person_id} exa ${query}: ${error instanceof Error ? error.message : error}`);
      await sleep(1500);
      continue;
    }
    for (const row of rows) {
      const url = canonicalizeUrl(row.url);
      if (!url) continue;
      const text = `${row.title} ${row.snippet} ${row.outlet}`;
      if (!matchesPerson(text, person) && !matchesPerson(url, person)) {
        localDrops += 1;
        continue;
      }
      found.push({
        url,
        title: row.title ?? "",
        outlet: row.outlet ?? "",
        snippet: String(row.snippet ?? "").slice(0, 800),
        published: row.published ?? "",
        discovered_via: "web_trace",
      });
    }
    await sleep(1500);
  }
  const missing = [];
  if (person.person_id === "UP-0507") {
    const hasWond = found.some((row) => /wond/i.test(`${row.title} ${row.outlet} ${row.snippet} ${row.url}`));
    if (!hasWond && queryErrors < queries.length) missing.push("WOND radio");
  }
  writeQueue(person.person_id, {
    name: person.name,
    wave: args.wave || 1,
    candidates: found,
    missing,
  });
  drops += localDrops;
  if (queryErrors === queries.length) {
    console.log(`${person.person_id} web failed all queries; not marking done`);
    continue;
  }
  markCollector(state, person.person_id, "web", {
    wave: args.wave || 1,
    name: person.name,
    web_candidates: found.length,
    web_drops: localDrops,
    missing,
  });
  collected += 1;
  console.log(`${person.person_id} web ${found.length} kept, ${localDrops} dropped`);
}

writeState(state);
console.log(`web collected=${collected} skipped=${skipped} drops=${drops}`);
