import { spawn } from "node:child_process";
import {
  loadPeople,
  markCollector,
  matchesPerson,
  parseArgs,
  personIdsForWave,
  readState,
  serviceClient,
  shouldSkipPerson,
  sleep,
  writeQueue,
  writeState,
} from "./lib.mjs";

const args = parseArgs();
const supabase = serviceClient();
const ids = await personIdsForWave(supabase, args.wave || 1, args.ids);
const people = await loadPeople(supabase, ids);
const state = readState();
let collected = 0;
let skipped = 0;
let drops = 0;

for (const person of people) {
  if (shouldSkipPerson(state, person.person_id, "youtube", args.force)) {
    skipped += 1;
    if (args.dryRun) console.log(`SKIP ${person.person_id} youtube`);
    continue;
  }
  if (args.dryRun) {
    console.log(`FETCH ${person.person_id} youtube`);
    continue;
  }
  const queries = [`"${person.name}"`, `"${person.name}" UAP`, `"${person.name}" interview`];
  const found = [];
  let localDrops = 0;
  for (const query of queries) {
    const lines = await ytSearch(query);
    for (const line of lines) {
      const [title, channel, url] = line.split(" :: ").map((part) => part.trim());
      if (!url) continue;
      const text = `${title} ${channel}`;
      if (!matchesPerson(text, person)) {
        localDrops += 1;
        continue;
      }
      found.push({
        url,
        title: title ?? "",
        outlet: channel ?? "",
        snippet: text,
        published: "",
        discovered_via: "youtube_trace",
      });
    }
    await sleep(1500);
  }
  writeQueue(person.person_id, {
    name: person.name,
    wave: args.wave || 1,
    candidates: found,
  });
  drops += localDrops;
  markCollector(state, person.person_id, "youtube", {
    wave: args.wave || 1,
    name: person.name,
    youtube_candidates: found.length,
    youtube_drops: localDrops,
  });
  collected += 1;
  console.log(`${person.person_id} youtube ${found.length} kept, ${localDrops} dropped`);
}

writeState(state);
console.log(`youtube collected=${collected} skipped=${skipped} drops=${drops}`);

function ytSearch(query) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "yt-dlp",
      ["--flat-playlist", "--ignore-errors", "--no-warnings", "--print", "%(title)s :: %(channel)s :: %(webpage_url)s", `ytsearch15:${query}`],
      { windowsHide: true },
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`yt-dlp timeout for ${query}`));
    }, 120000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr.slice(0, 400) || `yt-dlp exit ${code}`));
        return;
      }
      resolve(stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
    });
  });
}
