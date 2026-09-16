import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { assertSafeImageUrl, fetchFollowingRedirects } from "./ssrf.ts";
import { USER_AGENT } from "./schedulerAuth.ts";

const BUCKET = "story-images";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg";
}

/** Copies a page's og:image into the public bucket. Returns the public URL, or null when nothing usable was fetched. */
export async function storeStoryImage(
  supabase: SupabaseClient,
  storyId: string,
  imageUrl: string,
): Promise<string | null> {
  let bytes: ArrayBuffer;
  let contentType = "image/jpeg";
  try {
    const response = await fetchFollowingRedirects(imageUrl, assertSafeImageUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
      timeoutMs: 10000,
    });
    if (!response.ok) return null;
    contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) return null;
    bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;
  } catch {
    return null;
  }

  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hashHex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const path = `${storyId}/${hashHex.slice(0, 16)}${extensionFor(contentType)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl ?? null;
}
