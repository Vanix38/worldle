import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_ORIGINS = new Map([
  ["marshall-d-teach", "Grand Line (Port Shade)"],
  ["kalgara", "Grand Line (Jaya)"],
  ["bellemere", "East Blue (Village de Cocoyashi)"],
  ["bellamy", "North Blue (Notice)"],
  ["bepo", "Zou"],
  ["chinjao", "West Blue (Pays de Kano)"],
  ["eustass-kid", "South Blue (Île Kutsukku)"],
  ["gecko-moria", "West Blue"],
  ["hack", "Grand Line (Royaume Ryugu ; Île des Hommes-Poissons)"],
  ["issho", "Grand Line (Royaume Aoi)"],
  ["jewelry-bonney", "Red Line (Mary Geoise)"],
  ["killer", "South Blue (Île Kutsukku)"],
  ["kokoro", "Grand Line (Royaume Ryugu ; Île des Hommes-Poissons)"],
  ["kuromarimo", "Grand Line (Royaume de Drum)"],
  ["kuzan", "South Blue (Royaume Vespa)"],
  ["monkey-d-luffy", "East Blue (Île de l'Aurore)"],
  ["nami", "Royaume d'Oykot"],
  ["octo", "Grand Line (Royaume Ryugu ; Île des Hommes-Poissons)"],
  ["sai", "West Blue (Pays de Kano)"],
  ["sentomaru", "Grand Line (Mont Kintoki)"],
  ["shakuyaku", "Amazon Lily"],
  ["shanks", "God Valley"],
  ["stussy", "Navire de recherche du MADS"],
  ["vinsmoke-ichiji", "North Blue (Royaume de Germa)"],
  ["vinsmoke-niji", "North Blue (Royaume de Germa)"],
  ["vinsmoke-reiju", "North Blue (Royaume de Germa)"],
  ["vinsmoke-yonji", "North Blue (Royaume de Germa)"],
  ["yamato", "Pays des Wa"],
  ["mozu-et-kiwi", "Water Seven (Bas-fonds)"],
  ["vinsmoke-sanji", "North Blue (Royaume de Germa)"],
  ["tony-tony-chopper", "Grand Line (Île de Drum)"],
  ["usopp", "East Blue (Archipel des Gekko)"],
  ["dracule-mihawk", "Inconnu"],
  ["silvers-rayleigh", "Inconnu"],
  ["charlotte-pudding", "Grand Line (Totto Land)"],
  ["koala", "Île Foolshout"],
  ["gin", "East Blue"],
  ["kawamatsu", "Grand Line (Île des Hommes-Poissons)"],
]);

const EN_TO_FR_REPLACEMENTS = [
  ["Shade Port", "Port Shade"],
  ["Dawn Island", "Île de l'Aurore"],
  ["Foosha Village", "Village de Fuchsia"],
  ["Gecko Islands", "Archipel des Gekko"],
  ["Drum Island", "Île de Drum"],
  ["Drum Kingdom", "Royaume de Drum"],
  ["Kano Country", "Pays de Kano"],
  ["Ryugu Kingdom", "Royaume Ryugu"],
  ["Fish-Man Island", "Île des Hommes-Poissons"],
  ["Sorbet Kingdom", "Royaume de Sorbet"],
  ["Kutsukku Island", "Île Kutsukku"],
  ["Aoi Kingdom", "Royaume Aoi"],
  ["Vespa Kingdom territory", "Royaume Vespa"],
  ["Vespa Kingdom", "Royaume Vespa"],
  ["Mt. Kintoki", "Mont Kintoki"],
  ["Water 7", "Water Seven"],
  ["MADS Research Ship", "Navire de recherche du MADS"],
  ["Totto Land", "Totto Land"],
  ["Mary Geoise", "Mary Geoise"],
  ["God Valley", "God Valley"],
  ["Amazon Lily", "Amazon Lily"],
  ["Zou", "Zou"],
];

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

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function translateEnOrigin(value) {
  let text = cleanText(value);
  for (const [en, fr] of EN_TO_FR_REPLACEMENTS) {
    text = text.replaceAll(en, fr);
  }
  return text;
}

function normalizeOrigin(value, source) {
  let text = cleanText(value);
  if (!text) return "";
  if (/^unknown$/i.test(text) || /^origine inconnue$/i.test(text)) return "Inconnu";
  if (source === "en") text = translateEnOrigin(text);
  return text;
}

function computeFinalOrigin(id, enOrigin, frOrigin, frLive, existingFinal) {
  if (VERIFIED_ORIGINS.has(id)) return VERIFIED_ORIGINS.get(id);

  const fr = normalizeOrigin(frOrigin, "fr");
  if (fr && fr !== "Inconnu") return fr;

  const en = normalizeOrigin(enOrigin, "en");
  if (en && en !== "Inconnu") return en;

  const live = normalizeOrigin(frLive, "fr");
  if (live && live !== "Inconnu") return live;

  const existing = normalizeOrigin(existingFinal, "fr");
  if (existing) return existing;

  return "Inconnu";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enOriginIdx = header.indexOf("en_wiki_origin");
const frOriginIdx = header.indexOf("fr_wiki_origine");
const frLiveIdx = header.indexOf("fr_wiki_lieuvie");
let finalOriginIdx = header.indexOf("final_origin");

if (finalOriginIdx === -1) {
  const insertAt = header.indexOf("final_dftype");
  finalOriginIdx = insertAt === -1 ? header.length : insertAt;
  header.splice(finalOriginIdx, 0, "final_origin");
  for (let i = 1; i < rows.length; i++) {
    rows[i].splice(finalOriginIdx, 0, "");
  }
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalOriginIdx] = computeFinalOrigin(
    row[idIdx],
    enOriginIdx === -1 ? "" : row[enOriginIdx],
    frOriginIdx === -1 ? "" : row[frOriginIdx],
    frLiveIdx === -1 ? "" : row[frLiveIdx],
    row[finalOriginIdx],
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
