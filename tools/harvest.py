#!/usr/bin/env python3
"""
harvest.py — expand the UAP dataset from ~117 hand-verified appearance edges to
every episode of every show in podcasts.csv.

Stdlib only for RSS (urllib + ElementTree). yt-dlp is optional and only needed for
YouTube-first shows (Project Unity, Theories of Everything, Engaging the Phenomenon,
The Why Files) that publish no RSS feed.

Usage
-----
    python harvest.py --data ./uap_uf_dataset --out ./uap_uf_dataset
    python harvest.py --data . --only POD-010,POD-003        # specific shows
    python harvest.py --data . --no-youtube                  # RSS only
    python harvest.py --data . --selftest                    # run extraction tests

Outputs
-------
    episodes.csv              every episode: id, podcast_id, title, pub_date, duration, url
    appearances_harvested.csv person<->podcast edges with episode + date provenance
    person_candidates.csv     names found that are NOT yet in people.csv, ranked by
                              frequency — the review queue for minting new PER- ids

Nothing is overwritten: existing appearances.csv is read to suppress duplicates.
"""

import argparse, csv, html, json, os, re, subprocess, sys, time, unicodedata
import urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime

UA = "uap-dataset-harvester/1.0"
ITUNES_LOOKUP = "https://itunes.apple.com/lookup?id={}&entity=podcast"
ITUNES_SEARCH = "https://itunes.apple.com/search?term={}&entity=podcast&limit=5"

# ---------------------------------------------------------------- name handling

SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "phd", "md", "ret", "usaf", "usn"}
TITLES = {
    "dr", "dr.", "mr", "mr.", "mrs", "ms", "prof", "professor", "rep", "rep.",
    "sen", "sen.", "congressman", "congresswoman", "senator", "admiral", "adm",
    "rear admiral", "cmdr", "commander", "lt", "lt.", "ltcol", "col", "colonel",
    "capt", "captain", "sgt", "gen", "general", "chief", "president", "secretary",
}

def norm(name: str) -> str:
    """Casefold + strip accents/punctuation/titles so 'Dr. Jacques Vallée' == 'jacques vallee'."""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", "and")
    s = re.sub(r"[^a-z0-9\s'-]", " ", s)
    toks = [t.strip("-'") for t in s.split()]
    toks = [t for t in toks if t and t.strip(".") not in TITLES and t not in SUFFIXES]
    return " ".join(toks)


def load_people(path):
    """Return (alias -> person_id, person_id -> full_name)."""
    alias, names = {}, {}
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            pid, full = r["person_id"], r["full_name"]
            names[pid] = full
            keys = [full] + [a for a in (r.get("aka") or "").split("|") if a.strip()]
            for k in keys:
                n = norm(k)
                if len(n.split()) >= 2:          # require first+last; single tokens are too noisy
                    alias.setdefault(n, pid)
    return alias, names


# Title patterns that reliably front a guest name across UAP shows.
GUEST_PATTERNS = [
    re.compile(r"\bft\.?\s+([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3})"),
    re.compile(r"\bfeat(?:uring)?\.?\s+([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3})"),
    re.compile(r"\bwith\s+([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3})"),
    re.compile(r"\bjoined by\s+([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3})"),
    re.compile(r"^([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3})\s*[;:|]"),      # "Graeme Rendall; UFOs before Roswell"
    re.compile(r"^-?\s*([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3})\s*$"),
    re.compile(r"-\s*([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3})\s*$"),        # '"...!" -Jake Barber'
    re.compile(r"\bGUESTS?:\s*([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){1,3})"),
]

STOPWORD_NAMES = {
    norm(x) for x in [
        "United States", "Air Force", "New York", "White House", "Joe Rogan Experience",
        "Learn More", "Show More", "Show Less", "Get In", "Apple Podcasts", "Thanks For",
        "Breaking News", "Part One", "Part Two", "The Debrief", "Dark Matter", "Skinwalker Ranch",
    ]
}


GENERIC = {"top","navy","air","force","ufo","uap","ufos","uaps","breaking","news","part",
           "full","episode","secret","alien","aliens","pentagon","congress","exclusive",
           "update","special","live","new","best","real","truth","story","files","report"}


def extract_names(text: str):
    """Yield candidate person-name strings from a title or description."""
    if not text:
        return []
    text = html.unescape(text)
    out = []
    for pat in GUEST_PATTERNS:
        for m in pat.finditer(text):
            cand = m.group(1).strip(" -–—:;,.")
            n = norm(cand)
            toks = n.split()
            if len(toks) < 2 or n in STOPWORD_NAMES or any(t in GENERIC for t in toks):
                continue
            out.append(cand)
    return out


