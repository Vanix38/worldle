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

/** Contenus entre parenthèses (parenthèses imbriquées gérées). */
function extractParenSegments(s) {
  const out = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(s.slice(start, i));
        start = -1;
      }
    }
  }
  return out;
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

const byColumn = Object.fromEntries(headers.map((h) => [h, new Map()]));
const global = new Map();

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  while (row.length < headers.length) row.push("");
  headers.forEach((h, i) => {
    const cell = row[i] ?? "";
    for (const inner of extractParenSegments(cell)) {
      const t = inner.replace(/\s+/g, " ").trim();
      if (!t) continue;
      global.set(t, (global.get(t) ?? 0) + 1);
      const m = byColumn[h];
      m.set(t, (m.get(t) ?? 0) + 1);
    }
  });
}

const sorted = [...global.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const out = [];
out.push(`Fichier: ${CSV}`);
out.push(`Segments uniques entre parenthèses: ${sorted.length}`);
out.push("");
for (const [t, n] of sorted) {
  out.push(`${n}\t${t}`);
}

const reportPath = path.join(path.dirname(CSV), "one-piece-wiki-parens-report.txt");
fs.writeFileSync(reportPath, out.join("\n") + "\n", "utf8");
console.log(out.join("\n"));
console.log("");
console.log("Écrit:", reportPath);
