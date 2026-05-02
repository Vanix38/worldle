/**
 * Supprime species du JSON Naruto, met à jour indice1 et fieldPrevalence.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fp = path.join(__dirname, "..", "data", "naruto.json");

function charGameFieldPresent(char, key) {
  const v = char[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (Array.isArray(v)) return v.length > 0;
  const s = String(v).trim();
  return s !== "";
}

const j = JSON.parse(fs.readFileSync(fp, "utf8"));

delete j.fieldMapping.species;
delete j.fieldPrevalence?.species;

if (j.fieldMapping.indice1?.hint) {
  j.fieldMapping.indice1.hint.prompt = "Classification & rang ninja";
}
if (j.fieldMapping.indice1) {
  j.fieldMapping.indice1.description =
    "Indice dérivé de la classification et du rang ninja (sans espèce).";
}

for (const c of j.characters) {
  delete c.species;
  const cls = String(c.classification ?? "").trim();
  const nr = String(c.ninjaRank ?? "").trim();
  c.indice1 = cls || nr || "—";
}

const fmKeys = Object.keys(j.fieldMapping || {});
const n = j.characters.length || 1;
const rates = {};
for (const key of fmKeys) {
  let cnt = 0;
  for (const ch of j.characters) {
    if (charGameFieldPresent(ch, key)) cnt++;
  }
  rates[key] = cnt / n;
}
j.fieldPrevalence = Object.fromEntries(Object.entries(rates).sort((a, b) => b[1] - a[1]));

fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n");
console.log("species retiré | persos:", j.characters.length);
