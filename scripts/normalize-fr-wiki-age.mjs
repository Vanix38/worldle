import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "one-piece-wiki-fixed.csv");

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
 * Garde l'âge post-ellipse / actuel ; enlève (au début), (avant … ellipse), et
 * (à sa mort) s'il y a aussi un âge après ellipse.
 */
function normalizeFrWikiAge(raw) {
  let t = String(raw ?? "").trim();
  if (!t) return "";

  t = t.replace(/\s+/g, " ");

  // "38 ans90 ans" → espace (données collées)
  t = t.replace(/(\d+)\s*ans(?=\d)/gi, "$1 ans ");

  const hasApres =
    /(?:après|apres)\s*(?:l[''\u2019´']|\s+)?[ée]?llipse/i.test(t);

  // Bloc "N ans (au début)"
  t = t.replace(/\d+\s*ans\s*\(\s*au\s+d[ée]but\s*\)/gi, "");

  // "N ans (avant …)" jusqu'à la parenthèse fermante
  t = t.replace(/\d+\s*ans\s*\(\s*avant[^)]*\)/gi, "");

  // Court sans "ans" : "37 (avant l'ellipse)"
  t = t.replace(/\d+\s*\(\s*avant[^)]*\)/gi, "");

  // Brook : retirer "N ans (à sa mort)" si un âge après ellipse existe
  if (hasApres && /[àa]\s*sa\s+mort/i.test(t)) {
    t = t.replace(/\d+\s*ans\s*\(\s*[àa]\s+sa\s+mort\s*\)/gi, "");
  }

  // Seul "N ans (à sa mort)" → "N ans"
  t = t.replace(/(\d+)\s*ans\s*\(\s*[àa]\s+sa\s+mort\s*\)/gi, "$1 ans");

  t = t.replace(/\s*[,;]\s*/g, " ");
  t = t.replace(/\s+/g, " ").trim();

  // Plusieurs "N ans …" : garder le segment avec (après/apres … ellipse)
  t = t.replace(
    /^(?:\d+\s*ans\s*)+(?=\d+\s*ans\s*\([^)]*(?:après|apres)[^)]*\))/gi,
    "",
  );

  // "N ans (après/apres … ellipse)" ou "N (après …)" → "N ans"
  t = t.replace(
    /(\d+)\s*ans\s*\(\s*(?:après|apres)\s*(?:l[''\u2019´']|\s+)?[ée]?llipse\s*\)/gi,
    "$1 ans",
  );
  t = t.replace(
    /(\d+)\s*\(\s*(?:après|apres)\s*(?:l[''\u2019´']|\s+)?[ée]?llipse\s*\)/gi,
    "$1 ans",
  );

  t = t.replace(/\d+\s*ans\s*auparavant/gi, "").trim();
  t = t.replace(/\s+/g, " ").trim();

  return t;
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

const colIndex = headers.indexOf("fr_wiki_âge");
if (colIndex < 0) {
  console.error("Colonne fr_wiki_âge introuvable");
  process.exit(1);
}

let changed = 0;
const outLines = [headers.map((h) => csvEscapeField(h)).join(";")];

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  while (row.length < headers.length) row.push("");
  const before = row[colIndex];
  const after = normalizeFrWikiAge(before);
  if (String(before ?? "").trim() !== after) changed++;
  row[colIndex] = after;

  const obj = {};
  headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("fr_wiki_âge normalisé | modifiés:", changed, "/", lines.length - 1);
