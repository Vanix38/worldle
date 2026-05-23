import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "hunterxhunter.json"), "utf8"));
const n = d.characters.length;
const fmKeys = new Set(Object.keys(d.fieldMapping || {}));
const RESERVED = new Set(["id", "name", "imageUrl", "aliases"]);

const charKeys = new Map();
for (const c of d.characters) {
  for (const k of Object.keys(c)) {
    if (RESERVED.has(k)) continue;
    charKeys.set(k, (charKeys.get(k) || 0) + 1);
  }
}

function hasVal(v) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

const notInFM = [...charKeys.keys()].filter((k) => !fmKeys.has(k)).sort();
const inFMnotUsed = [...fmKeys].filter((k) => !charKeys.has(k));

const prevIssues = [];
for (const k of fmKeys) {
  let count = 0;
  for (const c of d.characters) if (hasVal(c[k])) count++;
  const actual = count / n;
  const stored = d.fieldPrevalence?.[k];
  if (stored != null && Math.abs(stored - actual) > 0.001) {
    prevIssues.push({ k, stored, actual: +actual.toFixed(4), count });
  }
}

const typeUrl = d.characters.filter((c) => c.type && /https?:\/\//i.test(c.type));
const indice2Url = d.characters.filter((c) => c.indice2 && /https?:\/\//i.test(c.indice2));
const genderVals = [...new Set(d.characters.map((c) => c.gender).filter(Boolean))].sort();
const statusVals = [...new Set(d.characters.map((c) => c.status).filter(Boolean))].sort();

const arcOrder = d.fieldMapping?.arc?.order || [];
const arcVals = [...new Set(d.characters.map((c) => c.arc).filter(Boolean))];
const arcNotInOrder = arcVals.filter((a) => !arcOrder.includes(a));

const gridKeys = [...fmKeys].filter(
  (k) => !["Recherche", "Indice"].includes(d.fieldMapping[k].fonction),
);

console.log("=== fieldMapping ↔ persos ===");
console.log("Clés sur persos hors fieldMapping:", notInFM.length ? notInFM : "(aucune)");
console.log("Clés fieldMapping jamais utilisées:", inFMnotUsed.length ? inFMnotUsed : "(aucune)");
console.log("\n=== fieldPrevalence ===");
console.log(prevIssues.length ? prevIssues : "OK (cohérent)");

console.log("\n=== Colonnes grille (hors Recherche/Indice) ===");
for (const k of gridKeys) {
  const entry = d.fieldMapping[k];
  console.log(`  ${k}: ${entry.fonction} — ${entry.header}`);
}

console.log("\n=== Problèmes qualité ===");
console.log("type avec URL brute:", typeUrl.length);
console.log("indice2 avec URL brute:", indice2Url.length);
console.log("arc hors order:", arcNotInOrder);
console.log("genres:", genderVals.join(", "));
console.log("statuts (" + statusVals.length + "):", statusVals.slice(0, 12).join(", "), statusVals.length > 12 ? "…" : "");

console.log("\n=== Couverture ===");
for (const k of [...fmKeys].sort((a, b) => (charKeys.get(b) || 0) - (charKeys.get(a) || 0))) {
  const c = charKeys.get(k) || 0;
  const pct = ((100 * c) / n).toFixed(1);
  console.log(`  ${k.padEnd(18)} ${String(c).padStart(3)}/${n} (${pct}%)  ${d.fieldMapping[k].fonction}`);
}
