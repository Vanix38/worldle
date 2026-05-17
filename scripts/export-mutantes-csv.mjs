/**
 * Export id;nom;capacités pour personnages avec "Mutantes" dans abilities.
 * Run: node scripts/export-mutantes-csv.mjs
 */
import fs from "node:fs";

const data = JSON.parse(
  fs.readFileSync(new URL("../data/marvel-cineverse.json", import.meta.url), "utf8"),
);

const SEP = ";";

function esc(s) {
  const t = String(s);
  return /[;"'\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

const rows = data.characters
  .filter((c) => Array.isArray(c.abilities) && c.abilities.includes("Mutantes"))
  .map((c) => ({
    id: c.id,
    nom: c.name,
    capacites: c.abilities.join(", "),
  }))
  .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

const outPath = new URL("../data/marvel-cineverse-mutantes.csv", import.meta.url);
const lines = [
  `id${SEP}nom${SEP}nouvelle capacité`,
  ...rows.map((r) => `${esc(r.id)}${SEP}${esc(r.nom)}${SEP}${esc(r.capacites)}`),
];
fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`${rows.length} lignes -> data/marvel-cineverse-mutantes.csv`);
