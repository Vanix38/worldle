/**
 * Nettoie firstAppearance HxH : uniquement l’épisode anime 2011, sinon champ vide.
 * Usage: node scripts/clean-hxh-first-appearance-episode.mjs [--dry-run]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  episodeLabel2011,
  extractEpisode2011,
} from "./hxh-first-appearance.mjs";
import { buildFieldPrevalence } from "./scrape-hunterxhunter-fandom.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "hunterxhunter.json");

const dryRun = process.argv.includes("--dry-run");
const data = JSON.parse(fs.readFileSync(OUT, "utf8"));

let kept = 0;
let cleared = 0;
let changed = 0;

for (const c of data.characters) {
  const prev = c.firstAppearance;
  if (prev == null || String(prev).trim() === "") {
    if ("firstAppearance" in c) {
      delete c.firstAppearance;
      cleared++;
    }
    continue;
  }
  const ep = extractEpisode2011(prev);
  if (ep == null) {
    delete c.firstAppearance;
    cleared++;
    continue;
  }
  const next = episodeLabel2011(ep);
  if (next !== prev) changed++;
  c.firstAppearance = next;
  kept++;
}

data.fieldPrevalence = buildFieldPrevalence(data.characters, data.fieldMapping);

if (!dryRun) {
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2), "utf8");
}

console.log(dryRun ? "Dry-run" : "Wrote", OUT);
console.log({ kept, cleared, changed, total: data.characters.length });