def match_people(text, alias):
    """Direct alias hits anywhere in the text (highest-precision signal)."""
    n = " " + norm(text) + " "
    hits = set()
    for a, pid in alias.items():
        if " " + a + " " in n:
            hits.add(pid)
    return hits


# ---------------------------------------------------------------- fetching

def get(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def resolve_feed(name, apple_lookup, known_feed):
    """known feed > iTunes id lookup > iTunes name search."""
    if known_feed:
        return known_feed, "verified_feed"
    try:
        if apple_lookup and apple_lookup.startswith("itunes:"):
            data = json.loads(get(ITUNES_LOOKUP.format(apple_lookup.split(":", 1)[1])))
            if data.get("results"):
                return data["results"][0].get("feedUrl"), "itunes_id"
        data = json.loads(get(ITUNES_SEARCH.format(urllib.parse.quote(name))))
        for res in data.get("results", []):
            if norm(res.get("collectionName", "")) == norm(name):
                return res.get("feedUrl"), "itunes_name_exact"
        if data.get("results"):
            return data["results"][0].get("feedUrl"), "itunes_name_fuzzy"
    except Exception as e:                                  # noqa: BLE001
        print(f"    ! feed lookup failed for {name}: {e}", file=sys.stderr)
    return None, "unresolved"


def parse_rss(xml_bytes):
    """Return [{title, description, pub_date, duration, url, guid}] from an RSS document."""
    root = ET.fromstring(xml_bytes)
    itunes = "{http://www.itunes.com/dtds/podcast-1.0.dtd}"
    items = []
    for it in root.iter("item"):
        def txt(tag):
            el = it.find(tag)
            return (el.text or "").strip() if el is not None and el.text else ""
        desc = txt("description") or (it.findtext(itunes + "summary") or "")
        items.append({
            "title": txt("title"),
            "description": desc,
            "pub_date": to_iso(txt("pubDate")),
            "duration": it.findtext(itunes + "duration") or "",
            "url": txt("link"),
            "guid": txt("guid"),
        })
    return items


RFC822 = ["%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
          "%a, %d %b %Y %H:%M:%S", "%d %b %Y %H:%M:%S %z"]

def to_iso(s):
    s = (s or "").strip()
    if not s:
        return ""
    s = s.replace("-0000", "+0000").replace("GMT", "+0000").replace("UT", "+0000")
    for fmt in RFC822:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    return m.group(0) if m else ""


def youtube_items(channel_url, limit=400):
    """Flat-playlist dump via yt-dlp. Returns the same shape as parse_rss()."""
    url = channel_url.rstrip("/")
    if not url.endswith("/videos"):
        url += "/videos"
    cmd = ["yt-dlp", "--flat-playlist", "--dump-json", "--playlist-end", str(limit), url]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    except FileNotFoundError:
        print("    ! yt-dlp not installed (pip install yt-dlp) — skipping", file=sys.stderr)
        return []
    items = []
    for line in p.stdout.splitlines():
        try:
            v = json.loads(line)
        except json.JSONDecodeError:
            continue
        d = str(v.get("upload_date") or "")
        items.append({
            "title": v.get("title", ""),
            "description": v.get("description", "") or "",
            "pub_date": f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 else "",
            "duration": str(v.get("duration") or ""),
            "url": v.get("url") or f"https://www.youtube.com/watch?v={v.get('id','')}",
            "guid": v.get("id", ""),
        })
    return items


# ---------------------------------------------------------------- main

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=".", help="directory holding podcasts.csv / people.csv")
    ap.add_argument("--out", default=None)
    ap.add_argument("--only", default="", help="comma-separated podcast_ids")
    ap.add_argument("--no-youtube", action="store_true")
    ap.add_argument("--sleep", type=float, default=1.0, help="politeness delay between feeds")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest()
    out = a.out or a.data

    alias, names = load_people(os.path.join(a.data, "people.csv"))
    pods = list(csv.DictReader(open(os.path.join(a.data, "podcasts.csv"), encoding="utf-8")))
    srcs = {}
    src_path = os.path.join(a.data, "feed_sources.csv")
    if os.path.exists(src_path):
        srcs = {r["podcast_id"]: r for r in csv.DictReader(open(src_path, encoding="utf-8"))}

    existing = set()
    app_path = os.path.join(a.data, "appearances.csv")
    if os.path.exists(app_path):
        for r in csv.DictReader(open(app_path, encoding="utf-8")):
            existing.add((r["person_id"], r["podcast_id"], r["episode_date"]))

    only = {x.strip() for x in a.only.split(",") if x.strip()}
    episodes, edges, candidates = [], [], Counter()
    cand_ctx = {}

    for pod in pods:
        pid, pname = pod["podcast_id"], pod["podcast_name"]
        if only and pid not in only:
            continue
        src = srcs.get(pid, {})
        items, origin = [], ""
        feed, how = resolve_feed(pname, src.get("apple_lookup", ""), src.get("feed_url", ""))
        if feed:
            try:
                items, origin = parse_rss(get(feed)), f"rss:{how}"
            except Exception as e:                           # noqa: BLE001
                print(f"    ! {pname}: feed parse failed ({e})", file=sys.stderr)
        if not items and not a.no_youtube and src.get("youtube_url"):
            items, origin = youtube_items(src["youtube_url"]), "youtube:yt-dlp"
        print(f"{pid} {pname}: {len(items)} items [{origin or 'none'}]")

        for i, it in enumerate(items, 1):
            eid = f"EP-{pid.split('-')[1]}-{i:05d}"
            episodes.append([eid, pid, pname, it["title"], it["pub_date"], it["duration"],
                             it["url"], origin])
            blob = it["title"] + "\n" + it["description"][:4000]
            # 1. high-precision: known people matched by alias
            for person_id in match_people(blob, alias):
                key = (person_id, pid, it["pub_date"])
                if key in existing:
                    continue
                existing.add(key)
                in_title = bool(match_people(it["title"], alias) & {person_id})
                edges.append([f"APPH-{len(edges)+1:06d}", person_id, names[person_id], pid, pname,
                              "guest", it["title"], it["pub_date"], "day" if it["pub_date"] else "unknown",
                              "", it["url"], "high" if in_title else "medium",
                              "title_alias" if in_title else "description_alias"])
            # 2. review queue: name-shaped strings we do not know yet
            for cand in extract_names(it["title"]):
                if norm(cand) in alias:
                    continue
                candidates[cand] += 1
                cand_ctx.setdefault(cand, (pid, pname, it["title"], it["pub_date"]))
        time.sleep(a.sleep)

    w(os.path.join(out, "episodes.csv"),
      ["episode_id", "podcast_id", "podcast_name", "title", "pub_date", "duration",
       "url", "source"], episodes)
    w(os.path.join(out, "appearances_harvested.csv"),
      ["appearance_id", "person_id", "person_name", "podcast_id", "podcast_name", "role",
       "episode_title", "episode_date", "date_precision", "topic_tags", "source_url",
       "confidence", "match_method"], edges)
    w(os.path.join(out, "person_candidates.csv"),
      ["candidate_name", "mentions", "first_podcast_id", "first_podcast_name",
       "example_episode", "example_date"],
      [[c, n, *cand_ctx[c]] for c, n in candidates.most_common() if n >= 1])
    print(f"\nepisodes {len(episodes)} | new edges {len(edges)} | candidates {len(candidates)}")
    print("Review person_candidates.csv, mint PER- ids for the real people, re-run to link them.")
    return 0


