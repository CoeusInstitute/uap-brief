import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireSchedulerSecret, USER_AGENT } from "../_shared/schedulerAuth.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { closeRun, jsonResponse, openRun } from "../_shared/run.ts";

type AccountRow = {
  x_handle: string;
  x_user_id: string | null;
  ref_type: string | null;
  ref_id: string | null;
  followers: number | null;
};

const FOLLOWER_FLOOR = 20_000;
const ACCOUNT_CAP = 15;
const TWEET_CAP = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = requireSchedulerSecret(req);
  if (denied) return denied;

  const token = Deno.env.get("X_BEARER_TOKEN") ?? "";
  if (!token) {
    return jsonResponse({ ok: false, error: "X_BEARER_TOKEN is not set" }, 500, corsHeaders);
  }

  const supabase = serviceClient();
  const runId = await openRun(supabase, "ingest-x");
  let inserted = 0;
  let skippedUnknown = 0;
  let skippedFloor = 0;
  const errors: unknown[] = [];

  try {
    const { data: accounts, error } = await supabase
      .from("x_accounts")
      .select("x_handle,x_user_id,ref_type,ref_id,followers")
      .order("followers", { ascending: false, nullsFirst: false });
    if (error) throw error;

    const watch: AccountRow[] = [];
    for (const row of (accounts ?? []) as AccountRow[]) {
      if (row.followers == null) {
        skippedUnknown += 1;
        continue;
      }
      if (row.followers < FOLLOWER_FLOOR) {
        skippedFloor += 1;
        continue;
      }
      watch.push(row);
      if (watch.length >= ACCOUNT_CAP) break;
    }

    for (const account of watch) {
      try {
        const userId = account.x_user_id || (await lookupUserId(account.x_handle, token));
        if (!userId) throw new Error("User id not found");
        if (!account.x_user_id) {
          await supabase.from("x_accounts").update({ x_user_id: userId }).eq("x_handle", account.x_handle);
        }
        const tweets = await listTweets(userId, token);
        const personId = account.ref_type === "person" ? account.ref_id : null;
        for (const tweet of tweets) {
          const { error: insertError } = await supabase.from("x_posts").upsert({
            post_id: tweet.id,
            handle: account.x_handle,
            person_id: personId,
            posted_at: tweet.created_at,
            url: `https://x.com/${account.x_handle.replace(/^@/, "")}/status/${tweet.id}`,
            text: tweet.text,
            engagement: tweet.public_metrics ?? {},
          });
          if (!insertError) inserted += 1;
        }
      } catch (cause) {
        errors.push({
          handle: account.x_handle,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }

    await closeRun(
      supabase,
      runId,
      { inserted, watched: watch.length, skipped_unknown: skippedUnknown, skipped_floor: skippedFloor },
      errors,
    );
    return jsonResponse(
      {
        ok: true,
        inserted,
        watched: watch.length,
        skipped_unknown: skippedUnknown,
        skipped_floor: skippedFloor,
        errors,
      },
      200,
      corsHeaders,
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    errors.push({ error: message });
    await closeRun(supabase, runId, { inserted, skipped_unknown: skippedUnknown, skipped_floor: skippedFloor }, errors);
    return jsonResponse({ ok: false, error: message }, 500, corsHeaders);
  }
});

async function lookupUserId(handle: string, token: string): Promise<string | null> {
  const username = handle.replace(/^@/, "");
  const response = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`X user lookup ${response.status}`);
  const json = (await response.json()) as { data?: { id?: string } };
  return json.data?.id ?? null;
}

async function listTweets(
  userId: string,
  token: string,
): Promise<Array<{ id: string; text: string; created_at?: string; public_metrics?: Record<string, unknown> }>> {
  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
  url.searchParams.set("max_results", String(TWEET_CAP));
  url.searchParams.set("tweet.fields", "created_at,public_metrics");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`X tweets ${response.status}`);
  const json = (await response.json()) as {
    data?: Array<{ id: string; text: string; created_at?: string; public_metrics?: Record<string, unknown> }>;
  };
  return json.data ?? [];
}
