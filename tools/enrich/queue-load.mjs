import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  QUEUE_DIR,
  canonicalizeUrl,
  markCollector,
  parseArgs,
  readState,
  serviceClient,
  writeState,
} from "./lib.mjs";

const args = parseArgs();
const supabase = serviceClient();
const state = readState();

if (!existsSync(QUEUE_DIR)) {
  console.error("No .enrich/queue directory. Run collectors first.");
  process.exit(1);
}

const files = readdirSync(QUEUE_DIR).filter((name) => name.endsWith(".json"));
let loaded = 0;
let merged = 0;

for (const file of files) {
  const payload = JSON.parse(readFileSync(path.join(QUEUE_DIR, file), "utf8"));
  const personId = payload.person_id || file.replace(/\.json$/, "");
  if (args.ids.length && !args.ids.includes(personId)) continue;
  if (args.wave && payload.wave && payload.wave !== args.wave) continue;
  const cleanStr = (s) =>
    typeof s === "string"
      ? s
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
          .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
      : s;
  const cleanRow = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, cleanStr(v)]));
  const candidates = (payload.candidates ?? [])
    .map((row) => ({ ...cleanRow(row), url: canonicalizeUrl(cleanStr(row.url)) }))
    .filter((row) => row.url);
  const { data: existing, error: readError } = await supabase
    .from("enrichment_queue")
    .select("queue_id, payload, status")
    .eq("person_id", personId)
    .maybeSingle();
  if (readError) throw readError;

  const prior = existing?.payload?.candidates ?? [];
  const seen = new Set(prior.map((row) => row.url));
  const combined = [...prior];
  for (const row of candidates) {
    if (seen.has(row.url)) continue;
    seen.add(row.url);
    combined.push(row);
  }
  const nextPayload = {
    ...(existing?.payload ?? {}),
    name: payload.name ?? existing?.payload?.name ?? "",
    missing: [...new Set([...(existing?.payload?.missing ?? []), ...(payload.missing ?? [])])],
    candidates: combined,
    collected_at: new Date().toISOString(),
  };
  const status = existing?.status === "processing" ? "processing" : "pending";
  const { error } = await supabase.from("enrichment_queue").upsert(
    {
      person_id: personId,
      wave: payload.wave || args.wave || 1,
      payload: nextPayload,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "person_id" },
  );
  if (error) {
    console.log(`ERR ${personId}: ${error.message} (skipped, load continues)`);
    continue;
  }
  markCollector(state, personId, "queued", {
    queued: true,
    candidates: combined.length,
    wave: payload.wave || args.wave || 1,
  });
  loaded += 1;
  merged += combined.length;
  console.log(`${personId} queued ${combined.length} candidates`);
}

writeState(state);
console.log(`queue-load rows=${loaded} candidates=${merged}`);
