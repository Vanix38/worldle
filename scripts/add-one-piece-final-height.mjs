import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_HEIGHTS = new Map([
  ["kumadori", "338 cm"],
  ["bellemere", "186 cm"],
  ["baggy", "192 cm"],
  ["gecko-moria", "692 cm"],
  ["hogback", "223 cm"],
  ["shanks", "199 cm"],
  ["shura", "191 cm"],
  ["zambai", "227 cm"],
  ["tony-tony-chopper", "90 cm"],
]);

function parseLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ";") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }

  out.push(cur);
  return out;
}

function csvEscapeField(value) {
  const text = String(value ?? "");
  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function normalizeHeight(value) {
  const text = String(value ?? "").trim();
  return /^\d+\s*cm$/i.test(text) ? text.replace(/\s+/g, " ") : "";
}

function computeFinalHeight(id, enHeight, frHeight) {
  if (VERIFIED_HEIGHTS.has(id)) return VERIFIED_HEIGHTS.get(id);

  const normalizedFr = normalizeHeight(frHeight);
  if (normalizedFr) return normalizedFr;

  const normalizedEn = normalizeHeight(enHeight);
  if (normalizedEn) return normalizedEn;

  return "Inconnu";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enHeightIdx = header.indexOf("en_wiki_height");
const frHeightIdx = header.indexOf("fr_wiki_taille");
let finalHeightIdx = header.indexOf("final_height");

if (finalHeightIdx === -1) {
  header.push("final_height");
  finalHeightIdx = header.length - 1;
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalHeightIdx] = computeFinalHeight(
    row[idIdx],
    row[enHeightIdx],
    row[frHeightIdx],
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
