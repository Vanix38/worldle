import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const OCCUPATION_MARKERS = [
  "Agent du Cipher Pol",
  "Agent Officier",
  "Capitaine Pirate",
  "Pirate Capitaine",
  "Grand corsaire",
  "Vice-Amiral",
  "Contre-Amiral",
  "Commandant de la",
  "Commandant du",
  "Commandant des",
  "Commandante de la",
  "Commandante du",
  "Chef de l'Unité",
  "Chef de l'armée",
  "Chef de la",
  "Chef du",
  "Membre des",
  "Membre de la",
  "Membre de l'",
  "Membre du",
  "Gardien en Chef",
  "Garde du corps",
  "Prisonnier d'Impel Down",
  "Prisonnière d'Impel Down",
  "Secrétaire de charme de Tom",
  "Conductrice du Puffing Tom",
  "Capitaine des Gardiens de Zo",
  "Officier de la Marine",
  "Inspecteur Général",
  "Propriétaire de Mermaid Café",
  "Prince",
  "Princesse",
  "Empereur",
  "Esclave",
  "Lauréat",
  "Scientifique",
  "Aventurier",
  "Leader",
  "Pirate",
  "Assassin",
  "Secrétaire",
  "Charpentier",
  "Docteur",
  "Doctoresse",
  "Voleur",
  "Dragon Céleste",
  "Mentor",
  "Prisonnier",
  "Prisonnière",
  "Mercenaires",
  "Mercenaire",
  "Assassins",
  "Snipers",
  "Navigateur",
  "Oiran",
  "Amiral",
  "Commandant",
  "Commandante",
  "Chef",
  "Guerrier",
  "Samouraï",
  "Tobiroppo",
  "Ninja",
  "Kunoichi",
  "Serveuse",
  "Gérante de Bar",
  "Mécanicien",
  "Ministre",
  "Roi",
  "Reine",
  "Civil",
  "Animal de compagnie",
  "Animal",
  "Okama",
  "Dieu",
  "Cuisinier",
  "Courtier",
  "Conseiller",
  "Informateur",
  "Musicien",
  "Sabreur",
  "Teinturier",
  "Gladiateur",
  "Soubrette",
  "Tueuse",
  "Timonier",
  "Reporter",
  "Pasteur",
  "Mousse",
  "Épéiste",
  "Officier",
  "Lieutenant",
  "Daimyo",
  "Shogun",
  "Archéologue",
  "Juge",
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
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function splitDelimited(raw) {
  return cleanText(raw)
    .split(/[;,/]/)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

function nextMarkerIndex(text, start) {
  let best = -1;
  for (const marker of OCCUPATION_MARKERS) {
    const idx = text.indexOf(marker, start);
    if (idx !== -1 && (best === -1 || idx < best)) {
      best = idx;
    }
  }
  return best;
}

function markerLengthAt(text, position) {
  let best = 0;
  for (const marker of OCCUPATION_MARKERS) {
    if (text.startsWith(marker, position) && marker.length > best) {
      best = marker.length;
    }
  }
  return best;
}

function splitByMarkers(raw) {
  const text = cleanText(raw);
  if (!text) return [];

  const parts = [];
  let cursor = 0;

  while (cursor < text.length) {
    const currentMarkerLength = markerLengthAt(text, cursor);
    const searchFrom = Math.max(cursor + 1, cursor + currentMarkerLength);
    const next = nextMarkerIndex(text, searchFrom);

    if (next === -1) {
      parts.push(cleanText(text.slice(cursor)));
      break;
    }

    parts.push(cleanText(text.slice(cursor, next)));
    cursor = next;
  }

  return parts.filter(Boolean);
}

function splitOccupation(frOccupation, enCurrent, enOther) {
  const text = cleanText(frOccupation);
  if (!text) return { current: "", others: "" };

  const hasDelimited = /[;,/]/.test(text);
  const markerParts = splitByMarkers(text);
  const parts = hasDelimited
    ? splitDelimited(text)
    : markerParts.length > 1
      ? markerParts
      : [text];

  if (parts.length === 0) return { current: "", others: "" };

  return {
    current: parts[0],
    others: parts.slice(1).join(","),
  };
}

function extractOccupationParts(current, others, enCurrent, enOther) {
  const parts = [];

  for (const value of [current, others]) {
    const text = cleanText(value);
    if (!text) continue;

    const markerParts = splitByMarkers(text);
    const chunks = /[;,/]/.test(text)
      ? splitDelimited(text)
      : markerParts.length > 1
        ? markerParts
        : [text];

    parts.push(...chunks);
  }

  return parts.filter(Boolean);
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const rows = lines.map(parseLine);
const header = rows[0];

const frOccIdx = header.indexOf("fr_wiki_occupation");
const frCurrentIdx = header.indexOf("fr_wiki_occupation_actuelle");
const frOtherIdx = header.indexOf("fr_wiki_autres_occupations");
const enCurrentIdx = header.indexOf("en_wiki_occupation_actuelle");
const enOtherIdx = header.indexOf("en_wiki_autres_occupations");

if (frOccIdx === -1 && (frCurrentIdx === -1 || frOtherIdx === -1)) {
  console.error("colonnes occupation fr introuvables");
  process.exit(1);
}

if (frOccIdx !== -1) {
  header.splice(frOccIdx, 1, "fr_wiki_occupation_actuelle", "fr_wiki_autres_occupations");
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  let current = "";
  let others = "";

  if (frOccIdx !== -1) {
    ({ current, others } = splitOccupation(
      row[frOccIdx],
      enCurrentIdx === -1 ? "" : row[enCurrentIdx],
      enOtherIdx === -1 ? "" : row[enOtherIdx],
    ));
  } else {
    const parts = extractOccupationParts(
      row[frCurrentIdx],
      row[frOtherIdx],
      enCurrentIdx === -1 ? "" : row[enCurrentIdx],
      enOtherIdx === -1 ? "" : row[enOtherIdx],
    );
    current = parts[0] ?? "";
    others = parts.slice(1).join(",");
  }

  if (frOccIdx !== -1) {
    row.splice(frOccIdx, 1, current, others);
  } else {
    row[frCurrentIdx] = current;
    row[frOtherIdx] = others;
  }
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
