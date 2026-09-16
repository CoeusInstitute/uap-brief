export type Confidence = "low" | "medium" | "high";

export const SCORE_TAGS = [
  "PSYOP",
  "WOO",
  "INTERESTING",
  "LACKING_DATA",
  "VETTED",
  "CREDIBLE",
] as const;

export type ScoreTag = (typeof SCORE_TAGS)[number];

export function isScoreTag(value: string): value is ScoreTag {
  return (SCORE_TAGS as readonly string[]).includes(value);
}

/** Public wiki row from `people_public` — omits research_notes, merge_note, stance_seed, and birth/death. */
export type Person = {
  person_id: string;
  name: string;
  aliases: string[];
  status: string | null;
  primary_role: string | null;
  role_tags: string[];
  prominence_tier: string | null;
  country_or_region: string | null;
  activity_period: string | null;
  affiliations: string[];
  positions_or_titles: string | null;
  works_or_platforms: string[];
  stance_category: string | null;
  position_statement_summary: string | null;
  key_claims_or_contributions: string | null;
  evidence_basis: string[];
  claim_status: string | null;
  record_confidence: string | null;
  controversies_or_counterpoints: string | null;
  associated_podcast_ids: string[];
  source_1_title: string | null;
  source_1_url: string | null;
  source_1_type: string | null;
  source_2_title: string | null;
  source_2_url: string | null;
  source_2_type: string | null;
  source_count: number | null;
  data_sources: string | null;
  last_verified: string | null;
};

export type Podcast = {
  podcast_id: string;
  podcast_name: string;
  aliases: string[];
  host_names: string[];
  network_producer: string | null;
  country: string | null;
  status: string | null;
  cadence: string | null;
  focus_tags: string[];
  reach_tier: string | null;
  category: string | null;
  primary_url: string | null;
  feed_url: string | null;
  youtube_url: string | null;
  feed_discovery_status: string | null;
  notable_recurring_guests: string[];
  notes: string | null;
  confidence: string | null;
};

export type Organization = {
  org_id: string;
  org_name: string;
  aliases: string[];
  org_type: string | null;
  country: string | null;
  status: string | null;
  key_people: string[];
  role_in_discourse: string | null;
  url: string | null;
  confidence: string | null;
};

export type Appearance = {
  appearance_id: string;
  person_id: string;
  person_name: string | null;
  podcast_id: string;
  podcast_name: string | null;
  role: string | null;
  episode_title: string | null;
  episode_date: string | null;
  episode_date_sort: string | null;
  topic_tags: string[];
  source_url: string | null;
  confidence: string | null;
};

export type StoryScore = {
  tag: ScoreTag;
  score: number | null;
  confidence: string | null;
  rationale: string | null;
  components?: Record<string, unknown> | null;
  methodology_version?: string | null;
};

export type StoryEntity = {
  entity_type: string;
  entity_id: string;
  name: string;
};

export type Story = {
  story_id: string;
  canonical_url: string;
  title: string;
  published_at: string | null;
  excerpt: string | null;
  /** Model-written 2–5 sentence brief. Null until score-stories has written one. */
  summary: string | null;
  image_url: string | null;
  image_status: string | null;
  form: string | null;
  source_name: string | null;
  homepage_url: string | null;
  cluster_id: string | null;
  scores: StoryScore[];
  entities: StoryEntity[];
};

export type TagTrend = {
  week: string;
  tag: string;
  n: number;
};

export type EntityStat = {
  entity_type: string;
  entity_id: string;
  n: number;
};

export type MethodologyRow = {
  version: string;
  status: string | null;
  notes: string | null;
};

export type TagStat = {
  tag: string;
  n: number;
  avg_score: number | null;
};

export type SourceStat = {
  source_id: string;
  name: string;
  homepage_url: string | null;
  ready_stories: number;
};

export type TimelineRecord = {
  record_id: string;
  record_type: string;
  category: string | null;
  date: string | null;
  date_precision: string | null;
  date_sort: string | null;
  title: string;
  actors: string | null;
  person_id: string | null;
  venue: string | null;
  summary: string | null;
  significance: string | null;
  claim_status: string | null;
  source_url: string | null;
  confidence: string | null;
};
