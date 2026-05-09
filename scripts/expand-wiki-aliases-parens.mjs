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

/** Coupe par virgules hors de toute parenthèse */
function splitTopLevelCommas(str) {
  const parts = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      const t = buf.trim();
      if (t) parts.push(t);
      buf = "";
    } else buf += ch;
  }
  const t = buf.trim();
  if (t) parts.push(t);
  return parts;
}

function cleanAliasChunk(t) {
  let x = String(t).trim();
  x = x.replace(/^[\s'"„«“]+|[\s'"»”]+$/g, "");
  x = x.replace(/\s+/g, " ").trim();
  x = x.replace(/^'+|'+$/g, "").trim();
  return x;
}

/** Contenu entre parenthèses → alias distincts ; libellé hors parenthèses aussi */
function expandParentheticalAliases(raw) {
  const s0 = String(raw ?? "").trim();
  if (!s0) return "";

  const out = [];
  const seen = new Set();

  function push(t) {
    const c = cleanAliasChunk(t);
    if (!c) return;
    const k = c.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  }

  function extractFromPart(part) {
    let buf = "";
    let i = 0;
    while (i < part.length) {
      if (part[i] === "(") {
        const outer = buf.trim();
        buf = "";
        let depth = 1;
        let j = i + 1;
        let inner = "";
        while (j < part.length && depth > 0) {
          const ch = part[j];
          if (ch === "(") depth++;
          else if (ch === ")") depth--;
          if (depth > 0) inner += ch;
          j++;
        }
        if (outer) push(outer);
        inner = inner.trim();
        if (inner) {
          for (const ip of splitTopLevelCommas(inner)) {
            const seg = ip.trim();
            if (!seg) continue;
            if (seg.includes("(")) extractFromPart(seg);
            else push(seg);
          }
        }
        i = j;
      } else {
        buf += part[i];
        i++;
      }
    }
    if (buf.trim()) push(buf);
  }

  for (const top of splitTopLevelCommas(s0)) extractFromPart(top.trim());

  return out.join(",");
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
const iCol = headers.indexOf("wiki_aliases");
if (iCol < 0) {
  console.error("wiki_aliases introuvable");
  process.exit(1);
}

const outLines = [headers.join(";")];
let changed = 0;
for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  const before = row[iCol];
  const after = expandParentheticalAliases(before);
  if (String(before ?? "").trim() !== after) changed++;
  row[iCol] = after;
  const obj = {};
  headers.forEach((h, idx) => (obj[h] = row[idx] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Expanded wiki_aliases | rows:", lines.length - 1, "| changed:", changed);