def w(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        c = csv.writer(f, quoting=csv.QUOTE_ALL)
        c.writerow(header)
        c.writerows(rows)


def selftest():
    alias = {"jake barber": "PER-003", "jacques vallee": "PER-090",
             "tim gallaudet": "PER-027", "graeme rendall": "PER-214"}
    cases = [
        ('"I Retrieved a UFO With My Helicopter!" -Jake Barber', {"PER-003"}, "Jake Barber"),
        ("Andy is joined by Dr. Jacques Vallée to discuss", {"PER-090"}, None),
        ("Top Navy Admiral: Rear Admiral Tim Gallaudet on USOs", {"PER-027"}, None),
        ("Graeme Rendall; UFOs before Roswell", {"PER-214"}, "Graeme Rendall"),
        ("Pentagon Whistleblower UNLOADS (ft. Matthew Brown)", set(), "Matthew Brown"),
    ]
    ok = True
    for text, want_ids, want_cand in cases:
        got_ids = match_people(text, alias)
        if got_ids != want_ids:
            print(f"FAIL match: {text!r} -> {got_ids} want {want_ids}"); ok = False
        if want_cand:
            cands = {norm(c) for c in extract_names(text)}
            if norm(want_cand) not in cands:
                print(f"FAIL extract: {text!r} -> {cands} want {want_cand}"); ok = False
    assert to_iso("Mon, 07 Sep 2026 17:57:00 -0000") == "2026-09-07", "date parse"
    assert to_iso("") == ""
    print("selftest:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
