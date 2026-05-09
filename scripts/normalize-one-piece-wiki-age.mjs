import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

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
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Garde l’âge post-timeskip si présent ; sinon âge seul sans notes entre parenthèses.
 * Pas de texte entre parenthèses dans le résultat.
 */
function normalizeWikiAge(raw) {
  const s0 = String(raw ?? "").trim();
  if (!s0) return "";

  const afterTs = /(\d+)\s*\(\s*after\s+timeskip[^)]*\)/gi;
  const postTs = /(\d+)\s*\(\s*post[-\s]?timeskip[^)]*\)/gi;

  let picked = null;
  for (const re of [afterTs, postTs]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s0)) !== null) picked = m[1];
  }
  if (picked !== null) return picked;

  const onlyPreOrDebut =
    /\(debut\)|\(pre[- ]?timeskip\)|first\s+death/i.test(s0) &&
    !/after\s+timeskip|post[-\s]?timeskip/i.test(s0);
  if (onlyPreOrDebut) return "";

  const singleNote = s0.match(/^(\d+)\s*\([^)]+\)\s*$/);
  if (singleNote) return singleNote[1];

  if (/^\d+$/.test(s0)) return s0;

  let s = s0;
  let prev;
  do {
    prev = s;
    s = s.replace(/\([^)]*\)/g, "").trim();
  } while (s !== prev);
  s = s.replace(/\s+/g, " ").trim();

  if (/^\d+$/.test(s)) return s;

  const first = s0.match(/\d+/);
  return first ? first[0] : "";
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
const iAge = headers.indexOf("wiki_age");
if (iAge < 0) {
  console.error("wiki_age introuvable");
  process.exit(1);
}

const outLines = [headers.join(";")];
let changed = 0;
for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  const before = row[iAge];
  const after = normalizeWikiAge(before);
  if (String(before ?? "").trim() !== after) changed++;
  row[iAge] = after;
  const obj = {};
  headers.forEach((h, idx) => (obj[h] = row[idx] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Normalized wiki_age | rows:", lines.length - 1, "| cells changed:", changed);
