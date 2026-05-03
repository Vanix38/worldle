/**
 * Supprime du data/naruto.json les personnages « score 7 » dont l’image
 * n’est plus dans public/universes/naruto/review-score-7/ (tri visuel).
 * Retire aussi les portraits dans public/universes/naruto/characters/.
 *
 * Usage: node scripts/prune-naruto-from-review-score7.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_JSON = path.join(ROOT, "data", "naruto.json");
const REVIEW_DIR = path.join(ROOT, "public", "universes", "naruto", "review-score-7");
const CHAR_DIR = path.join(ROOT, "public", "universes", "naruto", "characters");
const EXT = ["webp", "png", "jpg", "jpeg"];

const GRID = [
  "status",
  "gender",
  "age",
  "affiliation",
  "clan",
  "ninjaRank",
  "classification",
  "profession",
  "chakraNatures",
  "arc",
];

function present(c, k) {
  const v = c[k];
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== "";
}

function substantive(c, k) {
  if (!present(c, k)) return false;
  const s = String(c[k]).trim();
  if (k === "status" && s === "Inconnu") return false;
  if (k === "arc" && s === "Inconnu") return false;
  if (k === "ninjaRank" && s === "Aucun(e)") return false;
  return true;
}

function substantiveCount(c) {
  let n = 0;
  for (const k of GRID) if (substantive(c, k)) n++;
  return n;
}

function charGameFieldPresent(ch, key) {
  const v = ch[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== "";
}

/** id__Label.ext → id (premier segment avant __) */
function parseKeptId(fname) {
  const m = String(fname).match(/^(.+?)__(.+)\.(webp|png|jpg|jpeg)$/i);
  return m ? m[1] : null;
}

const kept = new Set();
if (!fs.existsSync(REVIEW_DIR)) {
  console.error("Dossier introuvable:", REVIEW_DIR);
  process.exit(1);
}
for (const fname of fs.readdirSync(REVIEW_DIR)) {
  if (fname.endsWith(".MISSING.txt")) continue;
  const id = parseKeptId(fname);
  if (id) kept.add(id);
}

if (kept.size === 0) {
  console.error("Aucune image reconnue dans review-score-7 (format id__Nom.ext). Abandon.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));
const score7 = data.characters.filter((c) => substantiveCount(c) === 7);
const toRemove = score7.filter((c) => !kept.has(c.id)).map((c) => c.id);
const removeSet = new Set(toRemove);

data.characters = data.characters.filter((c) => !removeSet.has(c.id));

const fmKeys = Object.keys(data.fieldMapping || {});
const N = data.characters.length || 1;
const rates = {};
for (const k of fmKeys) {
  let x = 0;
  for (const ch of data.characters) {
    if (charGameFieldPresent(ch, k)) x++;
  }
  rates[k] = x / N;
}
data.fieldPrevalence = Object.fromEntries(Object.entries(rates).sort((a, b) => b[1] - a[1]));

let delImg = 0;
for (const id of toRemove) {
  for (const ext of EXT) {
    const p = path.join(CHAR_DIR, `${id}.${ext}`);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      delImg++;
    }
  }
}

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(
  `Score 7: ${score7.length} | conservés (dossier review): ${kept.size} | retirés du JSON: ${toRemove.length} | persos restants: ${data.characters.length} | images supprimées (characters/): ${delImg}`,
);
