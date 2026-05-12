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
  "MADS",
  "Marines",
  "Marine",
  "Gouvernement Mondial",
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
  "Yosaku",
  "Johnny",
];

const OCCUPATION_MARKERS = [
  "Agent",
  "Amiral",
  "Animal",
  "Apprentie",
  "Assassin",
  "Aventurier",
  "Barman",
  "Capitaine",
  "Charpentier",
  "Chef",
  "Cheffe",
  "Chasseur",
  "Combattant",
  "Commandant",
  "Commandante",
  "Conductrice",
  "Conseiller",
  "Contre-Amiral",
  "Cuisinier",
  "Daimyo",
  "Dieu",
  "Directeur",
  "Docteur",
  "Doctoresse",
  "Dragon Céleste",
  "Empereur",
  "Esclave",
  "Expert",
  "Gardien",
  "Garde du corps",
  "Gérante",
  "Gladiateur",
  "Guerrier",
  "Instructeur",
  "Inspecteur",
  "Juge",
  "Kunoichi",
  "Lauréat",
  "Leader",
  "Lieutenant",
  "Magistrat",
  "Maire",
  "Maître",
  "Mécanicien",
  "Membre",
  "Mercenaire",
  "Mercenaires",
  "Ministre",
  "Musicien",
  "Navigateur",
  "Ninja",
  "Noble",
  "Officier",
  "Oiran",
  "Pasteur",
  "Pirate",
  "Prince",
  "Princesse",
  "Prélat",
  "Propriétaire",
  "Reine",
  "Reporter",
  "Roi",
  "Sabreur",
  "Samouraï",
  "Scientifique",
  "Secrétaire",
  "Serveuse",
  "Shogun",
  "Sniper",
  "Soubrette",
  "Teinturier",
  "Timonier",
  "Tobiroppo",
  "Vice-Amiral",
  "Zombie",
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
    .replace(/\s*;\s*/g, ";")
    .trim();
}

function nextMarkerIndex(text, start, markers) {
  let best = -1;
  for (const marker of markers) {
    const idx = text.indexOf(marker, start);
    if (idx !== -1 && (best === -1 || idx < best)) {
      best = idx;
    }
  }
  return best;
}

function markerLengthAt(text, position, markers) {
  let best = 0;
  for (const marker of markers) {
    if (text.startsWith(marker, position) && marker.length > best) {
      best = marker.length;
    }
  }
  return best;
}

function splitByMarkers(raw, markers) {
  const text = cleanText(raw);
  if (!text) return [];

  const parts = [];
  let cursor = 0;

  while (cursor < text.length) {
    const currentMarkerLength = markerLengthAt(text, cursor, markers);
    const searchFrom = Math.max(cursor + 1, cursor + currentMarkerLength);
    const next = nextMarkerIndex(text, searchFrom, markers);

    if (next === -1) {
      parts.push(cleanText(text.slice(cursor)));
      break;
    }

    parts.push(cleanText(text.slice(cursor, next)));
    cursor = next;
  }

  return parts.filter(Boolean);
}

function splitDelimited(raw, regex) {
  return cleanText(raw)
    .split(regex)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

function splitSubaffiliations(raw) {
  const text = cleanText(raw).replace(/L',\s*Équipage/g, "L'Équipage");
  if (!text || /^aucune$/i.test(text)) return [];
  if (/[;,/\\]/.test(text)) {
    return splitDelimited(text, /[;,/\\]+/).flatMap((part) => {
      const nested = splitByMarkers(part, AFFILIATION_MARKERS);
      return nested.length > 1 ? nested : [part];
    });
  }
  return splitByMarkers(text, AFFILIATION_MARKERS);
}

function splitAliases(raw) {
  const text = cleanText(raw);
  if (!text) return [];
  return splitDelimited(text, /[;,/\\]+/);
}

function splitOtherOccupations(raw) {
  const text = cleanText(raw);
  if (!text || /^aucune$/i.test(text)) return [];
  if (/[;,/\\]/.test(text)) {
    return splitDelimited(text, /[;,/\\]+/).flatMap((part) => {
      const nested = splitByMarkers(part, OCCUPATION_MARKERS);
      return nested.length > 1 ? nested : [part];
    });
  }
  return splitByMarkers(text, OCCUPATION_MARKERS);
}

function normalizeKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[.'"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeItems(frValue, enValue, splitter) {
  const items = [];
  const seen = new Set();

  for (const item of [...splitter(frValue), ...splitter(enValue)]) {
    const key = normalizeKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items.join(",");
}

function insertColumn(header, rows, name, insertAt) {
  header.splice(insertAt, 0, name);
  for (let i = 1; i < rows.length; i++) rows[i].splice(insertAt, 0, "");
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const enSubIdx = header.indexOf("en_wiki_subaffiliations");
const frSubIdx = header.indexOf("fr_wiki_subaffiliations");
const enAliasesIdx = header.indexOf("en_wiki_aliases");
const frAliasesIdx = header.indexOf("fr_wiki_aliases");
const enOtherOccIdx = header.indexOf("en_wiki_autres_occupations");
const frOtherOccIdx = header.indexOf("fr_wiki_autres_occupations");

if (header.indexOf("final_subaffiliations") === -1) {
  const finalMainIdx = header.indexOf("final_mainaffiliation");
  insertColumn(header, rows, "final_subaffiliations", finalMainIdx === -1 ? header.length : finalMainIdx + 1);
}

if (header.indexOf("final_aliases") === -1) {
  const finalSubIdx = header.indexOf("final_subaffiliations");
  insertColumn(header, rows, "final_aliases", finalSubIdx === -1 ? header.length : finalSubIdx + 1);
}

if (header.indexOf("final_autres_occupations") === -1) {
  const finalOccIdx = header.indexOf("final_occupation_actuelle");
  insertColumn(header, rows, "final_autres_occupations", finalOccIdx === -1 ? header.length : finalOccIdx + 1);
}

const finalSubIdx = header.indexOf("final_subaffiliations");
const finalAliasesIdx = header.indexOf("final_aliases");
const finalOtherOccIdx = header.indexOf("final_autres_occupations");

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalSubIdx] = mergeItems(
    frSubIdx === -1 ? "" : row[frSubIdx],
    enSubIdx === -1 ? "" : row[enSubIdx],
    splitSubaffiliations,
  );
  row[finalAliasesIdx] = mergeItems(
    frAliasesIdx === -1 ? "" : row[frAliasesIdx],
    enAliasesIdx === -1 ? "" : row[enAliasesIdx],
    splitAliases,
  );
  row[finalOtherOccIdx] = mergeItems(
    frOtherOccIdx === -1 ? "" : row[frOtherOccIdx],
    enOtherOccIdx === -1 ? "" : row[enOtherOccIdx],
    splitOtherOccupations,
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
