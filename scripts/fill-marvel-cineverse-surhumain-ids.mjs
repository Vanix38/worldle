/**
 * Ajoute la colonne id au CSV surhumain (match nom → marvel-cineverse.json).
 * Run: node scripts/fill-marvel-cineverse-surhumain-ids.mjs
 */
import fs from "node:fs";

const data = JSON.parse(
  fs.readFileSync(new URL("../data/marvel-cineverse.json", import.meta.url), "utf8"),
);
const byName = new Map(data.characters.map((c) => [c.name, c.id]));

const csvPath = new URL("../data/marvel-cineverse-surhumain.csv", import.meta.url);
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

function esc(s) {
  const t = String(s ?? "");
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

const text = fs.readFileSync(csvPath, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0]);
const nomIdx = header.findIndex((h) => h === "nom" || h.toLowerCase() === "nom");
const capIdx = header.findIndex(
  (h) => h.includes("capacit") || h.toLowerCase().includes("capacit"),
);
if (nomIdx < 0) {
  console.error("Colonne nom introuvable");
  process.exit(1);
}

const out = [`id${SEP}nom${SEP}nouvelle capacité`];
let missing = 0;

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  const nom = row[nomIdx] ?? "";
  const cap =
    capIdx >= 0 ? (row[capIdx] ?? "") : row.length > nomIdx + 1 ? row[nomIdx + 1] : "";
  const id = byName.get(nom);
  if (!id) {
    missing++;
    console.warn("Pas d'id pour:", nom);
    out.push(`${esc("")}${SEP}${esc(nom)}${SEP}${esc(cap)}`);
  } else {
    out.push(`${esc(id)}${SEP}${esc(nom)}${SEP}${esc(cap)}`);
  }
}

fs.writeFileSync(csvPath, `${out.join("\n")}\n`, "utf8");
console.log(`${out.length - 1} lignes écrites | sans id: ${missing}`);
