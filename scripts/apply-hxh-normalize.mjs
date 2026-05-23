/**
 * Normalise genre, statut, type Nen et nettoie champs corrompus dans hunterxhunter.json.
 * Usage: node scripts/apply-hxh-normalize.mjs [--out path]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  NEN_TYPES,
  cleanIndiceWikiText,
  cleanWikiFieldValue,
  normalizeFirstAppearance,
  normalizeGenderDisplay,
  normalizeHxhStatus,
  normalizeNenType,
} from "./hxh-normalize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.join(__dirname, "..", "data", "hunterxhunter.json");

function parseArgv(argv) {
  const out = { outPath: DEFAULT_OUT };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
  }
  return out;
}

function hasVal(v) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function buildFieldPrevalence(characters, fieldMapping) {
  const keys = new Set(Object.keys(fieldMapping || {}));
  const n = characters.length || 1;
  const rates = {};
  for (const key of keys) {
    let count = 0;
    for (const c of characters) {
      if (hasVal(c[key])) count++;
    }
    rates[key] = count / n;
  }
  return Object.fromEntries(Object.entries(rates).sort((a, b) => b[1] - a[1]));
}

const opts = parseArgv(process.argv);
const data = JSON.parse(fs.readFileSync(opts.outPath, "utf8"));
const stats = { gender: 0, status: 0, type: 0, typeCleared: 0, indice2: 0, occupation: 0, firstAppearance: 0 };

for (const c of data.characters) {
  if (c.gender) {
    const next = normalizeGenderDisplay(c.gender);
    if (next !== c.gender) {
      stats.gender++;
      c.gender = next;
    }
  }
  if (c.status) {
    const next = normalizeHxhStatus(c.status);
    if (next !== c.status) {
      stats.status++;
      c.status = next;
    }
  }
  if (c.type) {
    const next = normalizeNenType(c.type);
    if (!next) {
      delete c.type;
      stats.typeCleared++;
    } else if (next !== c.type) {
      stats.type++;
      c.type = next;
    }
  }
  if (c.occupation) {
    const next = cleanWikiFieldValue(c.occupation);
    if (next !== c.occupation) {
      stats.occupation++;
      c.occupation = next;
    }
  }
  if (c.indice2) {
    const next = cleanIndiceWikiText(c.indice2);
    if (next !== c.indice2) {
      stats.indice2++;
      c.indice2 = next || undefined;
      if (!c.indice2) delete c.indice2;
    }
  }
  if (c.firstAppearance) {
    const next = normalizeFirstAppearance(c.firstAppearance);
    if (next !== c.firstAppearance) {
      stats.firstAppearance++;
      c.firstAppearance = next;
    }
  }
}

data.fieldMapping = data.fieldMapping || {};
data.fieldMapping.gender = {
  ...data.fieldMapping.gender,
  header: "Genre",
  fonction: "Classique",
  columnWidth: "small",
  description:
    "Homme, Femme, Variable ou Inconnu (libellés wiki normalisés). Symboles ♂ / ♀ dans la grille.",
};
data.fieldMapping.status = {
  ...data.fieldMapping.status,
  header: "Statut",
  fonction: "Classique",
  columnWidth: "small",
  description: "Vivant, Mort ou Inconnu (décédé, arrêté, statuts spéciaux wiki regroupés).",
};
data.fieldMapping.type = {
  ...data.fieldMapping.type,
  header: "Type Nen",
  fonction: "Classique",
  description:
    "Catégorie Nen (Renforcement, Transformation, Matérialisation, Émission, Manipulation, Spécialisation, Inconnu).",
};

delete data.fieldMapping.firstAppearance;
data.fieldPrevalence = buildFieldPrevalence(data.characters, data.fieldMapping);

fs.writeFileSync(opts.outPath, JSON.stringify(data, null, 2), "utf8");

console.log("Wrote", opts.outPath);
console.log("Modifiés:", stats);
console.log("Genres:", [...new Set(data.characters.map((c) => c.gender))].sort());
console.log("Statuts:", [...new Set(data.characters.map((c) => c.status))].sort());
console.log("Types Nen:", [...new Set(data.characters.map((c) => c.type).filter(Boolean))].sort());
console.log(
  "Colonnes grille:",
  Object.entries(data.fieldMapping)
    .filter(([, e]) => !["Recherche", "Indice"].includes(e.fonction))
    .map(([k]) => k)
    .join(", "),
);
