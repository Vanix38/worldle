/**
 * Corrélations champs grille vs candidats à retirer (données peu discriminantes).
 * Usage: node scripts/analyze-naruto-prune-candidates.mjs [--min-substantive 8]
 * Candidats = score substantif strictement inférieur au seuil (défaut 7 → les 42 persos à 6/10).
 *
 * « Substantif » = champ grille rempli sans placeholder jugé faible :
 *   status≠Inconnu, ninjaRank≠Aucun(e), arc≠Inconnu (si présent).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "naruto.json");

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

function parseArgs(argv) {
  let minSubstantive = 7;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--min-substantive") minSubstantive = Math.max(0, parseInt(argv[++i], 10) || 7);
  }
  return { minSubstantive };
}

function coAbsenceNonInformative(data, k1, k2) {
  const n = data.characters.length || 1;
  let both = 0;
  for (const c of data.characters) {
    if (!substantive(c, k1) && !substantive(c, k2)) both++;
  }
  return both / n;
}

const raw = fs.readFileSync(DATA, "utf8");
const data = JSON.parse(raw);

const opts = parseArgs(process.argv);
const scores = data.characters.map((c) => ({
  id: c.id,
  name: c.name,
  sub: substantiveCount(c),
}));

const dist = {};
for (const x of scores) dist[x.sub] = (dist[x.sub] || 0) + 1;

const maxGrid = GRID.length;
const candidates = scores.filter((x) => x.sub < opts.minSubstantive).sort((a, b) => a.sub - b.sub || a.name.localeCompare(b.name, "fr"));

const pairs = [];
for (let i = 0; i < GRID.length; i++) {
  for (let j = i + 1; j < GRID.length; j++) {
    pairs.push([GRID[i], GRID[j], coAbsenceNonInformative(data, GRID[i], GRID[j])]);
  }
}
pairs.sort((a, b) => b[2] - a[2]);

console.log(`Personnages: ${data.characters.length}`);
console.log(`Score substantif (max ${maxGrid}) — distribution:`, JSON.stringify(dist));
console.log(`Seuil --min-substantive ${opts.minSubstantive} → ${candidates.length} candidat(s) à examiner pour retrait\n`);

console.log("Top co-absences P(non-informatif A ∧ non-informatif B):");
for (const [a, b, p] of pairs.slice(0, 10)) {
  console.log(`  ${a} + ${b}: ${(p * 100).toFixed(1)}%`);
}

console.log("\nListe (id — nom — score substantif):");
for (const x of candidates) {
  console.log(`${x.id}\t${x.name}\t${x.sub}/${maxGrid}`);
}
