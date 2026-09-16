import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret, USER_AGENT } from "../_shared/schedulerAuth.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";
import { matchesPersonRecord, normalizeName } from "../_shared/normalize.ts";

const WORKER = "enrich-x";
const LOOKUP_CAP = 40;

type PersonRow = { person_id: string; name: string; aliases: string[] | null };
type AccountRow = {
  x_handle: string;
  x_user_id: string | null;
  ref_type: string | null;
  ref_id: string | null;
  followers: number | null;
};
type XUser = {
  id: string;
  name: string;
  username: string;
  verified?: boolean;
  public_metrics?: { followers_count?: number };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const token = Deno.env.get("X_BEARER_TOKEN") ?? "";
  if (!token) return jsonResponse({ ok: false, error: "X_BEARER_TOKEN is not set" }, 500, corsHeaders);

  let personIds: string[] | null = null;
  try {
    const body = await req.json();
    if (Array.isArray(body?.person_ids)) personIds = body.person_ids.map(String);
  } catch {
    personIds = null;
  }

  const supabase = serviceClient();
  const runId = await openRun(supabase, WORKER);
  const counts = { lookups: 0, upserted: 0, skipped_weak: 0, cost_estimate_usd: 0 };
  const errors: unknown[] = [];

  try {
    const { data: peopleData, error: peopleError } = personIds
      ? await supabase.from("people").select("person_id,name,aliases").in("person_id", personIds)
      : await supabase.from("people").select("person_id,name,aliases");
    if (peopleError) throw peopleError;
    const people = (peopleData ?? []) as PersonRow[];
    const peopleById = new Map(people.map((row) => [row.person_id, row]));

    const { data: accounts } = await supabase
      .from("x_accounts")
      .select("x_handle,x_user_id,ref_type,ref_id,followers");
    const accountRows = (accounts ?? []) as AccountRow[];
    const havePerson = new Set(
      accountRows.filter((row) => row.ref_type === "person" && row.ref_id).map((row) => row.ref_id as string),
    );

    const candidates = await collectHandleCandidates(supabase, people);
    const jobs: Array<{ kind: "username" | "search"; person: PersonRow; handle?: string }> = [];

    for (const candidate of candidates) {
      if (jobs.length >= LOOKUP_CAP) break;
      jobs.push({ kind: "username", person: candidate.person, handle: candidate.handle });
    }
    for (const person of people) {
      if (jobs.length >= LOOKUP_CAP) break;
      if (havePerson.has(person.person_id)) continue;
      if (candidates.some((row) => row.person.person_id === person.person_id)) continue;
      jobs.push({ kind: "search", person });
    }
    for (const account of accountRows) {
      if (jobs.length >= LOOKUP_CAP) break;
      if (account.followers != null && account.x_user_id) continue;
      const person = account.ref_type === "person" && account.ref_id ? peopleById.get(account.ref_id) : null;
      jobs.push({
        kind: "username",
        person: person ?? { person_id: account.ref_id ?? "", name: account.x_handle, aliases: [] },
        handle: account.x_handle,
      });
    }

    const seenHandle = new Set<string>();
    for (const job of jobs) {
      if (counts.lookups >= LOOKUP_CAP) break;
      try {
        if (job.kind === "username" && job.handle) {
          const handle = job.handle.replace(/^@/, "");
          if (!handle || seenHandle.has(handle.toLowerCase())) continue;
          seenHandle.add(handle.toLowerCase());
          counts.lookups += 1;
          const user = await lookupUsername(handle, token);
          if (!user) continue;
          if (job.person.person_id && !strongMatch(user, job.person)) {
            counts.skipped_weak += 1;
            continue;
          }
          if (await upsertAccount(supabase, user, job.person.person_id || null)) counts.upserted += 1;
        } else {
          counts.lookups += 1;
          const user = await searchUser(job.person, token);
          if (!user) continue;
          if (!strongMatch(user, job.person)) {
            counts.skipped_weak += 1;
            continue;
          }
          if (await upsertAccount(supabase, user, job.person.person_id)) counts.upserted += 1;
        }
      } catch (cause) {
        errors.push({
          person_id: job.person.person_id,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }

    counts.cost_estimate_usd = 0;
    await closeRun(supabase, runId, { ...counts, x_lookups: counts.lookups }, errors);
    return jsonResponse({ ok: true, ...counts, errors }, 200, corsHeaders);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, counts, errors);
    return jsonResponse({ ok: false, error: message, ...counts }, 500, corsHeaders);
  }
});

async function collectHandleCandidates(supabase: ReturnType<typeof serviceClient>, people: PersonRow[]) {
  const byId = new Map(people.map((row) => [row.person_id, row]));
  const out: Array<{ person: PersonRow; handle: string }> = [];
  const { data: links } = await supabase.from("person_links").select("person_id,url,link_type").in("link_type", ["x", "other"]);
  for (const row of links ?? []) {
    const person = byId.get(String(row.person_id));
    const handle = handleFromUrl(String(row.url ?? ""));
    if (person && handle) out.push({ person, handle });
  }
  const { data: queue } = await supabase.from("enrichment_queue").select("person_id,payload");
  for (const row of queue ?? []) {
    const person = byId.get(String(row.person_id));
    if (!person) continue;
    for (const candidate of (row.payload?.candidates ?? []) as Array<{ url?: string }>) {
      const handle = handleFromUrl(candidate.url ?? "");
      if (handle) out.push({ person, handle });
    }
  }
  const seen = new Set<string>();
  return out.filter((row) => {
    const key = `${row.person.person_id}:${row.handle.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function handleFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "x.com" && host !== "twitter.com") return null;
    const part = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!part || ["i", "home", "search", "intent", "share", "status"].includes(part.toLowerCase())) return null;
    if (part.startsWith("intent")) return null;
    return part.replace(/^@/, "");
  } catch {
    return null;
  }
}

function strongMatch(user: XUser, person: PersonRow): boolean {
  const hay = `${user.name} ${user.username}`;
  if (matchesPersonRecord(hay, person.name, person.aliases ?? [])) return true;
  const personTokens = normalizeName(person.name).split(" ").filter(Boolean);
  if (personTokens.length < 2) return false;
  const userTokens = normalizeName(user.name).split(" ").filter(Boolean);
  return userTokens.includes(personTokens[0]) && userTokens.includes(personTokens[personTokens.length - 1]);
}

async function lookupUsername(handle: string, token: string): Promise<XUser | null> {
  const url = new URL(`https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}`);
  url.searchParams.set("user.fields", "public_metrics,verified,description,username,name");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`X user lookup ${response.status}`);
  const json = (await response.json()) as { data?: XUser };
  return json.data ?? null;
}

async function searchUser(person: PersonRow, token: string): Promise<XUser | null> {
  const url = new URL("https://api.x.com/2/users/search");
  url.searchParams.set("query", person.name);
  url.searchParams.set("user.fields", "public_metrics,verified,description,username,name");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
  });
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error(`X user search ${response.status}`);
  const json = (await response.json()) as { data?: XUser[] };
  const rows = json.data ?? [];
  return rows.find((row) => strongMatch(row, person)) ?? null;
}

async function upsertAccount(
  supabase: ReturnType<typeof serviceClient>,
  user: XUser,
  personId: string | null,
) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("x_accounts").upsert(
    {
      x_handle: user.username,
      x_user_id: user.id,
      ref_type: personId ? "person" : null,
      ref_id: personId,
      display_name: user.name,
      followers: user.public_metrics?.followers_count ?? null,
      verified: Boolean(user.verified),
      last_checked: today,
      source_url: `https://x.com/${user.username}`,
      found_via: "enrich-x",
    },
    { onConflict: "x_handle" },
  );
  return !error;
}
