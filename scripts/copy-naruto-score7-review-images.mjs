/**
 * Copie les portraits score 7 (même logique que analyze-naruto-prune-candidates.mjs)
 * vers public/universes/naruto/review-score-7/ pour tri visuel.
 *
 * Usage: node scripts/copy-naruto-score7-review-images.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_JSON = path.join(ROOT, "data", "naruto.json");
const SRC_DIR = path.join(ROOT, "public", "universes", "naruto", "characters");
const OUT_DIR = path.join(ROOT, "public", "universes", "naruto", "review-score-7");
const EXTENSIONS = ["webp", "png", "jpg", "jpeg"];

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

function present(char, key) {
  const v = char[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== "";
}

function substantive(char, key) {
  if (!present(char, key)) return false;
  const s = String(char[key]).trim();
  if (key === "status" && s === "Inconnu") return false;
  if (key === "arc" && s === "Inconnu") return false;
  if (key === "ninjaRank" && s === "Aucun(e)") return false;
  return true;
}

function substantiveCount(char) {
  let n = 0;
  for (const k of GRID) if (substantive(char, k)) n++;
  return n;
}

/** Nom fichier lisible sous Windows (pas de : * ? etc.). */
function safeLabel(name) {
  return String(name ?? "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function findSourceImage(id) {
  for (const ext of EXTENSIONS) {
    const p = path.join(SRC_DIR, `${id}.${ext}`);
    if (fs.existsSync(p)) return { path: p, ext };
  }
  return null;
}

const data = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));
const score7 = data.characters.filter((c) => substantiveCount(c) === 7);

fs.mkdirSync(OUT_DIR, { recursive: true });

let copied = 0;
let missing = 0;
for (const ch of score7) {
  const src = findSourceImage(ch.id);
  const label = safeLabel(ch.name);
  if (!src) {
    missing++;
    const stamp = path.join(OUT_DIR, `${ch.id}__${label}.MISSING.txt`);
    fs.writeFileSync(stamp, `Pas d'image dans characters/ pour id=${ch.id}\n`, "utf8");
    continue;
  }
  const destName = `${ch.id}__${label}.${src.ext}`;
  const dest = path.join(OUT_DIR, destName);
  fs.copyFileSync(src.path, dest);
  copied++;
}

console.log(
  `Score 7: ${score7.length} persos | copiés: ${copied} | sans fichier source: ${missing} → ${OUT_DIR}`,
);
