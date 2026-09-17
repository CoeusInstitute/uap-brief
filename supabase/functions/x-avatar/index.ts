import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret } from "../_shared/schedulerAuth.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";

const WORKER = "x-avatar";
const CAP = 100;

// Returns profile_image_url (400x400) for a list of handles via the official X API.
// Cost: $0.010 per user lookup (pay-per-use, same as enrich-x).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const token = Deno.env.get("X_BEARER_TOKEN") ?? "";
  if (!token) return jsonResponse({ ok: false, error: "X_BEARER_TOKEN is not set" }, 500, corsHeaders);

  let handles: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.handles)) {
      handles = body.handles.map((h: unknown) => String(h).replace(/^@/, "").trim()).filter(Boolean).slice(0, CAP);
    }
  } catch {
    handles = [];
  }
  if (handles.length === 0) return jsonResponse({ ok: false, error: "no handles" }, 400, corsHeaders);

  const supabase = serviceClient();
  const runId = await openRun(supabase, WORKER);
  const counts = { lookups: 0, cost_estimate_usd: 0 };
  const errors: unknown[] = [];

  try {
    const url = new URL("https://api.x.com/2/users/by");
    url.searchParams.set("usernames", handles.join(","));
    url.searchParams.set("user.fields", "profile_image_url,name,username,verified");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      await closeRun(supabase, runId, counts, errors);
      return jsonResponse({ ok: false, status: res.status, error: text.slice(0, 400) }, 502, corsHeaders);
    }
    const data = await res.json();
    const users = (data?.data ?? []) as Array<{
      id: string; name: string; username: string; verified?: boolean; profile_image_url?: string;
    }>;
    counts.lookups = users.length;
    counts.cost_estimate_usd = Number((users.length * 0.01).toFixed(4));
    await closeRun(supabase, runId, counts, errors);
    return jsonResponse({
      ok: true,
      results: users.map((u) => ({
        username: u.username,
        id: u.id,
        name: u.name,
        verified: !!u.verified,
        image_url: (u.profile_image_url ?? "").replace("_normal", "_400x400"),
      })),
      lookups: users.length,
    }, 200, corsHeaders);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, counts, errors);
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});
