/**
 * Copie les portraits des personnages dont le score substantif matche le filtre
 * (même logique que analyze-marvel-cineverse-prune-candidates.mjs)
 * vers un dossier de tri visuel.
 *
 * Usage:
 *   node scripts/copy-marvel-cineverse-review-images.mjs
 *   node scripts/copy-marvel-cineverse-review-images.mjs --score 7
 *   node scripts/copy-marvel-cineverse-review-images.mjs --min-score 5 --max-score 7
 *   node scripts/copy-marvel-cineverse-review-images.mjs --out public/universes/marvel-cineverse/review-foo
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_DATA = path.join(ROOT, "data", "marvel-cineverse.json");
const UNIVERSE_ID = "marvel-cineverse";
const SRC_DIR = path.join(ROOT, "public", "universes", UNIVERSE_ID, "characters");
const EXTENSIONS = ["webp", "png", "jpg", "jpeg"];

function parseArgs(argv) {
  let dataPath = DEFAULT_DATA;
  let outPath = null;
  let scoreEq = 7;
  let minScore = null;
  let maxScore = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--data") dataPath = path.resolve(ROOT, argv[++i] || "");
    else if (a === "--out") outPath = path.resolve(ROOT, argv[++i] || "");
    else if (a === "--score") scoreEq = parseInt(argv[++i], 10);
    else if (a === "--min-score") minScore = parseInt(argv[++i], 10);
    else if (a === "--max-score") maxScore = parseInt(argv[++i], 10);
  }
  return { dataPath, outPath, scoreEq, minScore, maxScore };
}

function present(char, key) {
  const v = char[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== "";
}

function substantiveMarvel(char, key) {
  if (!present(char, key)) return false;
  const s = String(char[key]).trim();
  const low = s.toLowerCase();
  if (key === "status" && low === "inconnu") return false;
  if (key === "firstAppearance" && low === "inconnu") return false;
  return true;
}

function gridKeys(fieldMapping) {
  return Object.entries(fieldMapping || {})
    .filter(([, e]) => e.fonction !== "Recherche" && e.fonction !== "Indice")
    .map(([k]) => k);
}

function substantiveCount(char, grid) {
  let n = 0;
  for (const k of grid) if (substantiveMarvel(char, k)) n++;
  return n;
}

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

const opts = parseArgs(process.argv);
const raw = fs.readFileSync(opts.dataPath, "utf8");
const data = JSON.parse(raw);
const GRID = gridKeys(data.fieldMapping);

let matches = [];
for (const c of data.characters) {
  const sc = substantiveCount(c, GRID);
  if (opts.minScore != null || opts.maxScore != null) {
    const lo = opts.minScore ?? 0;
    const hi = opts.maxScore ?? GRID.length;
    if (sc >= lo && sc <= hi) matches.push({ ch: c, sc });
  } else if (sc === opts.scoreEq) {
    matches.push({ ch: c, sc });
  }
}

let OUT_DIR = opts.outPath;
if (!OUT_DIR) {
  if (opts.minScore != null || opts.maxScore != null) {
    OUT_DIR = path.join(
      ROOT,
      "public",
      "universes",
      UNIVERSE_ID,
      `review-substantive-${opts.minScore ?? 0}-${opts.maxScore ?? GRID.length}`,
    );
  } else {
    OUT_DIR = path.join(ROOT, "public", "universes", UNIVERSE_ID, `review-substantive-${opts.scoreEq}`);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let copied = 0;
let missing = 0;
for (const { ch } of matches) {
  const src = findSourceImage(ch.id);
  const label = safeLabel(ch.name);
  if (!src) {
    missing++;
    fs.writeFileSync(
      path.join(OUT_DIR, `${ch.id}__${label}.MISSING.txt`),
      `Pas d'image dans characters/ pour id=${ch.id}\n`,
      "utf8",
    );
    continue;
  }
  fs.copyFileSync(src.path, path.join(OUT_DIR, `${ch.id}__${label}.${src.ext}`));
  copied++;
}

console.log(
  `Filtre: ${
    opts.minScore != null || opts.maxScore != null
      ? `score ∈ [${opts.minScore ?? 0}, ${opts.maxScore ?? GRID.length}]`
      : `score === ${opts.scoreEq}`
  } | ${matches.length} perso(s) | copiés: ${copied} | sans image: ${missing}`,
);
console.log(`→ ${OUT_DIR}`);
