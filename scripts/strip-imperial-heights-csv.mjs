import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

/** Supprime (6'3½"), (11'3"), (3'), etc. — pieds/pouces entre parenthèses */
function stripImperialParen(s) {
  let t = String(s ?? "");
  let prev;
  do {
    prev = t;
    t = t.replace(/\(\s*\d+\s*'[^)]*\)/g, "");
    t = t.replace(/\s{2,}/g, " ").replace(/\s*\(\s*\)/g, "");
  } while (t !== prev);
  return t.trim();
}

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

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

const outLines = [headers.join(";")];
for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  const cleaned = row.map((cell) => stripImperialParen(cell));
  const obj = {};
  headers.forEach((h, idx) => (obj[h] = cleaned[idx] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Stripped imperial ft/in parens from", lines.length - 1, "rows");
