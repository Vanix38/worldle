import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const TARGET_COLS = new Set(["fr_wiki_affiliation", "fr_wiki_lieuvie", "fr_wiki_occupation"]);

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
      else if (x === ";") {
        o.push(c);
        c = "";
      } else c += x;
    }
  }
  o.push(c);
  return o;
}

function csvEscapeField(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[,;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Infobox FR : listes collées sans séparateur. Insère des virgules entre segments probables.
 */
function normalizeListLikeField(raw) {
  const s0 = String(raw ?? "").trim();
  if (!s0) return "";

  let t = s0.replace(/\s+/g, " ").trim();

  // CP-AIGIS0 collé à CP5 / CP9 (prioritaire)
  t = t.replace(/(CP-AIGIS\d)(?=CP\d)/gi, "$1, ");
  // CP-AIGIS0 collé à Commandant (titres occupation wiki)
  t = t.replace(/(CP-AIGIS0)(?=Commandant du)/gi, "$1, ");
  // Chiffre puis CP seulement si le chiffre n'est pas dans un mot (évite AIGIS0 + CP)
  t = t.replace(/(?<![A-Za-zÀ-ÿ])\d(?=CP\d)/gi, "$&, ");

  // Après ), avant CP ou Gouvernement (sans espace wiki)
  t = t.replace(/\)(?=\s*CP\d)/gi, "), ");
  t = t.replace(/\)(?=\s*CP-AIGIS)/gi, "), ");
  t = t.replace(/\)(?=\s*Gouvernement)/gi, "), ");

  // Après ), avant majuscule (nouveau lieu / bloc), pas déjà traité
  t = t.replace(/\)(?=\s*[A-ZÀ-Ÿ])(?!\s*,)/g, "), ");

  // Cipher Pol + métier (avec ou sans espace wiki)
  t = t.replace(/(Cipher Pol)\s*(Assassin|Membre)/gi, "$1, $2");

  // Secrétaire / Tenancier / Charpentier après Assassin ou paren
  t = t.replace(/(\(anciennement\))\s*(Secrétaire)/gi, "$1, $2");
  t = t.replace(/(Assassin)\s*(Tenancier|Charpentier|Secrétaire)/gi, "$1, $2");

  // Commandant du répété après (anciennement)
  t = t.replace(/(\(anciennement\))\s*(Commandant du)/gi, "$1, $2");

  // "CP-AIGIS0 CP9" espacé (affiliation)
  t = t.replace(/(CP-AIGIS0)\s+(?=CP9)/gi, "$1, ");

  // Nettoyage : doubles virgules, segments vides
  t = t.replace(/,\s*,+/g, ", ");
  t = t.replace(/\s+,/g, ",");
  t = t.replace(/,\s*/g, ", ");
  t = t.replace(/\s{2,}/g, " ");

  return t
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

const colIndexes = [];
headers.forEach((h, i) => {
  if (TARGET_COLS.has(h)) colIndexes.push(i);
});

let changed = 0;
const outLines = [headers.map((h) => csvEscapeField(h)).join(";")];

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  while (row.length < headers.length) row.push("");
  let rowChanged = false;
  for (const i of colIndexes) {
    const before = row[i];
    const after = normalizeListLikeField(before);
    if (before !== after) rowChanged = true;
    row[i] = after;
  }
  if (rowChanged) changed++;

  const obj = {};
  headers.forEach((h, idx) => (obj[h] = row[idx] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Colonnes:", [...TARGET_COLS].join(", "), "| lignes modifiées:", changed, "/", lines.length - 1);
