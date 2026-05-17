/**
 * Applique les capacités d'un CSV sur marvel-cineverse.json (par id).
 * Cellule vide → capacités inchangées.
 * Run: node scripts/apply-surhumain-csv-abilities.mjs [fichier.csv]
 */
import fs from "node:fs";

const jsonPath = new URL("../data/marvel-cineverse.json", import.meta.url);
const csvArg = process.argv[2] ?? "marvel-cineverse-surhumain.csv";
const csvPath = csvArg.startsWith("file:")
  ? new URL(csvArg)
  : new URL(`../data/${csvArg.replace(/^.*[\\/]/, "")}`, import.meta.url);

const SEP = ";";

function parseLine(line) {
  const o = [];
  let c = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const x = line[i];
    if (q) {
      if (x === '"' && line[i + 1] === '"') {
        c += '"';
        i++;
      } else if (x === '"') q = false;
      else c += x;
    } else {
      if (x === '"') q = true;
      else if (x === SEP) {
        o.push(c);
        c = "";
      } else c += x;
    }
  }
  o.push(c);
  return o;
}

function parseAbilitiesCell(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const byId = new Map(data.characters.map((c) => [c.id, c]));

const lines = fs.readFileSync(csvPath, "latin1").split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0]);
const idIdx = header.indexOf("id");
const capIdx = header.findIndex((h) => h.toLowerCase().includes("capacit"));

if (idIdx < 0 || capIdx < 0) {
  console.error("Colonnes id ou capacité introuvables:", header);
  process.exit(1);
}

let updated = 0;
let skippedEmpty = 0;
let missingId = 0;

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  const id = (row[idIdx] ?? "").trim();
  const abilities = parseAbilitiesCell(row[capIdx]);
  if (!id) continue;
  if (abilities === null) {
    skippedEmpty++;
    continue;
  }
  const ch = byId.get(id);
  if (!ch) {
    missingId++;
    console.warn("ID inconnu:", id);
    continue;
  }
  ch.abilities = abilities;
  updated++;
}

fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(
  `Capacités mises à jour: ${updated} | ignorées (vide): ${skippedEmpty} | id inconnu: ${missingId}`,
);
