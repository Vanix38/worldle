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

function innerMatchesAnciennement(inner) {
  return /anciennement/i.test(inner) || /anciennemenet/i.test(inner);
}

/** Supprime tout bloc `(…)` dont le texte contient « anciennement » (ou typo wiki). */
function stripAnciennementParensRaw(s) {
  let out = String(s ?? "");
  let changed = true;
  while (changed) {
    changed = false;
    let depth = 0;
    let segStart = -1;
    for (let i = 0; i < out.length; i++) {
      const ch = out[i];
      if (ch === "(") {
        if (depth === 0) segStart = i;
        depth++;
      } else if (ch === ")") {
        depth--;
        if (depth === 0 && segStart >= 0) {
          const inner = out.slice(segStart + 1, i);
          if (innerMatchesAnciennement(inner)) {
            out = out.slice(0, segStart) + out.slice(i + 1);
            changed = true;
            break;
          }
          segStart = -1;
        }
      }
    }
  }
  return out;
}

function cleanupAfterStrip(t) {
  let s = t.replace(/\s+/g, " ");
  s = s.replace(/\s*,\s*,+/g, ", ");
  s = s.replace(/\s*;\s*;+/g, "; ");
  s = s.replace(/^\s*[,;]\s*|\s*[,;]\s*$/g, "");
  return s.trim();
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

let cellsChanged = 0;
const outLines = [headers.map((h) => csvEscapeField(h)).join(";")];

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  while (row.length < headers.length) row.push("");
  let rowTouched = false;
  for (let i = 0; i < headers.length; i++) {
    const before = row[i] ?? "";
    const raw = stripAnciennementParensRaw(before);
    const after = raw !== before ? cleanupAfterStrip(raw) : before;
    if (before !== after) {
      rowTouched = true;
      row[i] = after;
    }
  }
  if (rowTouched) cellsChanged++;

  const obj = {};
  headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Parenthèses « anciennement » supprimées | lignes données touchées:", cellsChanged, "/", lines.length - 1);
