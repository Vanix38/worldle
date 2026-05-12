import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_DFTYPES = new Map([
  ["baggy", "Paramecia"],
  ["charlotte-katakuri", "Paramecia"],
  ["gecko-moria", "Paramecia"],
  ["monkey-d-luffy", "Zoan mythique"],
  ["urouge", "Paramecia"],
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

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDfType(value) {
  const text = norm(value);
  if (!text) return "";
  if (/unknown|inconnu/.test(text)) return "Inconnu";
  if (/artificial zoan|smile/.test(text)) return "Zoan artificiel";
  if (/mythical zoan|zoan mythique/.test(text)) return "Zoan mythique";
  if (/ancient zoan|zoan antique/.test(text)) return "Zoan antique";
  if (/special paramecia|paramecia/.test(text)) return "Paramecia";
  if (/logia/.test(text)) return "Logia";
  if (/(^| )zoan( |$)/.test(text)) return "Zoan";
  return value ? String(value).trim() : "";
}

function computeFinalDfType(id, enDfType, frDfType, existingFinal) {
  if (VERIFIED_DFTYPES.has(id)) return VERIFIED_DFTYPES.get(id);

  const normalizedFr = normalizeDfType(frDfType);
  if (normalizedFr && normalizedFr !== "Inconnu") return normalizedFr;

  const normalizedEn = normalizeDfType(enDfType);
  if (normalizedEn && normalizedEn !== "Inconnu") return normalizedEn;

  const normalizedExisting = normalizeDfType(existingFinal);
  if (normalizedExisting) return normalizedExisting;

  if (!String(enDfType ?? "").trim() && !String(frDfType ?? "").trim()) return "Aucun";
  return "Inconnu";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enDfTypeIdx = header.indexOf("en_wiki_dftype");
const frDfTypeIdx = header.indexOf("fr_wiki_dftype");
let finalDfTypeIdx = header.indexOf("final_dftype");

if (finalDfTypeIdx === -1) {
  const insertAt = header.indexOf("final_dfname");
  finalDfTypeIdx = insertAt === -1 ? header.length : insertAt;
  header.splice(finalDfTypeIdx, 0, "final_dftype");
  for (let i = 1; i < rows.length; i++) {
    rows[i].splice(finalDfTypeIdx, 0, "");
  }
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalDfTypeIdx] = computeFinalDfType(
    row[idIdx],
    enDfTypeIdx === -1 ? "" : row[enDfTypeIdx],
    frDfTypeIdx === -1 ? "" : row[frDfTypeIdx],
    row[finalDfTypeIdx],
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
