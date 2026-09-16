import { loadEnv, parseArgs } from "./lib.mjs";

loadEnv();
const args = parseArgs();
const name = process.argv[2];
if (!name || name.startsWith("--")) {
  console.error("Usage: node tools/enrich/invoke.mjs <enrich-dossier|enrich-x> [--ids UP-1,UP-2]");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://agrijbcilmymfsnkdpoh.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const scheduler = (process.env.UAP_SCHEDULER_SECRET ?? "").trim();
if (!key) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required.");
  process.exit(1);
}
if (!scheduler) {
  console.error("UAP_SCHEDULER_SECRET is required (set from Vault, do not commit).");
  process.exit(1);
}
const body = args.ids.length ? { person_ids: args.ids } : {};
const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
  "x-uap-scheduler-secret": scheduler,
  "Content-Type": "application/json",
};
const response = await fetch(`${url}/functions/v1/${name}`, {
  method: "POST",
  headers,
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(400000),
});
const text = await response.text();
console.log(response.status);
console.log(text.slice(0, 4000));
if (!response.ok) process.exit(1);
