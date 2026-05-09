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

function splitAffiliation(raw) {
  const parts = String(raw ?? "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { main: "", sub: "" };
  const main = parts[0];
  const sub = parts.slice(1).join(",");
  return { main, sub };
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
const iAff = headers.indexOf("wiki_affiliation");
if (iAff < 0) {
  console.error("wiki_affiliation introuvable (déjà scindée ?)");
  process.exit(1);
}

const newHeaders = headers.flatMap((h) =>
  h === "wiki_affiliation" ? ["wiki_mainaffiliation", "wiki_subaffiliations"] : [h],
);

const outLines = [newHeaders.join(";")];

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  const { main, sub } = splitAffiliation(row[iAff]);
  const rowObj = {};
  headers.forEach((h, i) => {
    if (h === "wiki_affiliation") return;
    rowObj[h] = row[i] ?? "";
  });
  rowObj.wiki_mainaffiliation = main;
  rowObj.wiki_subaffiliations = sub;

  outLines.push(newHeaders.map((h) => csvEscapeField(rowObj[h] ?? "")).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Wrote", CSV, "| cols:", newHeaders.length);
