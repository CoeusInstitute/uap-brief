/**
 * Shared helpers for tools/enrich collectors.
 * Env pattern mirrors tools/seed-registry.mjs, plus a local .env.local loader
 * so Wave runs work from the repo root without exporting secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const USER_AGENT = "UAPBrief/1.0 (+https://coeus.institute; news ingest)";
export const ENRICH_DIR = path.join(process.cwd(), ".enrich");
export const QUEUE_DIR = path.join(ENRICH_DIR, "queue");
export const STATE_PATH = path.join(ENRICH_DIR, "state.json");

export const WAVE_1_IDS = [
  "UP-0507",
  "UP-0060",
  "UP-0167",
  "UP-0036",
  "UP-0168",
  "UP-0042",
  "UP-0034",
  "UP-0033",
  "UP-0059",
  "UP-0099",
  "UP-0075",
  "UP-0019",
  "UP-0018",
];

export const MAINSTREAM_DOMAINS = [
  "newsnationnow.com",
  "nytimes.com",
  "washingtonpost.com",
  "cnn.com",
  "space.com",
];

export function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(process.cwd(), name);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
    }
  }
}

export function serviceClient() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://agrijbcilmymfsnkdpoh.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required. Refusing to run.");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { wave: 0, ids: [], gate: "", force: false, dryRun: false, person: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--wave" && next) {
      out.wave = Number(next);
      i += 1;
    } else if (arg === "--ids" && next) {
      out.ids = next.split(",").map((id) => id.trim()).filter(Boolean);
      i += 1;
    } else if (arg === "--gate" && next) {
      out.gate = next;
      i += 1;
    } else if (arg === "--person" && next) {
      out.person = next;
      i += 1;
    } else if (arg === "--force") {
      out.force = true;
    } else if (arg === "--dry-run") {
      out.dryRun = true;
    }
  }
  return out;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function firstLastMatch(haystack, name) {
  const hay = normalizeName(haystack);
  const tokens = normalizeName(name).split(" ").filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.length === 1) return hay.includes(tokens[0]);
  return hay.includes(tokens[0]) && hay.includes(tokens[tokens.length - 1]);
}

export function matchesPerson(haystack, person) {
  const aliases = Array.isArray(person.aliases) ? person.aliases : [];
  return [person.name, ...aliases].some((value) => value && firstLastMatch(haystack, value));
}

export function hostnameOf(raw) {
  try {
    return new URL(raw).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function canonicalizeUrl(raw) {
  try {
    const url = new URL(String(raw ?? "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.replace(/^www\./i, "").toLowerCase();
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ]);
    for (const key of [...url.searchParams.keys()]) {
      if (drop.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    const host = url.hostname;
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function ensureEnrichDirs() {
  mkdirSync(QUEUE_DIR, { recursive: true });
}

export function readState() {
  if (!existsSync(STATE_PATH)) return { people: {} };
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    if (!parsed.people || typeof parsed.people !== "object") return { people: {} };
    return parsed;
  } catch {
    return { people: {} };
  }
}

export function writeState(state) {
  ensureEnrichDirs();
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

export function queuePath(personId) {
  return path.join(QUEUE_DIR, `${personId}.json`);
}

export function readQueue(personId) {
  const file = queuePath(personId);
  if (!existsSync(file)) {
    return { person_id: personId, name: "", wave: 0, candidates: [], missing: [] };
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

export function mergeCandidates(existing, incoming) {
  const seen = new Set();
  const out = [];
  for (const row of [...(existing ?? []), ...(incoming ?? [])]) {
    const url = canonicalizeUrl(row.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ ...row, url });
  }
  return out;
}

export function writeQueue(personId, patch) {
  ensureEnrichDirs();
  const current = readQueue(personId);
  const next = {
    ...current,
    ...patch,
    person_id: personId,
    candidates: mergeCandidates(current.candidates, patch.candidates ?? []),
    missing: [...new Set([...(current.missing ?? []), ...(patch.missing ?? [])])],
  };
  writeFileSync(queuePath(personId), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function parseExaOutput(raw) {
  let text = String(raw ?? "");
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json.results)) {
      return json.results
        .map((row) => ({
          url: row.url ?? row.link ?? "",
          title: row.title ?? "",
          snippet: row.snippet ?? row.text ?? row.highlights ?? "",
          published: row.published ?? row.publishedDate ?? "",
          outlet: hostnameOf(row.url ?? row.link ?? ""),
        }))
        .filter((row) => canonicalizeUrl(row.url));
    }
    if (json.content?.[0]?.text) text = json.content[0].text;
  } catch {
    // fall through to block parser
  }
  const out = [];
  for (const block of text.split(/\n---\n/)) {
    const title = block.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const url = block.match(/^URL:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const published = block.match(/^Published:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const author = block.match(/^Author:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const highlights = block.split("Highlights:")[1]?.trim() ?? "";
    if (!canonicalizeUrl(url)) continue;
    out.push({
      url,
      title,
      snippet: highlights.slice(0, 800),
      published,
      outlet: author || hostnameOf(url),
    });
  }
  return out;
}

export async function personIdsForWave(supabase, wave, extraIds = []) {
  if (extraIds.length) return extraIds;
  if (wave === 1) return [...WAVE_1_IDS];
  const { data, error } = await supabase
    .from("people")
    .select("person_id, prominence_tier, source_1_url, source_2_url")
    .order("person_id");
  if (error) throw error;
  const rows = data ?? [];
  if (wave === 2) return rows.filter((row) => row.prominence_tier === "1_core").map((row) => row.person_id);
  if (wave === 3) return rows.filter((row) => row.prominence_tier === "2_major").map((row) => row.person_id);
  if (wave === 4) {
    const sourceless = rows.filter((row) => !row.source_1_url && !row.source_2_url).map((row) => row.person_id);
    const rest = rows
      .filter(
        (row) =>
          row.prominence_tier !== "1_core" &&
          row.prominence_tier !== "2_major" &&
          (row.source_1_url || row.source_2_url),
      )
      .map((row) => row.person_id);
    return [...sourceless, ...rest];
  }
  throw new Error(`Unknown wave ${wave}. Use --wave 1-4 or --ids.`);
}

export async function loadPeople(supabase, ids) {
  const { data, error } = await supabase
    .from("people")
    .select("person_id, name, aliases, primary_role, prominence_tier, associated_podcast_ids")
    .in("person_id", ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((row) => [row.person_id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export function shouldSkipPerson(state, personId, collector, force) {
  const row = state.people?.[personId] ?? {};
  if (force) return false;
  if (row.enriched === true) return true;
  if (collector && row[collector] === "done") return true;
  return false;
}

export function markCollector(state, personId, collector, extra = {}) {
  state.people[personId] = {
    ...(state.people[personId] ?? {}),
    ...extra,
    [collector]: "done",
    updated_at: new Date().toISOString(),
  };
}

export function mcporterBin() {
  return process.platform === "win32" ? "mcporter.cmd" : "mcporter";
}

export async function runMcporterExa(query, objective, numResults = 8) {
  const stdout = await new Promise((resolve, reject) => {
    const command = `mcporter call exa.web_search_exa --output json --timeout 45000 query=${psQuote(query)} num-results=${numResults} objective=${psQuote(objective)}`;
    const child =
      process.platform === "win32"
        ? spawn("powershell.exe", ["-NoProfile", "-Command", command], {
            windowsHide: true,
            env: { ...process.env, USER_AGENT },
          })
        : spawn(mcporterBin(), ["call", "exa.web_search_exa", "--output", "json", "--timeout", "45000", `query=${query}`, `num-results=${numResults}`, `objective=${objective}`], {
            windowsHide: true,
            env: { ...process.env, USER_AGENT },
          });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("mcporter timeout"));
    }, 60000);
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!out.trim()) reject(new Error(err.slice(0, 400) || `mcporter empty (${code})`));
      else resolve(out);
    });
  });
  return parseExaOutput(stdout);
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

export function pass(message) {
  console.log(`PASS ${message}`);
}
