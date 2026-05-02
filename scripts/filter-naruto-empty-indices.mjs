/**
 * Retire les persos dont indice1, indice2 et indice3 sont vides ou uniquement un tiret (— - …).
 * Recalcule fieldPrevalence.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fp = path.join(__dirname, "..", "data", "naruto.json");

function indiceEmpty(v) {
  if (v === undefined || v === null) return true;
  const s = String(v).trim();
  if (!s) return true;
  return /^[—\-–]+$/.test(s);
}

function charGameFieldPresent(char, key) {
  const v = char[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (Array.isArray(v)) return v.length > 0;
  const s = String(v).trim();
  return s !== "";
}

const j = JSON.parse(fs.readFileSync(fp, "utf8"));
const before = j.characters.length;
j.characters = j.characters.filter(
  (c) => !(indiceEmpty(c.indice1) && indiceEmpty(c.indice2) && indiceEmpty(c.indice3)),
);
const removed = before - j.characters.length;

const fmKeys = Object.keys(j.fieldMapping || {});
const n = j.characters.length || 1;
const rates = {};
for (const key of fmKeys) {
  let c = 0;
  for (const ch of j.characters) {
    if (charGameFieldPresent(ch, key)) c++;
  }
  rates[key] = c / n;
}
j.fieldPrevalence = Object.fromEntries(Object.entries(rates).sort((a, b) => b[1] - a[1]));

fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n");
console.log("Retirés:", removed, "| Restants:", j.characters.length);
