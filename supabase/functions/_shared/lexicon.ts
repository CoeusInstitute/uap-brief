export const SENSATIONAL = [
  "bombshell",
  "shocking",
  "must see",
  "seeing is believing",
  "they don't want you to know",
  "they dont want you to know",
  "cover-up exposed",
  "coverup exposed",
  "secret space program",
  "disclosure now",
  "wake up",
  "the truth is out",
];

export const WOO_MARKERS = [
  "starseed",
  "galactic federation",
  "channeling",
  "channeled",
  "telepathy",
  "telepathic",
  "light being",
  "ascended master",
  "5d consciousness",
  "reptilian",
  "ancient aliens",
  "mediumship",
  "psychic download",
  "downloads from",
  "haunted",
  "spirit orb",
  "demonic",
  "plasmoid consciousness",
  "soul contract",
  "frequency shift",
];

export const COORDINATION = [
  "anonymous official",
  "anonymous officials",
  "senior official",
  "sources familiar",
  "people familiar with",
  "on condition of anonymity",
  "speaking on condition",
  "limited hangout",
  "talking points",
  "perception management",
  "information operation",
  "influence operation",
  "counterintelligence",
  "authorized disclosure",
  "neither confirm nor deny",
  "declined to comment",
  "off the record",
  "will not confirm",
  "official narrative",
  "coordinated leak",
  "narrative seeding",
];

export const REHASH = [
  "as previously reported",
  "as we reported",
  "what we know so far",
  "what we know",
  "timeline of",
  "revisits",
  "once again",
  "yet another",
  "the latest on",
  "recap",
  "roundup",
  "as reported last",
];

export const NOVELTY = [
  "newly declassified",
  "newly released",
  "never-before",
  "never before seen",
  "first-hand",
  "firsthand",
  "obtained documents",
  "exclusive",
  "foia",
  "hearing testimony",
  "sworn testimony",
  "sensor data",
  "chain of custody",
  "whistleblower complaint",
];

export const THIN = [
  "unnamed source",
  "unnamed sources",
  "insider claims",
  "sources say",
  "could not be independently",
  "cannot be independently",
  "social media users",
  "viral video",
  "unconfirmed",
  "alleged sighting",
  "tipster",
];

export const EVIDENCE = [
  "declassified",
  "foia",
  "hearing",
  "transcript",
  "affidavit",
  "photograph",
  "radar",
  "flir",
  "sensor",
  "footage",
  "chain of custody",
  "metadata",
  "exhibit",
  "notary",
  "sworn",
];

export const OFFICIAL = [
  "congress",
  "congressional",
  "senate intelligence",
  "house oversight",
  "house committee",
  "dod",
  "department of defense",
  "department of war",
  "aaro",
  "aatip",
  "gao",
  "nasa",
  "odni",
  "pentagon",
  "navy",
  "air force",
  "uss",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countHits(text: string, terms: string[]): number {
  const hay = text.toLowerCase();
  return terms.reduce((sum, term) => {
    const needle = term.toLowerCase();
    if (needle.includes(" ")) return sum + (hay.includes(needle) ? 1 : 0);
    const re = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i");
    return sum + (re.test(hay) ? 1 : 0);
  }, 0);
}

export function scoreFromHits(hits: number, cap = 4): number {
  if (hits <= 0) return 0;
  return Math.min(10, hits * (10 / cap));
}
