import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const MERGE_INTO_ONE = [
  "fr_wiki_alias",
  "fr_wiki_ancien_nomf",
  "fr_wiki_épithète",
  "fr_wiki_nomf",
  "fr_wiki_nomr",
  "fr_wiki_Nomr",
];

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

function mergeAliasFields(rowObj) {
  const seen = new Set();
  const parts = [];
  for (const key of MERGE_INTO_ONE) {
    const v = String(rowObj[key] ?? "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    parts.push(v);
  }
  return parts.join(",");
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

const mergeSet = new Set(MERGE_INTO_ONE);
const missing = MERGE_INTO_ONE.filter((h) => !headers.includes(h));
if (missing.length) {
  console.error("Colonnes absentes:", missing.join(", "));
  process.exit(1);
}

const newHeaders = [];
for (const h of headers) {
  if (!mergeSet.has(h)) {
    newHeaders.push(h);
    continue;
  }
  if (h === "fr_wiki_alias") newHeaders.push("fr_wiki_aliases");
}

const ixs = MERGE_INTO_ONE.map((h) => headers.indexOf(h));

const outLines = [newHeaders.map((h) => csvEscapeField(h)).join(";")];

for (let L = 1; L < lines.length; L++) {
  const cells = parseLine(lines[L]);
  const rowObj = {};
  headers.forEach((h, i) => {
    rowObj[h] = cells[i] ?? "";
  });
  rowObj.fr_wiki_aliases = mergeAliasFields(rowObj);

  const outRow = newHeaders.map((h) => csvEscapeField(rowObj[h] ?? ""));
  outLines.push(outRow.join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log(
  "Fusion → fr_wiki_aliases | retiré:",
  MERGE_INTO_ONE.join(", "),
  "| cols:",
  newHeaders.length,
);
