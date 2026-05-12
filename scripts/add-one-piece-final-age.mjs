import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_AGES = new Map([
  ["pedro", "32 ans"],
  ["bellemere", "30 ans"],
  ["baskerville", "Bas 48 ans, And 53 ans, Kerville 42 ans"],
  ["baggy", "39 ans"],
  ["gecko-moria", "50 ans"],
  ["jewelry-bonney", "12 ans"],
  ["shura", "33 ans"],
  ["sugar", "22 ans"],
  ["yarle", "408 ans"],
  ["mozu-et-kiwi", "Mozu 21 ans, Kiwi 22 ans"],
  ["koala", "23 ans"],
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

function normalizeFrAge(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d+$/.test(text)) return `${text} ans`;
  if (/^\d+\s+ans$/i.test(text)) return text.replace(/\s+/g, " ");
  if (text.toLowerCase() === "lui-même ne sait pas") return "Inconnu";
  return text;
}

function normalizeEnAge(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d+$/.test(text)) return `${text} ans`;
  if (/unknown/i.test(text)) return "Inconnu";
  return text;
}

function computeFinalAge(id, enAge, frAge) {
  if (VERIFIED_AGES.has(id)) return VERIFIED_AGES.get(id);

  const normalizedFr = normalizeFrAge(frAge);
  if (normalizedFr) return normalizedFr;

  const normalizedEn = normalizeEnAge(enAge);
  if (normalizedEn) return normalizedEn;

  return "Inconnu";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/);
const nonEmptyLines = lines.filter((line) => line.length > 0);

const rows = nonEmptyLines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enAgeIdx = header.indexOf("en_wiki_age");
const frAgeIdx = header.indexOf("fr_wiki_âge");
let finalAgeIdx = header.indexOf("final_age");

if (finalAgeIdx === -1) {
  header.push("final_age");
  finalAgeIdx = header.length - 1;
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const id = row[idIdx];
  row[finalAgeIdx] = computeFinalAge(id, row[enAgeIdx], row[frAgeIdx]);
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
