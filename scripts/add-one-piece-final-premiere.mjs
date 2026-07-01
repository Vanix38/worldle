import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_PREMIERES = new Map([
  ["spandam", "Épisode 249"],
  ["hiluluk", "Épisode 85"],
  ["stella", "Épisode 610"],
  ["kozuki-oden", "Épisode 910"],
  ["otohime", "Épisode 540"],
  ["bellemere", "Épisode 32"],
  ["don-quichotte-rossinante", "Épisode 700"],
  ["baggy", "Épisode 4"],
  ["bartolomeo", "Épisode 634"],
  ["black-maria", "Épisode 982"],
  ["brogy", "Épisode 71"],
  ["cabaji", "Épisode 7"],
  ["charlotte-brulee", "Épisode 791"],
  ["crocodile", "Épisode 76"],
  ["curly-dadan", "Épisode 493"],
  ["gecko-moria", "Épisode 343"],
  ["hack", "Épisode 633"],
  ["hina", "Épisode 127"],
  ["holdem", "Épisode 901"],
  ["ideo", "Épisode 633"],
  ["inuarashi", "Épisode 756"],
  ["kaidou", "Épisode 739"],
  ["karasu", "Épisode 510"],
  ["marguerite", "Épisode 408"],
  ["morgans", "Épisode 830"],
  ["nekomamushi", "Épisode 756"],
  ["nero", "Épisode 257"],
  ["perona", "Épisode 338"],
  ["sasaki", "Épisode 982"],
  ["smoker", "Épisode 48"],
  ["stussy", "Épisode 830"],
  ["ulti", "Épisode 982"],
  ["vinsmoke-reiju", "Épisode 784"],
  ["vista", "Épisode 0"],
  ["wanze", "Épisode 257"],
  ["who-s-who", "Épisode 985"],
  ["dracule-mihawk", "Épisode 23"],
  ["kawamatsu", "Épisode 910"],
  ["pandaman", "Épisode 16"],
  ["dugong", "Épisode 96"],
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

function extractPairs(value) {
  const text = String(value ?? "");
  const re = /chapter|chapitre/gi;
  const out = [];

  let match;
  while ((match = re.exec(text)) !== null) {
    const slice = text.slice(match.index);
    const pair = slice.match(/(?:chapter|chapitre)\s*(\d+)[^0-9]{0,40}(?:episode|épisode)\s*(\d+)/i);
    if (pair) {
      const key = `${pair[1]}/${pair[2]}`;
      if (!out.includes(key)) out.push(key);
    }
  }

  return out;
}

function formatEpisode(episode) {
  return `Épisode ${episode}`;
}

function computeFinalPremiere(id, enFirst, frFirst) {
  if (VERIFIED_PREMIERES.has(id)) return VERIFIED_PREMIERES.get(id);

  const frPairs = extractPairs(frFirst);
  if (frPairs.length > 0) return formatEpisode(frPairs[0].split("/")[1]);

  const enPairs = extractPairs(enFirst);
  if (enPairs.length > 0) return formatEpisode(enPairs[0].split("/")[1]);

  return "Inconnu";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enFirstIdx = header.indexOf("en_wiki_first");
const frFirstIdx = header.indexOf("fr_wiki_première");
let finalPremiereIdx = header.indexOf("final_premiere");

if (finalPremiereIdx === -1) {
  header.push("final_premiere");
  finalPremiereIdx = header.length - 1;
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalPremiereIdx] = computeFinalPremiere(
    row[idIdx],
    row[enFirstIdx],
    row[frFirstIdx],
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
