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

function splitOccupation(raw) {
  const parts = String(raw ?? "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { current: "", other: "" };
  return {
    current: parts[0],
    other: parts.slice(1).join("; "),
  };
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
const iOcc = headers.indexOf("wiki_occupation");
if (iOcc < 0) {
  console.error("wiki_occupation introuvable (déjà scindée ?)");
  process.exit(1);
}

const newHeaders = headers.flatMap((h) =>
  h === "wiki_occupation" ? ["wiki_occupation_actuelle", "wiki_autres_occupations"] : [h],
);

const outLines = [newHeaders.map((h) => csvEscapeField(h)).join(";")];

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  while (row.length < headers.length) row.push("");
  const { current, other } = splitOccupation(row[iOcc]);
  const rowObj = {};
  headers.forEach((h, i) => {
    if (h === "wiki_occupation") return;
    rowObj[h] = row[i] ?? "";
  });
  rowObj.wiki_occupation_actuelle = current;
  rowObj.wiki_autres_occupations = other;

  outLines.push(newHeaders.map((h) => csvEscapeField(rowObj[h] ?? "")).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Wrote", CSV, "| cols:", newHeaders.length);
