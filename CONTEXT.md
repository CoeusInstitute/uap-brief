# UAP Brief

Public intelligence brief for the UAP/UFO discourse: scored coverage, a people wiki, and a network graph. Scores apply to material, not to people.

## Language

**Registry**:
The master people, shows, organizations, appearances, and timeline files in `dataset/`. After P1 seed, the same rows live in Supabase.
_Avoid_: inventing people or summaries that are not in a stored row

**Item**:
Any piece of material that can be scored (story, episode, post).
_Avoid_: calling a person an Item

**Story**:
One canonical news URL after ingest and dedupe.
_Avoid_: headline (when you mean the row); treating sibling coverage as separate events

**Cluster**:
Stories covering the same underlying event. One canonical Story; siblings listed as "also covered by".
_Avoid_: merging distinct events because titles look similar

**Score**:
Per-tag intensity 0–10 (half points) plus confidence, rationale, stored components, and methodology/prompt versions. Hybrid: model pass plus deterministic mix (`mix_v2` / prompt `score_v3`, ADR 0003).
_Avoid_: rating; treating a Score as proof; scoring a person

**Tag**:
One of `PSYOP`, `WOO`, `INTERESTING`, `LACKING_DATA`, `VETTED`, `CREDIBLE`. Intensity means how strongly the material exhibits that property. Caution pole: `PSYOP`, `WOO`, `LACKING_DATA`. Substance pole: `VETTED`, `CREDIBLE`, `INTERESTING`. The UI prints `WOO` as Unlikely.
_Avoid_: adding tags silently; flipping polarity; treating `NONSENSE` or `POTENTIAL` as live

**Assessment line**:
Feed and story-lead footer: one caution winner paired with one substance winner on a bipolar hairline. Marker is the net of those two intensities.
_Avoid_: a bag of chips on the row; copying TBB Left–Right colors or bias mix

**Component**:
A deterministic input to a tag mixture (corroboration, evidence chain, language markers, and so on).
_Avoid_: inventing component values in the UI

**Ready**:
The only Story status visible to the public. Must have a Score with rationale, components, and versions.
_Avoid_: showing `pending` / `processing` / `review` / `failed`

**Person page**:
Generated from registry fields. Aggregates attributed claims and coverage. Never carries an unqualified person-level label.
_Avoid_: "this person is a psyop"

**Reach threshold**:
Configurable podcast subscriber/follower floor. Owner default 50k. Not yet confirmed as final.
_Avoid_: hard-coding a second threshold

**X Monitor**:
Gated. Official X API (read-only Bearer) is the approved route. Cookie-session scraping is not an approved route. Build against a stub until wired.
_Avoid_: scraping X
