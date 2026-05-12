import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_STATUS = new Map([
  ["alber", "Vivant(e)"],
  ["baskerville", "Inconnu"],
  ["bartholomew-kuma", "Vivant(e)"],
  ["bluejam", "Inconnu"],
  ["buchi", "Vivant(e)"],
  ["charlotte-cracker", "Vivant(e)"],
  ["hogback", "Vivant(e)"],
  ["satori", "Inconnu"],
  ["sentomaru", "Vivant(e)"],
  ["sham", "Vivant(e)"],
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

function normalizeEnStatus(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "alive") return "Vivant(e)";
  if (text === "deceased") return "Décédé(e)";
  if (text === "unknown") return "Inconnu";
  return "";
}

function normalizeFrStatus(value) {
  const text = String(value ?? "").trim();
  if (text === "Vivant(e)" || text === "Décédé(e)" || text === "Inconnu") {
    return text;
  }
  return "";
}

function computeFinalStatus(id, enStatus, frStatus) {
  if (VERIFIED_STATUS.has(id)) return VERIFIED_STATUS.get(id);

  const normalizedFr = normalizeFrStatus(frStatus);
  if (normalizedFr) return normalizedFr;

  const normalizedEn = normalizeEnStatus(enStatus);
  if (normalizedEn) return normalizedEn;

  return "Inconnu";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enStatusIdx = header.indexOf("en_wiki_status");
const frStatusIdx = header.indexOf("fr_wiki_statut");
let finalStatusIdx = header.indexOf("final_status");

if (finalStatusIdx === -1) {
  header.push("final_status");
  finalStatusIdx = header.length - 1;
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalStatusIdx] = computeFinalStatus(
    row[idIdx],
    row[enStatusIdx],
    row[frStatusIdx],
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
