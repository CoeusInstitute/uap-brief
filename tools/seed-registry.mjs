/**
 * Import dataset/*.csv into hosted Supabase using the service role.
 * Usage (from repo root):
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 * Never pass the service role to Next public env.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://agrijbcilmymfsnkdpoh.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required. Refusing to run.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const datasetDir = path.join(process.cwd(), "dataset");

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsv(text) {
  const source = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift();
  if (!header) return [];
  return rows
    .filter((cells) => cells.some((cell) => cell.trim() !== ""))
    .map((cells) => {
      const record = {};
      header.forEach((name, index) => {
        record[name] = cells[index] ?? "";
      });
      return record;
    });
}

function pipes(value) {
  if (!value?.trim()) return [];
  return value.split("|").map((part) => part.trim()).filter(Boolean);
}

function emptyToNull(value) {
  return value?.trim() ? value : null;
}

function normalizeAlias(value) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function parseBoolean(value) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

async function readCsv(name) {
  return parseCsv(await readFile(path.join(datasetDir, name), "utf8"));
}

async function upsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      throw new Error(`${table} batch ${i}: ${error.message}`);
    }
    console.log(`${table}: ${Math.min(i + batch.length, rows.length)} / ${rows.length}`);
  }
}

const people = (await readCsv("people.csv")).map((row) => ({
  person_id: row.person_id,
  name: row.name,
  aliases: pipes(row.aliases),
  birth_date: emptyToNull(row.birth_date),
  death_date: emptyToNull(row.death_date),
  status: emptyToNull(row.status),
  primary_role: emptyToNull(row.primary_role),
  role_tags: pipes(row.role_tags),
  prominence_tier: emptyToNull(row.prominence_tier),
  country_or_region: emptyToNull(row.country_or_region),
  activity_period: emptyToNull(row.activity_period),
  first_uap_activity_year: emptyToNull(row.first_uap_activity_year),
  last_uap_activity_year: emptyToNull(row.last_uap_activity_year),
  key_event_dates: pipes(row.key_event_dates),
  affiliations: pipes(row.affiliations),
  positions_or_titles: emptyToNull(row.positions_or_titles),
  works_or_platforms: pipes(row.works_or_platforms),
  stance_category: emptyToNull(row.stance_category),
  stance_seed: emptyToNull(row.stance_seed),
  position_statement_summary: emptyToNull(row.position_statement_summary),
  key_claims_or_contributions: emptyToNull(row.key_claims_or_contributions),
  evidence_basis: pipes(row.evidence_basis),
  claim_status: emptyToNull(row.claim_status),
  seed_claim_status: emptyToNull(row.seed_claim_status),
  record_confidence: emptyToNull(row.record_confidence),
  seed_confidence: emptyToNull(row.seed_confidence),
  controversies_or_counterpoints: emptyToNull(row.controversies_or_counterpoints),
  first_public_date: emptyToNull(row.first_public_date),
  associated_podcast_ids: pipes(row.associated_podcast_ids),
  source_1_title: emptyToNull(row.source_1_title),
  source_1_url: emptyToNull(row.source_1_url),
  source_1_type: emptyToNull(row.source_1_type),
  source_2_title: emptyToNull(row.source_2_title),
  source_2_url: emptyToNull(row.source_2_url),
  source_2_type: emptyToNull(row.source_2_type),
  source_count: row.source_count ? Number(row.source_count) : null,
  data_sources: emptyToNull(row.data_sources),
  census_id: emptyToNull(row.census_id),
  seed_id: emptyToNull(row.seed_id),
  merge_note: emptyToNull(row.merge_note),
  last_verified: emptyToNull(row.last_verified),
  date_precision_notes: emptyToNull(row.date_precision_notes),
  research_notes: emptyToNull(row.research_notes),
}));

const podcasts = (await readCsv("podcasts.csv")).map((row) => ({
  podcast_id: row.podcast_id,
  podcast_name: row.podcast_name,
  aliases: pipes(row.aliases),
  host_names: pipes(row.host_names),
  network_producer: emptyToNull(row.network_producer),
  country: emptyToNull(row.country),
  launch_date: emptyToNull(row.launch_date),
  date_precision: emptyToNull(row.date_precision),
  status: emptyToNull(row.status),
  cadence: emptyToNull(row.cadence),
  avg_length_min: emptyToNull(row.avg_length_min),
  focus_tags: pipes(row.focus_tags),
  reach_tier: emptyToNull(row.reach_tier),
  category: emptyToNull(row.category),
  primary_url: emptyToNull(row.primary_url),
  feed_url: emptyToNull(row.feed_url),
  apple_lookup: emptyToNull(row.apple_lookup),
  youtube_url: emptyToNull(row.youtube_url),
  feed_discovery_status: emptyToNull(row.feed_discovery_status),
  notable_recurring_guests: pipes(row.notable_recurring_guests),
  notes: emptyToNull(row.notes),
  confidence: emptyToNull(row.confidence),
  last_verified: emptyToNull(row.last_verified),
}));

const organizations = (await readCsv("organizations.csv")).map((row) => ({
  org_id: row.org_id,
  org_name: row.org_name,
  aliases: pipes(row.aliases),
  org_type: emptyToNull(row.org_type),
  country: emptyToNull(row.country),
  founded_date: emptyToNull(row.founded_date),
  date_precision: emptyToNull(row.date_precision),
  dissolved_date: emptyToNull(row.dissolved_date),
  status: emptyToNull(row.status),
  key_people: pipes(row.key_people),
  role_in_discourse: emptyToNull(row.role_in_discourse),
  url: emptyToNull(row.url),
  confidence: emptyToNull(row.confidence),
}));

const appearances = (await readCsv("appearances.csv")).map((row) => ({
  appearance_id: row.appearance_id,
  person_id: row.person_id,
  person_name: emptyToNull(row.person_name),
  podcast_id: row.podcast_id,
  podcast_name: emptyToNull(row.podcast_name),
  role: emptyToNull(row.role),
  episode_title: emptyToNull(row.episode_title),
  episode_date: emptyToNull(row.episode_date),
  date_precision: emptyToNull(row.date_precision),
  topic_tags: pipes(row.topic_tags),
  source_url: emptyToNull(row.source_url),
  confidence: emptyToNull(row.confidence),
  provenance: emptyToNull(row.provenance),
}));

const timeline = (await readCsv("timeline.csv")).map((row) => ({
  record_id: row.record_id,
  record_type: row.record_type,
  category: emptyToNull(row.category),
  date: emptyToNull(row.date),
  date_precision: emptyToNull(row.date_precision),
  title: row.title,
  actors: emptyToNull(row.actors),
  person_id: emptyToNull(row.person_id),
  venue: emptyToNull(row.venue),
  summary: emptyToNull(row.summary),
  significance: emptyToNull(row.significance),
  claim_status: emptyToNull(row.claim_status),
  topic_tags: pipes(row.topic_tags),
  source_url: emptyToNull(row.source_url),
  confidence: emptyToNull(row.confidence),
  provenance: emptyToNull(row.provenance),
}));

const xAccounts = (await readCsv("x_accounts.csv")).map((row) => ({
  x_handle: row.x_handle,
  x_user_id: emptyToNull(row.x_user_id),
  ref_type: emptyToNull(row.ref_type),
  ref_id: emptyToNull(row.ref_id),
  display_name: emptyToNull(row.display_name),
  followers: row.followers ? Number(row.followers) : null,
  followers_note: emptyToNull(row.followers_note),
  verified: parseBoolean(row.verified),
  last_checked: emptyToNull(row.last_checked),
  source_url: emptyToNull(row.source_url),
  found_via: emptyToNull(row.found_via),
  all_refs: emptyToNull(row.all_refs),
}));

const personAliasOwner = new Map();
const personAliases = [];
const personCollisions = [];
for (const person of people) {
  for (const alias of [person.name, ...person.aliases]) {
    const normalized = normalizeAlias(alias);
    if (!normalized) continue;
    const existing = personAliasOwner.get(normalized);
    if (existing && existing !== person.person_id) {
      personCollisions.push({ alias: normalized, a: existing, b: person.person_id });
      console.warn(`person alias collision: "${normalized}" ${existing} / ${person.person_id}`);
    } else {
      personAliasOwner.set(normalized, person.person_id);
    }
    personAliases.push({ normalized_alias: normalized, person_id: person.person_id });
  }
}

const uniquePersonAliases = [
  ...new Map(personAliases.map((row) => [`${row.normalized_alias}|${row.person_id}`, row])).values(),
];

const orgAliases = [];
for (const org of organizations) {
  for (const alias of [org.org_name, ...org.aliases]) {
    const normalized = normalizeAlias(alias);
    if (!normalized) continue;
    orgAliases.push({ normalized_alias: normalized, org_id: org.org_id });
  }
}
const uniqueOrgAliases = [
  ...new Map(orgAliases.map((row) => [`${row.normalized_alias}|${row.org_id}`, row])).values(),
];

const collisionCandidates = personCollisions.map((collision) => ({
  raw_name: collision.alias,
  normalized_name: collision.alias,
  seen_in_type: "seed_alias",
  seen_in_id: `${collision.a}|${collision.b}`,
  status: "open",
  suggested_person_id: collision.a,
  notes: `Shared normalized alias between ${collision.a} and ${collision.b}`,
}));

await upsert("people", people, "person_id");
await upsert("podcasts", podcasts, "podcast_id");
await upsert("organizations", organizations, "org_id");
await upsert("appearances", appearances, "appearance_id");
await upsert("timeline", timeline, "record_id");
await upsert("person_aliases", uniquePersonAliases, "normalized_alias,person_id");
await upsert("org_aliases", uniqueOrgAliases, "normalized_alias,org_id");
await upsert("x_accounts", xAccounts, "x_handle");

if (collisionCandidates.length > 0) {
  const { error } = await supabase.from("entity_match_candidates").insert(collisionCandidates);
  if (error) {
    throw new Error(`entity_match_candidates: ${error.message}`);
  }
}

console.log(
  JSON.stringify(
    {
      people: people.length,
      podcasts: podcasts.length,
      organizations: organizations.length,
      appearances: appearances.length,
      timeline: timeline.length,
      person_aliases: uniquePersonAliases.length,
      org_aliases: uniqueOrgAliases.length,
      x_accounts: xAccounts.length,
      alias_collisions: personCollisions.length,
      collision_candidates: collisionCandidates.length,
    },
    null,
    2,
  ),
);
console.log("Seed complete.");
