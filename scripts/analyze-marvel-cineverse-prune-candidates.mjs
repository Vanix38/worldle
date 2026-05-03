/**
 * Score « substantif » par personnage (Marvel Cinéverse), même esprit que Naruto.
 * Champs grille = clés fieldMapping hors Recherche / Indice.
 * Faible : statut ou première apparition = « Inconnu ».
 *
 * Usage:
 *   node scripts/analyze-marvel-cineverse-prune-candidates.mjs [--min-substantive 7]
 *   node scripts/analyze-marvel-cineverse-prune-candidates.mjs --data data/marvel-cineverse.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_DATA = path.join(ROOT, "data", "marvel-cineverse.json");

function parseArgs(argv) {
  let minSubstantive = 7;
  let dataPath = DEFAULT_DATA;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--min-substantive") minSubstantive = Math.max(0, parseInt(argv[++i], 10) || 7);
    else if (argv[i] === "--data") dataPath = path.resolve(ROOT, argv[++i] || "");
  }
  return { minSubstantive, dataPath };
}

function present(char, key) {
  const v = char[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== "";
}

/** Libellés jugés peu informatifs pour la comparaison. */
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

function coAbsenceNonInformative(characters, grid, k1, k2) {
  const n = characters.length || 1;
  let both = 0;
  for (const c of characters) {
    if (!substantiveMarvel(c, k1) && !substantiveMarvel(c, k2)) both++;
  }
  return both / n;
}

const opts = parseArgs(process.argv);
const raw = fs.readFileSync(opts.dataPath, "utf8");
const data = JSON.parse(raw);

const GRID = gridKeys(data.fieldMapping);
const maxGrid = GRID.length;

const scores = data.characters.map((c) => ({
  id: c.id,
  name: c.name,
  sub: substantiveCount(c, GRID),
}));

const dist = {};
for (const x of scores) dist[x.sub] = (dist[x.sub] || 0) + 1;

const candidates = scores
  .filter((x) => x.sub < opts.minSubstantive)
  .sort((a, b) => a.sub - b.sub || a.name.localeCompare(b.name, "fr"));

const pairs = [];
for (let i = 0; i < GRID.length; i++) {
  for (let j = i + 1; j < GRID.length; j++) {
    pairs.push([GRID[i], GRID[j], coAbsenceNonInformative(data.characters, GRID, GRID[i], GRID[j])]);
  }
}
pairs.sort((a, b) => b[2] - a[2]);

console.log(`Fichier: ${opts.dataPath}`);
console.log(`Champs grille (${maxGrid}): ${GRID.join(", ")}`);
console.log(`Personnages: ${data.characters.length}`);
console.log(`Score substantif (max ${maxGrid}) — distribution:`, JSON.stringify(dist));
console.log(`Seuil --min-substantive ${opts.minSubstantive} → ${candidates.length} candidat(s)\n`);

console.log("Top co-absences P(non-informatif A ∧ non-informatif B):");
for (const [a, b, p] of pairs.slice(0, 10)) {
  console.log(`  ${a} + ${b}: ${(p * 100).toFixed(1)}%`);
}

console.log("\nListe (id — nom — score):");
for (const x of candidates) {
  console.log(`${x.id}\t${x.name}\t${x.sub}/${maxGrid}`);
}
