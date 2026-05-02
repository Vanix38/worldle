/**
 * Retire « Partie I : » / « Partie II : » (et variantes) dans data/naruto.json.
 * node scripts/strip-partie-labels-naruto.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "data", "naruto.json");

function stripPartieLabels(s) {
  if (!s || typeof s !== "string") return s;
  let t = s.replace(/\u00a0/g, " ");
  t = t.replace(/\bPartie\s+I\s*(?::|&nbsp;\s*:)\s*/gi, "");
  t = t.replace(/\bPartie\s+II\s*(?::|&nbsp;\s*:)\s*/gi, "");
  t = t.replace(/\s*\(\s*Partie\s+I\s*\)\s*/gi, " ");
  t = t.replace(/\s*\(\s*Partie\s+II\s*\)\s*/gi, " ");
  const pipe = t.indexOf("|");
  if (pipe !== -1) t = t.slice(0, pipe);
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function deepStripStrings(v) {
  if (typeof v === "string") return stripPartieLabels(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? stripPartieLabels(x) : x));
  return v;
}

const j = JSON.parse(fs.readFileSync(DATA, "utf8"));

for (const c of j.characters || []) {
  for (const k of Object.keys(c)) {
    if (k === "id" || k === "name") continue;
    const val = c[k];
    if (typeof val === "string") c[k] = stripPartieLabels(val);
    else if (Array.isArray(val)) c[k] = val.map((x) => (typeof x === "string" ? stripPartieLabels(x) : x));
  }
  if (typeof c.name === "string") c.name = stripPartieLabels(c.name);
}

if (j.fieldMapping?.age?.description) {
  j.fieldMapping.age.description =
    "Âge en années déduit de l’infobox (priorité à la valeur Shippuden si plusieurs).";
}

fs.writeFileSync(DATA, JSON.stringify(j, null, 2));
const left = JSON.stringify(j).match(/Partie\s+[III]/gi);
console.log("Done. Remaining Partie I/II mentions:", left ? left.length : 0);
