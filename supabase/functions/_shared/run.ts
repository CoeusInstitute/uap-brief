import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function openRun(supabase: SupabaseClient, fn: string) {
  const { data, error } = await supabase
    .from("ingest_runs")
    .insert({ function: fn })
    .select("run_id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to open ingest run");
  return data.run_id as string;
}

export async function closeRun(
  supabase: SupabaseClient,
  runId: string,
  counts: Record<string, unknown>,
  errors: unknown[],
) {
  await supabase
    .from("ingest_runs")
    .update({
      finished_at: new Date().toISOString(),
      counts,
      errors,
    })
    .eq("run_id", runId);
}

export function jsonResponse(body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}
