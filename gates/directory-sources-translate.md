# Gates: Directory sources plus English translate

Scope: Register the 16 Sep 2026 222-outlet directory, activate only specialist / research / primary / topic-section sources, retarget mixed hosted outlets, and add `translate-stories` after the topic gate. Do not invent RSS. Do not overwrite root GATES.md.

- [x] G1: Offline directory CSV exists with 222 rows
  CHECK: dataset/news_sources.csv
  EXPECT: 222 data rows; columns directory_n,name,homepage_url,category,check_code,language,activate,notes
  EVIDENCE: 2026-09-16 `dataset/news_sources.csv` has header plus 222 rows. `activate=true` on 87 directory rows (1–52, 206–222, and 18 topic-section newsrooms).

- [x] G2: Hosted seed applied (directory_n tagged, retargets, inactive wires)
  CHECK: hosted sources where fetch_policy ? 'directory_n'
  EXPECT: count 222; NewsNation/Space.com/TWZ/DefenseScoop/Ask a Pol UAP on topic URLs; Reuters/AP/NYT/PBS homepage active=false; hosted-only keepers still active
  EVIDENCE: 2026-09-16 hosted `directory_n` count=222; active news=93; inactive=135. Topic URLs and null rss on NewsNation/Space.com/TWZ/DefenseScoop/Ask a Pol UAP. Reuters/AP/NYT/`PBS News / NOVA` inactive. PBS NewsHour tag and UFO Sightings Daily remain active.

- [x] G3: Translate schema and claims
  CHECK: stories columns + claim_translate_stories + claim_pending_stories
  EXPECT: language/title_original/translation_status/translate_attempts present; existing Ready rows original/en; pending stories claim requires original|translated
  EVIDENCE: Migration `20260916200000_directory_sources_translate.sql` applied. 206 stories `original`/`en`, 0 pending translation. `claim_pending_stories` includes `translation_status in ('original','translated')`.

- [x] G4: translate-stories deployed
  CHECK: supabase functions deploy translate-stories
  EXPECT: function live; cron uap-translate-stories every 5m; ingest cron every 15m; other uap-% jobs remain
  EVIDENCE: 2026-09-16 deployed `translate-stories`, `ingest-news`, `match-entities`, `score-stories` on `agrijbcilmymfsnkdpoh`. Cron: translate `*/5`, ingest `*/15`; gate/match/score/podcasts/X still present.

- [x] G5: Topic gate still drops off-topic; English brief when a non-English accept exists
  CHECK: stories_public + translation_status
  EXPECT: no new Ready pork/Epstein/JWST; if a non-English accepted row exists, English title+summary and title_original set
  EVIDENCE: 2026-09-16 `off_topic`=99; Ready titles matching epstein|pork|jwst|white dwarf = 0; ready accepted=67. `translation_status='translated'` count=0 (no non-English accepted row yet; not invented).
