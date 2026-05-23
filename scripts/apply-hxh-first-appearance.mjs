/**
 * Fusionne mangaDebut + animeDebut → firstAppearance dans hunterxhunter.json.
 * Usage: node scripts/apply-hxh-first-appearance.mjs [--out path]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mergeFirstAppearance } from "./hxh-first-appearance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.join(__dirname, "..", "data", "hunterxhunter.json");

function parseArgv(argv) {
  const out = { outPath: DEFAULT_OUT };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
  }
  return out;
}

const opts = parseArgv(process.argv);
const data = JSON.parse(fs.readFileSync(opts.outPath, "utf8"));

for (const c of data.characters) {
  const merged = mergeFirstAppearance(c.mangaDebut, c.animeDebut);
  if (merged) c.firstAppearance = merged;
  delete c.mangaDebut;
  delete c.animeDebut;
}

data.fieldMapping = data.fieldMapping || {};
delete data.fieldMapping.mangaDebut;
delete data.fieldMapping.animeDebut;
data.fieldMapping.firstAppearance = {
  header: "Première apparition",
  fonction: "Classique",
  description:
    "Premier chapitre manga et premier épisode de l’anime (2011), issus de l’infobox wiki.",
};

const n = data.characters.length || 1;
const withFa = data.characters.filter((c) => c.firstAppearance?.trim()).length;
data.fieldPrevalence = data.fieldPrevalence || {};
delete data.fieldPrevalence.mangaDebut;
delete data.fieldPrevalence.animeDebut;
data.fieldPrevalence.firstAppearance = withFa / n;

fs.writeFileSync(opts.outPath, JSON.stringify(data, null, 2), "utf8");
console.log("Wrote", opts.outPath, "| firstAppearance:", withFa, "/", n);
