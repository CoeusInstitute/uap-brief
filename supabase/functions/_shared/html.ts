const EXCERPT_CHROME =
  /skip to content|cookie (settings|policy)|privacy policy|terms of (use|service)|accept (all )?cookies|manage consent/i;

export function htmlToExcerpt(html: string, maxChars = 8000): string {
  const withoutChrome = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ");
  const scoped = withoutChrome.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i)?.[2] ?? withoutChrome;
  return scoped.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

export function excerptLooksUsable(excerpt: string): boolean {
  const cleaned = excerpt.replace(/\s+/g, " ").trim();
  return cleaned.length >= 280 && !EXCERPT_CHROME.test(cleaned);
}

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const attr = `(?:property|name)\\s*=\\s*["']${escaped}["']`;
    const content = `content\\s*=\\s*["']([^"']+)["']`;
    const patterns = [
      new RegExp(`<meta[^>]*${attr}[^>]*${content}`, "i"),
      new RegExp(`<meta[^>]*${content}[^>]*${attr}`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]?.trim()) return match[1].trim();
    }
  }
  return null;
}

/** Absolute og:image / twitter:image / image_src URL, or null when the page declares none. */
export function extractOgImage(html: string, base: string): string | null {
  const fromMeta = metaContent(html, ["og:image", "og:image:url", "og:image:secure_url", "twitter:image"]);
  const link = html.match(/<link[^>]*rel\s*=\s*["']image_src["'][^>]*href\s*=\s*["']([^"']+)["']/i)?.[1]?.trim();
  const candidate = fromMeta ?? link ?? null;
  if (!candidate) return null;
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

export function discoverFeedHref(html: string, base: string): string | null {
  const match = html.match(
    /<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i,
  ) ?? html.match(
    /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+rel=["'][^"']*alternate[^"']*["'][^>]+href=["']([^"']+)["']/i,
  );
  if (!match?.[1]) return null;
  try {
    return new URL(match[1], base).toString();
  } catch {
    return null;
  }
}
