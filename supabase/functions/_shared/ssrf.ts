const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"]);

function isPrivateIp(host: string): boolean {
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^127\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
}

function registrable(host: string): string {
  const parts = host.toLowerCase().split(".").filter(Boolean);
  if (parts.length >= 3 && parts[parts.length - 2] === "co") return parts.slice(-3).join(".");
  if (parts.length >= 2) return parts.slice(-2).join(".");
  return host.toLowerCase();
}

export function hostAllowedForSource(articleHost: string, siteHost: string): boolean {
  const host = articleHost.replace(/^www\./i, "").toLowerCase();
  const site = siteHost.replace(/^www\./i, "").toLowerCase();
  if (host === site) return true;
  if (host.endsWith(`.${site}`)) return true;
  return registrable(host) === registrable(site);
}

export function hostAllowedForFeed(feedHost: string, siteHost: string): boolean {
  if (hostAllowedForSource(feedHost, siteHost)) return true;
  const site = siteHost.replace(/^www\./i, "").toLowerCase();
  const feed = feedHost.replace(/^www\./i, "").toLowerCase();
  const siteIsPbs = site === "pbs.org" || site.endsWith(".pbs.org");
  const feedIsPbs = feed === "pbs.org" || feed.endsWith(".pbs.org");
  return siteIsPbs && feedIsPbs;
}

export function isBlockedHost(host: string): boolean {
  const value = host.replace(/^www\./i, "").toLowerCase();
  return BLOCKED_HOSTS.has(value) || isPrivateIp(value);
}

export function assertSafeUrl(raw: string, siteHost?: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (isBlockedHost(host)) throw new Error("Blocked host");
  if (siteHost && !hostAllowedForSource(host, siteHost)) {
    throw new Error(`Host ${host} is not allowed for source ${siteHost}`);
  }
  return url;
}

/** Image hosts are usually CDNs off the source host; only block scheme and private ranges. */
export function assertSafeImageUrl(raw: string): URL {
  return assertSafeUrl(raw);
}

export async function fetchFollowingRedirects(
  start: string,
  assertUrl: (raw: string) => URL,
  init: { headers?: HeadersInit; timeoutMs?: number },
  maxHops = 5,
): Promise<Response> {
  let current = assertUrl(start).toString();
  const timeoutMs = init.timeoutMs ?? 12000;
  for (let hop = 0; hop <= maxHops; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(current, {
        headers: init.headers,
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect without Location");
        current = assertUrl(new URL(location, current).toString()).toString();
        continue;
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects");
}
