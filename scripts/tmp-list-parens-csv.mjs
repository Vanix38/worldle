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

function extractBalancedTopLevel(s) {
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

/** Tous segments entre ( ) y compris imbriqués — récursif */
function collectParenStrings(s, counts) {
  for (const inner of extractBalancedTopLevel(s)) {
    const t = inner.trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
    collectParenStrings(inner, counts);
  }
}

const lines = fs.readFileSync(CSV, "utf8").split(/\r?\n/).filter(Boolean);

const counts = new Map();
for (let L = 1; L < lines.length; L++) {
  const cells = parseLine(lines[L]);
  for (const cell of cells) collectParenStrings(cell, counts);
}

const sorted = [...counts.entries()].sort((a, b) => {
  const n = b[1] - a[1];
  if (n !== 0) return n;
  return a[0].localeCompare(b[0], "fr");
});

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "parens-inventory.txt");
const linesOut = [
  `distinct-count\t${sorted.length}`,
  "freq\ttext",
];
for (const [text, n] of sorted) {
  linesOut.push(`${n}\t${text.replace(/\n/g, "\\n")}`);
}
fs.writeFileSync(outPath, linesOut.join("\n") + "\n", "utf8");
console.log("Wrote", outPath, "| distinct:", sorted.length);
