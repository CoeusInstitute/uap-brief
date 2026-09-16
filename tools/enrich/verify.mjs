import { existsSync, readFileSync } from "node:fs";
import {
  MAINSTREAM_DOMAINS,
  STATE_PATH,
  USER_AGENT,
  fail,
  hostnameOf,
  parseArgs,
  pass,
  readState,
  serviceClient,
} from "./lib.mjs";

const args = parseArgs();
const supabase = serviceClient();
const gate = args.gate;

if (!gate) {
  console.error("Usage: node tools/enrich/verify.mjs --gate coverage1|core5|named|noempty|edges|outlets|state");
  process.exit(1);
}

if (gate === "coverage1") await coverage1();
else if (gate === "core5") await core5();
else if (gate === "named") await named();
else if (gate === "noempty") await noempty();
else if (gate === "edges") await edges();
else if (gate === "outlets") await outlets();
else if (gate === "state") await stateGate();
else {
  console.error(`Unknown gate ${gate}`);
  process.exit(1);
}

async function coverage1() {
  const { count: people, error: peopleError } = await supabase
    .from("people")
    .select("person_id", { count: "exact", head: true });
  if (peopleError) throw peopleError;
  const sourced = new Set(await selectAll("person_sources", "person_id"));
  const missing = (people ?? 0) - sourced.size;
  const token = "coverage1";
  if (missing === 0) pass(`${token} every person has >=1 person_sources row (${sourced.size}/${people})`);
  else fail(`${token} ${missing} people have no person_sources (${sourced.size}/${people})`);
}

async function core5() {
  const { data: core, error } = await supabase.from("people").select("person_id").eq("prominence_tier", "1_core");
  if (error) throw error;
  const ids = (core ?? []).map((row) => row.person_id);
  const sourceIds = await selectAll("person_sources", "person_id", ids);
  const counts = new Map();
  for (const id of sourceIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const short = ids.filter((id) => (counts.get(id) ?? 0) < 5);
  if (short.length === 0) pass(`core5 ${ids.length} 1_core people have >=5 sources`);
  else fail(`core5 ${short.length}/${ids.length} 1_core people have <5 sources`);
}

async function named() {
  const michaiEdges = await countQuery("appearances", (q) =>
    q.select("appearance_id, source_url, podcast_id").eq("person_id", "UP-0507").eq("podcast_id", "POD-010"),
  );
  const withUrl = (michaiEdges ?? []).filter((row) => /^https?:\/\//i.test(row.source_url ?? ""));
  const studies = await hasText(["UP-0507"], /uap studies/i);
  const wondRow = await hasText(["UP-0507"], /wond/i);
  const state = readState();
  const wondUnknown = (state.people?.["UP-0507"]?.missing ?? []).includes("WOND radio");
  const nolan = await personSourceCount("UP-0060");
  const coulthart = await personSourceCount("UP-0167");
  const nolanMain = await hasMainstream("UP-0060");
  const coulthartMain = await hasMainstream("UP-0167");
  const ok =
    withUrl.length >= 3 &&
    studies &&
    (wondRow || wondUnknown) &&
    nolan.count >= 10 &&
    coulthart.count >= 10 &&
    nolanMain &&
    coulthartMain;
  const detail = [
    `Michai Project Unity edges with URL=${withUrl.length}`,
    `UAP Studies=${studies}`,
    `WOND=${wondRow || (wondUnknown ? "unknown" : "missing")}`,
    `Nolan sources=${nolan.count} mainstream=${nolanMain}`,
    `Coulthart sources=${coulthart.count} mainstream=${coulthartMain}`,
  ].join("; ");
  if (ok) pass(`named ${detail}`);
  else fail(`named ${detail}`);
}

async function noempty() {
  const rows = await selectAllRows("person_sources", "url");
  const empty = rows.filter((row) => !/^https?:\/\//i.test(row.url ?? "")).length;
  const sample = shuffle(rows.map((row) => row.url).filter(Boolean)).slice(0, 10);
  let resolved = 0;
  const failures = [];
  for (const url of sample) {
    const ok = await urlResolves(url);
    if (ok) resolved += 1;
    else failures.push(url);
  }
  const sampleOk = sample.length === 0 || resolved >= Math.ceil(sample.length * 0.5);
  if (empty === 0 && sampleOk) {
    pass(`noempty empty=${empty} sampled ${resolved}/${sample.length} resolve`);
  } else {
    fail(`noempty empty=${empty} sampled ${resolved}/${sample.length} resolve ${failures.slice(0, 3).join(" ")}`);
  }
}

async function edges() {
  const { count, error } = await supabase.from("appearances").select("appearance_id", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) >= 300) pass(`edges appearances=${count}`);
  else fail(`edges appearances=${count} (need >= 300)`);
}

async function outlets() {
  const rows = await selectAllRows("person_sources", "domain,url");
  const domains = new Set(
    rows
      .map((row) => (row.domain || hostnameOf(row.url)).replace(/^www\./, "").toLowerCase())
      .filter(Boolean),
  );
  const hit = MAINSTREAM_DOMAINS.some((domain) => domains.has(domain));
  if (domains.size >= 25 && hit) pass(`outlets domains=${domains.size} mainstream_hit=${hit}`);
  else fail(`outlets domains=${domains.size} mainstream_hit=${hit} (need >=25 and one of ${MAINSTREAM_DOMAINS.join(",")})`);
}

async function stateGate() {
  if (!existsSync(STATE_PATH)) {
    fail("state missing .enrich/state.json");
    return;
  }
  const state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  const people = Object.entries(state.people ?? {});
  const processed = people.filter(([, row]) => row.youtube === "done" || row.web === "done" || row.links === "done" || row.queued || row.enriched);
  const missingIds = processed.filter(([id]) => !id.startsWith("UP-"));
  const skipCheck = processed.find(([, row]) => row.youtube === "done");
  const skipOk = Boolean(skipCheck);
  if (processed.length > 0 && missingIds.length === 0 && skipOk) {
    pass(`state processed=${processed.length} resumable skip markers present`);
  } else {
    fail(`state processed=${processed.length} invalid=${missingIds.length} skip_marker=${skipOk}`);
  }
}

async function countQuery(table, build) {
  const { data, error } = await build(supabase.from(table));
  if (error) throw error;
  return data ?? [];
}

async function personSourceCount(personId) {
  const { data, error } = await supabase.from("person_sources").select("url, domain, source_type, outlet, title").eq("person_id", personId);
  if (error) throw error;
  return { count: (data ?? []).length, rows: data ?? [] };
}

async function hasMainstream(personId) {
  const { rows } = await personSourceCount(personId);
  return rows.some((row) => {
    const domain = (row.domain || hostnameOf(row.url)).replace(/^www\./, "").toLowerCase();
    return row.source_type === "mainstream_press" || MAINSTREAM_DOMAINS.includes(domain);
  });
}

async function hasText(personIds, pattern) {
  const { data, error } = await supabase
    .from("person_sources")
    .select("title, outlet, notes, url")
    .in("person_id", personIds);
  if (error) throw error;
  return (data ?? []).some((row) => pattern.test(`${row.title} ${row.outlet} ${row.notes} ${row.url}`));
}

async function urlResolves(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(12000),
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function selectAllRows(table, columns, ids) {
  const rows = [];
  let from = 0;
  for (; ;) {
    let query = supabase.from(table).select(columns).range(from, from + 999);
    if (ids?.length) query = query.in("person_id", ids);
    const { data, error } = await query;
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function selectAll(table, column, ids) {
  return (await selectAllRows(table, column, ids)).map((row) => row[column]);
}
