/**
 * Normalise les genres dans data/naruto.json : Homme / Femme / Variable uniquement.
 * Usage : node scripts/normalize-naruto-gender.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "naruto.json");

function normalizeGenderDisplay(raw) {
  const s = String(raw || "").trim();
  if (!s) return s;
  if (/\bvariable\b/i.test(s)) return "Variable";
  const female = /\b(femme|femelle|féminin|feminin)\b/i.test(s);
  const male = /\b(homme|mâle|male|masculin)\b/i.test(s);
  if (female && !male) return "Femme";
  if (male && !female) return "Homme";
  if (female && male) {
    const fi = s.search(/\b(femme|femelle|féminin|feminin)\b/i);
    const mi = s.search(/\b(homme|mâle|male|masculin)\b/i);
    return fi >= 0 && (mi < 0 || fi < mi) ? "Femme" : "Homme";
  }
  if (/féminin|feminin|femme|femelle/i.test(s)) return "Femme";
  if (/masculin|mâle|homme/i.test(s)) return "Homme";
  return s;
}

const j = JSON.parse(fs.readFileSync(DATA, "utf8"));
for (const c of j.characters) {
  if (typeof c.gender === "string") c.gender = normalizeGenderDisplay(c.gender);
}
if (j.fieldMapping?.gender) {
  j.fieldMapping.gender.description =
    "Homme ou Femme (Masculin/Féminin du wiki normalisés). Variable si la fiche l’indique.";
}
fs.writeFileSync(DATA, JSON.stringify(j, null, 2));
console.log("Unique genders:", [...new Set(j.characters.map((c) => c.gender))].sort());
