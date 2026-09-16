export const USER_AGENT = "UAPBrief/1.0 (+https://coeus.institute; news ingest)";

export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const len = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length === bBytes.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

export function requireSchedulerSecret(req: Request): Response | null {
  const expected = Deno.env.get("UAP_SCHEDULER_SECRET") ?? "";
  const header = req.headers.get("x-uap-scheduler-secret") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ok =
    (expected.length > 0 && timingSafeEqual(header, expected)) ||
    (service.length > 0 && bearer.length > 0 && timingSafeEqual(bearer, service));
  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-uap-scheduler-secret",
};
