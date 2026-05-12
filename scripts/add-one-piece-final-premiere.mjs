import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_PREMIERES = new Map([
  ["spandam", "Chapitre 355 ; Épisode 249"],
  ["hiluluk", "Chapitre 141 ; Épisode 85"],
  ["vegapunk", "Chapitre 684 ; Épisode 610"],
  ["kozuki-oden", "Chapitre 920 ; Épisode 910"],
  ["otohime", "Chapitre 621 ; Épisode 540"],
  ["bellemere", "Chapitre 77 ; Épisode 32"],
  ["don-quichotte-rossinante", "Chapitre 761 ; Épisode 700"],
  ["baggy", "Chapitre 9 ; Épisode 4"],
  ["bartolomeo", "Chapitre 705 ; Épisode 634"],
  ["black-maria", "Chapitre 977 ; Épisode 982"],
  ["brogy", "Chapitre 115 ; Épisode 71"],
  ["cabaji", "Chapitre 9 ; Épisode 7"],
  ["charlotte-brulee", "Chapitre 831 ; Épisode 791"],
  ["crocodile", "Chapitre 126 ; Épisode 76"],
  ["curly-dadan", "Chapitre 582 ; Épisode 493"],
  ["gecko-moria", "Chapitre 448 ; Épisode 343"],
  ["hack", "Chapitre 706 ; Épisode 633"],
  ["hina", "Chapitre 171 ; Épisode 127"],
  ["holdem", "Chapitre 915 ; Épisode 901"],
  ["ideo", "Chapitre 706 ; Épisode 633"],
  ["inuarashi", "Chapitre 808 ; Épisode 756"],
  ["kaidou", "Chapitre 795 ; Épisode 739"],
  ["karasu", "Chapitre 593 ; Épisode 510"],
  ["marguerite", "Chapitre 514 ; Épisode 408"],
  ["morgans", "Chapitre 860 ; Épisode 830"],
  ["nekomamushi", "Chapitre 809 ; Épisode 756"],
  ["nero", "Chapitre 367 ; Épisode 257"],
  ["perona", "Chapitre 443 ; Épisode 338"],
  ["sasaki", "Chapitre 977 ; Épisode 982"],
  ["smoker", "Chapitre 97 ; Épisode 48"],
  ["stussy", "Chapitre 860 ; Épisode 830"],
  ["ulti", "Chapitre 977 ; Épisode 982"],
  ["vinsmoke-reiju", "Chapitre 826 ; Épisode 784"],
  ["vista", "Chapitre 552 ; Épisode 0"],
  ["wanze", "Chapitre 367 ; Épisode 257"],
  ["who-s-who", "Chapitre 979 ; Épisode 985"],
  ["dracule-mihawk", "Chapitre 49 ; Épisode 23"],
  ["kawamatsu", "Chapitre 920 ; Épisode 910"],
  ["pandaman", "Chapitre 44 ; Épisode 16"],
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

function formatPair(pair) {
  const [chapter, episode] = String(pair).split("/");
  return `Chapitre ${chapter} ; Épisode ${episode}`;
}

function computeFinalPremiere(id, enFirst, frFirst) {
  if (VERIFIED_PREMIERES.has(id)) return VERIFIED_PREMIERES.get(id);

  const frPairs = extractPairs(frFirst);
  if (frPairs.length > 0) return formatPair(frPairs[0]);

  const enPairs = extractPairs(enFirst);
  if (enPairs.length > 0) return formatPair(enPairs[0]);

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
