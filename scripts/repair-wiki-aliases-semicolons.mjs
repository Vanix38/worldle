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

function cleanAliasChunk(t) {
  let x = String(t).trim();
  x = x.replace(/^[\s'"„«“]+|[\s'"»”]+$/g, "");
  x = x.replace(/\s+/g, " ").trim();
  x = x.replace(/^'+|'+$/g, "").trim();
  return x;
}

/** Remplace les séparateurs wiki ';' par des virgules et dédoublonne */
function sanitizeWikiAliases(raw) {
  let x = String(raw ?? "").trim();
  if (!x) return "";
  x = x.replace(/\s*;\s*/g, ",");
  x = x.replace(/,{2,}/g, ",");
  x = x.replace(/^,+|,+$/g, "");
  const parts = x.split(",").map((p) => cleanAliasChunk(p)).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
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

let changed = 0;
const outLines = [headers.map((h) => csvEscapeField(h)).join(";")];
for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  while (row.length < headers.length) row.push("");
  const before = row[iCol];
  const after = sanitizeWikiAliases(before);
  if (String(before ?? "").trim() !== after) changed++;
  row[iCol] = after;
  const obj = {};
  headers.forEach((h, idx) => (obj[h] = row[idx] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Sanitized wiki_aliases (;→,) | rows:", lines.length - 1, "| changed:", changed);
