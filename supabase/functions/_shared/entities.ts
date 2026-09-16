import { containsPhrase, isMultiWord, normalizeName } from "./normalize.ts";

export type PersonAlias = { normalized_alias: string; person_id: string };
export type OrgAlias = { normalized_alias: string; org_id: string };
export type ShowRow = { podcast_id: string; podcast_name: string; aliases: string[] | null };
export type EntityHit = {
  entity_type: "person" | "organization" | "podcast";
  entity_id: string;
  match_method: string;
  confidence: "high" | "medium" | "low";
};

export function matchPeople(text: string, aliases: PersonAlias[]): EntityHit[] {
  const hits: EntityHit[] = [];
  const seen = new Set<string>();
  for (const alias of aliases) {
    if (!isMultiWord(alias.normalized_alias)) continue;
    if (!containsPhrase(text, alias.normalized_alias)) continue;
    if (seen.has(alias.person_id)) continue;
    seen.add(alias.person_id);
    hits.push({
      entity_type: "person",
      entity_id: alias.person_id,
      match_method: "alias_exact",
      confidence: "high",
    });
  }
  return hits;
}

export function matchOrgs(text: string, aliases: OrgAlias[]): EntityHit[] {
  const hits: EntityHit[] = [];
  const seen = new Set<string>();
  for (const alias of aliases) {
    if (!isMultiWord(alias.normalized_alias)) continue;
    if (!containsPhrase(text, alias.normalized_alias)) continue;
    if (seen.has(alias.org_id)) continue;
    seen.add(alias.org_id);
    hits.push({
      entity_type: "organization",
      entity_id: alias.org_id,
      match_method: "alias_exact",
      confidence: "high",
    });
  }
  return hits;
}

export function matchShows(text: string, shows: ShowRow[]): EntityHit[] {
  const hits: EntityHit[] = [];
  for (const show of shows) {
    const names = [show.podcast_name, ...(show.aliases ?? [])].filter(Boolean);
    if (names.some((name) => isMultiWord(name) && containsPhrase(text, name))) {
      hits.push({
        entity_type: "podcast",
        entity_id: show.podcast_id,
        match_method: "name_exact",
        confidence: "high",
      });
    }
  }
  return hits;
}

const SKIP_SHAPED = new Set([
  "united states",
  "white house",
  "new york",
  "los angeles",
  "air force",
  "department of",
  "house of",
  "the pentagon",
]);

export function unmatchedNameShaped(text: string, matchedNames: string[]): string[] {
  const matched = new Set(matchedNames.map(normalizeName));
  const found = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of found) {
    const key = normalizeName(raw);
    if (seen.has(key) || matched.has(key) || SKIP_SHAPED.has(key)) continue;
    if (!isMultiWord(raw)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out.slice(0, 12);
}
