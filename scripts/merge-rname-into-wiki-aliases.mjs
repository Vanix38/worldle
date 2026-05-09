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

function mergeAliasesWithRname(aliasesRaw, rnameRaw) {
  const seen = new Set();
  const out = [];
  function push(t) {
    const x = String(t).trim();
    if (!x) return;
    const k = x.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(x);
  }
  for (const part of String(aliasesRaw ?? "").split(",")) push(part);
  push(rnameRaw);
  return out.join(",");
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
const iAliases = headers.indexOf("wiki_aliases");
const iRname = headers.indexOf("wiki_rname");
if (iAliases < 0 || iRname < 0) {
  console.error("wiki_aliases ou wiki_rname introuvable");
  process.exit(1);
}

const newHeaders = headers.filter((h) => h !== "wiki_rname");
const outLines = [newHeaders.map((h) => csvEscapeField(h)).join(";")];

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  while (row.length < headers.length) row.push("");
  const merged = mergeAliasesWithRname(row[iAliases], row[iRname]);
  const rowObj = {};
  headers.forEach((h, i) => {
    if (h === "wiki_rname") return;
    rowObj[h] = row[i] ?? "";
  });
  rowObj.wiki_aliases = merged;
  outLines.push(newHeaders.map((h) => csvEscapeField(rowObj[h] ?? "")).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("wiki_rname fusionné dans wiki_aliases | cols:", newHeaders.length);
