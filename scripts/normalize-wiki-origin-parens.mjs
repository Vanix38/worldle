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
  if (/[,;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** "Grand Line (Guanhao)" -> "Guanhao" ; sans suffixe () inchangé */
function originFromTrailingParen(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return t;
  const m = t.match(/\(([^()]*)\)\s*$/);
  if (!m) return t;
  const inner = m[1].trim();
  return inner || t;
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
const iCol = headers.indexOf("wiki_origin");
if (iCol < 0) {
  console.error("wiki_origin introuvable");
  process.exit(1);
}

let changed = 0;
const outLines = [headers.map((h) => csvEscapeField(h)).join(";")];
for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  while (row.length < headers.length) row.push("");
  const before = row[iCol];
  const after = originFromTrailingParen(before);
  if (String(before ?? "").trim() !== after) changed++;
  row[iCol] = after;
  const obj = {};
  headers.forEach((h, idx) => (obj[h] = row[idx] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("wiki_origin (…) extrait | rows:", lines.length - 1, "| changed:", changed);
