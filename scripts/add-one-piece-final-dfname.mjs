import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_DFNAMES = new Map([
  ["baggy", "Bara Bara no Mi"],
  ["gecko-moria", "Kage Kage no Mi"],
  ["holdem", "Lion SMILE"],
  ["jack", "Zou Zou no Mi, Model: Mammoth"],
  ["kozuki-momonosuke", "Uo Uo no Mi, Model: Seiryu"],
  ["mikita", "Kiro Kiro no Mi"],
  ["monkey-d-luffy", "Gomu Gomu no Mi / Hito Hito no Mi, Model: Nika"],
  ["sheep-s-head", "Sheep SMILE"],
  ["speed", "Horse SMILE"],
  ["urouge", "Fruit sans nom"],
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

function pickFrName(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text === "Inconnu") return "";
  return text.split(",")[0].trim();
}

function computeFinalDfName(id, enDfName, frDfName) {
  if (VERIFIED_DFNAMES.has(id)) return VERIFIED_DFNAMES.get(id);

  const en = String(enDfName ?? "").trim();
  if (en) return en;

  const fr = pickFrName(frDfName);
  if (fr) return fr;

  return "Aucun";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enDfNameIdx = header.indexOf("en_wiki_dfname");
const frDfNameIdx = header.indexOf("fr_wiki_dfnom");
let finalDfNameIdx = header.indexOf("final_dfname");

if (finalDfNameIdx === -1) {
  header.push("final_dfname");
  finalDfNameIdx = header.length - 1;
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalDfNameIdx] = computeFinalDfName(
    row[idIdx],
    row[enDfNameIdx],
    row[frDfNameIdx],
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
