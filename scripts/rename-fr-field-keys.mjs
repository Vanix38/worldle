/**
 * Renomme les clés de champs FR → EN dans data/*.json (univers).
 * indice1/2/3 → hint1/2/3, licence → license, univers → universe
 * Headers / valeurs / fonction inchangés. Idempotent.
 *
 * Usage: node scripts/rename-fr-field-keys.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const RENAME = {
  indice1: "hint1",
  indice2: "hint2",
  indice3: "hint3",
  licence: "license",
  univers: "universe",
};

function renameKeys(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { out: obj, renamed: [] };
  const out = {};
  const renamed = [];
  for (const [k, v] of Object.entries(obj)) {
    const nk = RENAME[k];
    if (nk) {
      if (Object.prototype.hasOwnProperty.call(obj, nk) || Object.prototype.hasOwnProperty.call(out, nk)) {
        // EN déjà présent : garder EN, drop FR
        renamed.push(`${k}→${nk} (skip, EN exists)`);
        continue;
      }
      out[nk] = v;
      renamed.push(`${k}→${nk}`);
    } else {
      out[k] = v;
    }
  }
  return { out, renamed };
}

const files = fs
  .readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    console.warn(`SKIP (invalid JSON): ${file}`);
    continue;
  }
  if (!data.characters || !data.fieldMapping) {
    console.log(`SKIP (not universe): ${file}`);
    continue;
  }

  const allRenamed = [];

  const fm = renameKeys(data.fieldMapping);
  data.fieldMapping = fm.out;
  allRenamed.push(...fm.renamed.map((r) => `fieldMapping.${r}`));

  if (data.fieldPrevalence) {
    const fp = renameKeys(data.fieldPrevalence);
    data.fieldPrevalence = fp.out;
    allRenamed.push(...fp.renamed.map((r) => `fieldPrevalence.${r}`));
  }

  let charRenames = 0;
  data.characters = data.characters.map((c) => {
    const { out, renamed } = renameKeys(c);
    if (renamed.length) charRenames++;
    return out;
  });
  if (charRenames) allRenamed.push(`characters×${charRenames}`);

  if (allRenamed.length === 0) {
    console.log(`OK (noop): ${file}`);
    continue;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`${file}: ${allRenamed.join(", ")}`);
}
