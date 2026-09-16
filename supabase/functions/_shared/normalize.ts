export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function isMultiWord(value: string): boolean {
  return normalizeName(value).split(" ").filter(Boolean).length >= 2;
}

export function containsPhrase(haystack: string, phrase: string): boolean {
  const hay = ` ${normalizeName(haystack)} `;
  const needle = ` ${normalizeName(phrase)} `;
  if (needle.trim().length < 3) return false;
  return hay.includes(needle);
}

/** First and last tokens of `name` must both appear in `haystack`. */
export function firstLastMatch(haystack: string, name: string): boolean {
  const hay = normalizeName(haystack);
  const tokens = normalizeName(name).split(" ").filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.length === 1) return hay.includes(tokens[0]);
  return hay.includes(tokens[0]) && hay.includes(tokens[tokens.length - 1]);
}

export function matchesPersonRecord(haystack: string, name: string, aliases: string[] = []): boolean {
  return [name, ...aliases].some((value) => value && firstLastMatch(haystack, value));
}
