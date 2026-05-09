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
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Fusion alias + birthname + epithet ; dédoublonnage exact ; séparation par virgule. */
function mergeAliases(alias, birthname, epithet) {
  const parts = [alias, birthname, epithet]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out.join(",");
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const oldHeaders = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));

const idx = (name) => oldHeaders.indexOf(name);
const iAlias = idx("wiki_alias");
const iBirth = idx("wiki_birthname");
const iEpith = idx("wiki_epithet");
if (iAlias < 0 || iBirth < 0 || iEpith < 0) {
  console.error("Colonnes wiki_alias / wiki_birthname / wiki_epithet introuvables");
  process.exit(1);
}

const newHeaders = oldHeaders.filter(
  (h) => h !== "wiki_alias" && h !== "wiki_birthname" && h !== "wiki_epithet",
);
const insertAt = newHeaders.indexOf("wiki_bounty");
const mergedHeaders = [...newHeaders.slice(0, insertAt), "wiki_aliases", ...newHeaders.slice(insertAt)];

const outLines = [mergedHeaders.join(";")];

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  const merged = mergeAliases(row[iAlias], row[iBirth], row[iEpith]);
  const rowObj = {};
  oldHeaders.forEach((h, i) => {
    if (h === "wiki_alias" || h === "wiki_birthname" || h === "wiki_epithet") return;
    rowObj[h] = row[i] ?? "";
  });
  rowObj.wiki_aliases = merged;

  outLines.push(mergedHeaders.map((h) => csvEscapeField(rowObj[h] ?? "")).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Wrote", CSV, "| rows:", lines.length - 1, "| cols:", mergedHeaders.length);
