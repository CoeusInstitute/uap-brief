import { XMLParser } from "npm:fast-xml-parser@4.5.1";
import { htmlToExcerpt } from "./html.ts";

export type RssItem = {
  title: string;
  link: string;
  publishedAt: string | null;
  excerpt: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, digits: string) => {
      const code = Number(digits);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as { "#text": unknown })["#text"] ?? "").trim();
  }
  return "";
}

function linkOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const alt =
      value.find((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const rel = String((entry as { "@_rel"?: string })["@_rel"] ?? "");
        return rel === "alternate" || rel === "";
      }) ?? value[0];
    return linkOf(alt);
  }
  if (value && typeof value === "object") {
    const record = value as { "@_href"?: string; href?: string; "#text"?: string };
    return (record["@_href"] ?? record.href ?? record["#text"] ?? "").toString().trim();
  }
  return "";
}

function excerptOf(row: Record<string, unknown>): string {
  const raw =
    textOf(row["content:encoded"]) ||
    textOf(row.content) ||
    textOf(row.description) ||
    textOf(row.summary);
  return decodeEntities(htmlToExcerpt(raw));
}

export function parseFeed(xml: string): RssItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rssChannel = (doc.rss as { channel?: { item?: unknown } } | undefined)?.channel;
  const atomFeed = doc.feed as { entry?: unknown } | undefined;
  const rawItems = rssChannel ? asArray(rssChannel.item) : asArray(atomFeed?.entry);
  const items: RssItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const title = decodeEntities(textOf(row.title));
    const link = linkOf(row.link) || textOf(row.guid) || textOf(row.id);
    const published = textOf(row.pubDate) || textOf(row.published) || textOf(row.updated) || null;
    if (!title || !link) continue;
    items.push({ title, link, publishedAt: published, excerpt: excerptOf(row) });
  }
  return items;
}
