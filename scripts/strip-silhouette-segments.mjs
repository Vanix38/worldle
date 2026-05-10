/**
 * Supprime les segments « première apparition » avec (silhouette) et ce qui les précède
 * (Chapter…; Episode… ou Chapitre… seul), dans toutes les cellules du CSV.
 *
 * Usage: node scripts/strip-silhouette-segments.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "one-piece-wiki-fixed.csv");

/** Contenu entre parenthèses contenant « silhouette » (insensible à la casse). */
const SIL_PAREN = String.raw`\([^)]*\bsilhouette\b[^)]*\)`;

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

function stripSilhouetteSegments(raw) {
  let s = String(raw ?? "");
  let prev;
  const patterns = [
    new RegExp(String.raw`Chapter\s+\d+\s*;\s*Episode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
    new RegExp(String.raw`Chapitre\s+\d+\s*;\s*Épisode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
    new RegExp(String.raw`Chapitre\s+\d+\s*;\s*Episode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
    new RegExp(String.raw`Episode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
    new RegExp(String.raw`Épisode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
    new RegExp(String.raw`Chapter\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
    new RegExp(String.raw`Chapitre\s+\d+\s*${SIL_PAREN}\s*`, "gi"),
  ];
  do {
    prev = s;
    for (const re of patterns) {
      s = s.replace(re, "");
    }
    s = s.replace(/;\s*;/g, "; ");
    s = s.replace(/^\s*;\s*|\s*;\s*$/g, "");
    s = s.replace(/\s{2,}/g, " ");
  } while (s !== prev);

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
    const after = stripSilhouetteSegments(before);
    if (before !== after) {
      rowTouched = true;
      cellsChanged++;
      row[i] = after;
    }
  }
  if (rowTouched) {
    /* noop — stats above */
  }
  const obj = {};
  headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

const tmp = CSV + ".tmp";
const body = outLines.join("\n") + "\n";
fs.writeFileSync(tmp, body, "utf8");
try {
  fs.renameSync(tmp, CSV);
} catch (e) {
  if (e.code === "EPERM" || e.code === "EBUSY") {
    const alt = CSV.replace(/\.csv$/i, "-stripped.csv");
    fs.renameSync(tmp, alt);
    console.error("CSV verrouillé — résultat:", alt);
  } else {
    throw e;
  }
}
console.log("Segments (silhouette) retirés | cellules modifiées:", cellsChanged);
