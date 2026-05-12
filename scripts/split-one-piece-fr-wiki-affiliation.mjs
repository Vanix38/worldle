import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const AFFILIATION_MARKERS = [
  "Quatre Empereurs",
  "Sept grands corsaires",
  "La Grande Flotte du Chapeau de Paille",
  "Neuf Fourreaux Rouges",
  "Armée Révolutionnaire",
  "District des Hommes-Poissons",
  "Cross Guild",
  "Baroque Works",
  "Impel Down",
  "Thriller Bark",
  "Tom's Workers",
  "Onze Supernovae",
  "MADS",
  "Vegapunk",
  "Marines",
  "Marine",
  "Gouvernement Mondial",
  "Gouvernement",
  "Alliance",
  "Famille",
  "L'Équipage",
  "Équipage",
  "CP9",
  "CP8",
  "CP7",
  "CP6",
  "CP5",
  "CP4",
  "CP3",
  "CP2",
  "CP1",
  "CP0",
  "CP-",
  "Shandia",
  "Ohara",
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

function normalizeSpace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function splitDelimited(raw) {
  return normalizeSpace(raw)
    .split(/[;,]/)
    .map((part) => normalizeSpace(part))
    .filter(Boolean);
}

function nextMarkerIndex(text, start) {
  let best = -1;
  for (const marker of AFFILIATION_MARKERS) {
    const idx = text.indexOf(marker, start);
    if (idx !== -1 && (best === -1 || idx < best)) {
      best = idx;
    }
  }
  return best;
}

function markerLengthAt(text, position) {
  let best = 0;
  for (const marker of AFFILIATION_MARKERS) {
    if (text.startsWith(marker, position) && marker.length > best) {
      best = marker.length;
    }
  }
  return best;
}

function splitByMarkers(raw) {
  const text = normalizeSpace(raw);
  if (!text) return [];

  const parts = [];
  let cursor = 0;

  while (cursor < text.length) {
    const currentMarkerLength = markerLengthAt(text, cursor);
    const searchFrom = Math.max(cursor + 1, cursor + currentMarkerLength);
    const next = nextMarkerIndex(text, searchFrom);
    if (next === -1) {
      parts.push(normalizeSpace(text.slice(cursor)));
      break;
    }

    parts.push(normalizeSpace(text.slice(cursor, next)));
    cursor = next;
  }

  return parts.filter(Boolean);
}

function splitAffiliation(frAffiliation, enMainAffiliation, enSubAffiliations) {
  const text = normalizeSpace(frAffiliation);
  if (!text) return { main: "", sub: "" };

  const hasDelimitedList = /[;,]/.test(text);
  const hasEnglishSub = normalizeSpace(enSubAffiliations).length > 0;

  const parts = hasDelimitedList
    ? splitDelimited(text)
    : hasEnglishSub
      ? splitByMarkers(text)
      : [text];

  if (parts.length === 0) return { main: "", sub: "" };

  const main = parts[0];
  const sub = parts.slice(1).join(",");

  if (!main && normalizeSpace(enMainAffiliation)) {
    return { main: text, sub: "" };
  }

  return { main, sub };
}

function extractAffiliationParts(main, sub, enSubAffiliations) {
  const hasEnglishSub = normalizeSpace(enSubAffiliations).length > 0;
  const combined = [];

  for (const value of [main, sub]) {
    const text = normalizeSpace(value).replace(/L',\s*Équipage/g, "L'Équipage");
    if (!text) continue;

    const parts = /[;,]/.test(text)
      ? splitDelimited(text)
      : hasEnglishSub
        ? splitByMarkers(text)
        : [text];

    combined.push(...parts);
  }

  return combined.filter(Boolean);
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const rows = lines.map(parseLine);
const header = rows[0];

const frAffIdx = header.indexOf("fr_wiki_affiliation");
const frMainIdx = header.indexOf("fr_wiki_mainaffiliation");
const frSubIdx = header.indexOf("fr_wiki_subaffiliations");
const enMainIdx = header.indexOf("en_wiki_mainaffiliation");
const enSubIdx = header.indexOf("en_wiki_subaffiliations");

if (frAffIdx === -1 && (frMainIdx === -1 || frSubIdx === -1)) {
  console.error("colonnes d'affiliation fr introuvables");
  process.exit(1);
}

if (frAffIdx !== -1) {
  header.splice(frAffIdx, 1, "fr_wiki_mainaffiliation", "fr_wiki_subaffiliations");
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  let main = "";
  let sub = "";

  if (frAffIdx !== -1) {
    ({ main, sub } = splitAffiliation(
      row[frAffIdx],
      enMainIdx === -1 ? "" : row[enMainIdx],
      enSubIdx === -1 ? "" : row[enSubIdx],
    ));
  } else {
    const parts = extractAffiliationParts(
      row[frMainIdx],
      row[frSubIdx],
      enSubIdx === -1 ? "" : row[enSubIdx],
    );
    main = parts[0] ?? "";
    sub = parts.slice(1).join(",");
  }

  if (frAffIdx !== -1) {
    row.splice(frAffIdx, 1, main, sub);
  } else {
    row[frMainIdx] = main;
    row[frSubIdx] = sub;
  }
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
