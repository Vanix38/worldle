/**
 * Supprime les blocs Chapter/Chapitre + Episode dont la parenthèse contient
 * silhouette, mentionné / mentionnée, ou mentioned (même logique : si un autre
 * Episode suit dans le même chapitre, ne retirer que l’épisode annoté).
 *
 * Usage: node scripts/strip-silhouette-segments.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "one-piece-wiki-fixed.csv");

/** Parenthèses à retirer : (…silhouette…), (…mentionné…), (…mentionnée…), (…mentioned…), etc. */
const PAREN_ANNOT =
  /\([^)]*(?:\bsilhouette\b|\bmentioned\b|mentionn[eé]e?)[^)]*\)/giu;

const HAS_ANNOT = /silhouette|mentioned|mentionn/i;

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

function consumeAfterAnnotParen(s, closeEnd) {
  let end = closeEnd;
  while (end < s.length && /\s/.test(s[end])) end++;
  if (s[end] === ";") end++;
  while (end < s.length && /\s/.test(s[end])) end++;
  return end;
}

function stripAppearanceAnnotations(raw) {
  let s = String(raw ?? "").normalize("NFC");
  if (!HAS_ANNOT.test(s)) return s;

  let changed = true;
  while (changed) {
    changed = false;
    const m = PAREN_ANNOT.exec(s);
    if (!m) break;

    const openParen = m.index;
    const closeEnd = m.index + m[0].length;
    const beforeOpen = s.slice(0, openParen);

    const epTail = /(?:Episode|Épisode)\s+\d+\s*$/i.exec(beforeOpen);

    if (!epTail) {
      const chOnly = /(?:Chapter|Chapitre)\s+\d+\s*$/i.exec(beforeOpen);
      const start = chOnly ? beforeOpen.length - chOnly[0].length : openParen;
      const end = consumeAfterAnnotParen(s, closeEnd);
      s = s.slice(0, start) + s.slice(end);
      changed = true;
      PAREN_ANNOT.lastIndex = 0;
      continue;
    }

    const epStart = beforeOpen.length - epTail[0].length;
    const beforeEp = s.slice(0, epStart);
    const chHead = /(?:Chapter|Chapitre)\s+\d+\s*;\s*$/i.exec(beforeEp);

    const end = consumeAfterAnnotParen(s, closeEnd);
    const rest = s.slice(end);
    const sameChapterNext = /^(Episode|Épisode)\s/i.test(rest);

    if (chHead && sameChapterNext) {
      const start = epStart;
      s = s.slice(0, start) + s.slice(end);
    } else {
      const start = chHead ? beforeEp.length - chHead[0].length : epStart;
      s = s.slice(0, start) + s.slice(end);
    }
    changed = true;
    PAREN_ANNOT.lastIndex = 0;
  }

  s = s.replace(/;\s*;/g, "; ");
  s = s.replace(/^\s*;\s*|\s*;\s*$/g, "");
  s = s.replace(/\s{2,}/g, " ");
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
  for (let i = 0; i < headers.length; i++) {
    const before = row[i] ?? "";
    const after = stripAppearanceAnnotations(before);
    if (before !== after) {
      cellsChanged++;
      row[i] = after;
    }
  }
  const obj = {};
  headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log(
  "Segments (silhouette / mentionné / mentioned) retirés | cellules modifiées:",
  cellsChanged,
);
