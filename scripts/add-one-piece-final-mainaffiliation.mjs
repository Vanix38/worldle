import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_MAIN_AFFILIATIONS = new Map([
  ["johnny", "Johnny et Yosaku"],
  ["yosaku", "Johnny et Yosaku"],
]);

const EN_TO_FINAL = new Map([
  ["Arabasta Kingdom", "Royaume d'Alabasta"],
  ["Arlong Pirates", "Équipage d'Arlong"],
  ["Aucune", "Aucune"],
  ["Baratie", "Baratie"],
  ["Barto Club", "Barto Club"],
  ["Beasts Pirates", "Équipage aux Cent Bêtes"],
  ["Beautiful Pirates", "Équipage des Magnifiques Pirates"],
  ["Big Mom Pirates", "Équipage de Big Mom"],
  ["Black Cat Pirates", "Équipage du Chat Noir"],
  ["Blackbeard Pirates", "Équipage de Barbe Noire"],
  ["Bliking Pirates", "Équipage du Bliking"],
  ["Bluejam Pirates", "Équipage de Bluejam"],
  ["Bonney Pirates", "Équipage de Bonney"],
  ["CP0", "CP-AIGIS0"],
  ["CP7", "CP7"],
  ["CP9", "CP9"],
  ["Caesar Clown", "César Clown"],
  ["Caribou Pirates", "Équipage de Caribou"],
  ["Charlotte Family", "Famille Charlotte"],
  ["Chinjao Family", "Famille Chinjao"],
  ["Corrida Colosseum", "Colisée Corrida"],
  ["Cross Guild", "Cross Guild"],
  ["Dadan Family", "Famille Dadan"],
  ["Donquixote Pirates", "Équipage de Don Quijote"],
  ["Dressrosa", "Dressrosa"],
  ["Drum Island", "Île de Drum"],
  ["Enies Lobby", "Enies Lobby"],
  ["Equipage de Gecko Moria", "Équipage de Gecko Moria"],
  ["Evil Black Drum Kingdom", "Royaume du Tambour Maléfique"],
  ["Fake Straw Hat Crew", "Faux Équipage du Chapeau de Paille"],
  ["Fallen Monk Pirates", "Équipage des Moines Dépravés"],
  ["Fire Tank Pirates", "Équipage du Fire Tank"],
  ["Flying Pirates", "Équipage des Pirates Volants"],
  ["Foxy Pirates", "Équipage de Foxy"],
  ["Franky Family", "Franky Family"],
  ["Freedom Fighters", "Armée de la Liberté"],
  ["Galley-La Company", "Galley-La Company"],
  ["Giant Warrior Pirates", "Équipage des Géants"],
  ["God's Army", "Armée Divine"],
  ["Happo Navy", "Flotte de Happou"],
  ["Hawkins Pirates", "Équipage de Hawkins"],
  ["Heart Pirates", "Équipage du Heart"],
  ["Hocker", "Hokker"],
  ["Ideo Pirates", "Équipage d'Ideo"],
  ["Ile des Animaux Rares", "Île des Animaux Rares"],
  ["Ile des Hommes Poissons", "Île des Hommes-Poissons"],
  ["Impel Down", "Impel Down"],
  ["Johnny", "Johnny"],
  ["Kamabakka Kingdom", "Royaume de Kamabakka"],
  ["Kid Pirates", "Équipage de Kid"],
  ["Kokoro", "Kokoro"],
  ["Kouzuki Family", "Famille Kozuki"],
  ["Krieg Pirates", "Armada de Don Krieg"],
  ["Kuja Pirates", "Équipage des Pirates Kuja"],
  ["Kurozumi Family", "Famille Kurozumi"],
  ["Little Pirates", "Little Pirates"],
  ["MADS", "MADS"],
  ["Maelstrom Spider Pirates", "Équipage des Maelstrom Spider"],
  ["Marines", "Marine"],
  ["Marines G-1 Branch", "Marine G-1"],
  ["Mermaid Cafe", "Mermaid Café"],
  ["Mokomo Dukedom", "Principauté de Mokomo"],
  ["NEO MADS", "NEO MADS"],
  ["Neptune Family", "Famille Neptune"],
  ["New Fish-Man Pirates", "Équipage des Nouveaux Hommes-Poissons"],
  ["New Giant Warrior Pirates", "Nouvel Équipage des Géants"],
  ["New Spiders Cafe", "Spiders Café"],
  ["Newkama Land", "Newkama Land"],
  ["Ninja-Pirate-Mink-Samurai Alliance", "Alliance des Ninjas-Pirates-Minks-Samouraïs"],
  ["Ohara Archaeologists", "Archéologues d'Ohara"],
  ["On Air Pirates", "Équipage du On-Air"],
  ["Pumpkin Cafe", "Café Potiron"],
  ["Red Hair Pirates", "Équipage du Roux"],
  ["Revolutionary Army", "Armée Révolutionnaire"],
  ["Riku Family", "Famille Riku"],
  ["Roger Pirates", "Équipage des Pirates de Roger"],
  ["Rolling Pirates", "Équipage du Rolling"],
  ["Rumbar Pirates", "Équipage du Rumbar"],
  ["Sakura Kingdom", "Royaume des Cerisiers"],
  ["Saruyama Alliance", "Alliance Saruyama"],
  ["Seven Warlords of the Sea", "Sept grands corsaires"],
  ["Shakky's Rip-off Bar", "Bar de l'Arnaque"],
  ["Shandia", "Shandia"],
  ["Shimotsuki Family", "Famille Shimotsuki"],
  ["Skypiea", "Skypiéa"],
  ["Straw Hat Pirates", "Équipage du Chapeau de Paille"],
  ["Sun Pirates", "Équipage des Pirates du Soleil"],
  ["Super Spot-Billed Duck Troops", "Escadron des Super Canards Spot-Billed"],
  ["Takoyaki 8", "Takoyaki 8"],
  ["Thriller Bark Pirates", "Thriller Bark"],
  ["Tom's Workers", "Tom's Workers"],
  ["Tontatta Kingdom", "Royaume de Tontatta"],
  ["Ukkari Hot-Spring Island", "Île Thermale d'Ukkari"],
  ["Vegapunk", "Vegapunk"],
  ["Vinsmoke Family", "Famille Vinsmoke"],
  ["Walrus School", "École du Morse"],
  ["Weatheria", "Weatheria"],
  ["Whitebeard Pirates", "Équipage de Barbe Blanche"],
  ["World Economy News Paper", "World Economy News Paper"],
  ["World Government", "Gouvernement Mondial"],
  ["Yamato", "Yamato"],
  ["Yonta Maria Grand Fleet", "Grande Flotte du Yonta Maria"],
  ["Yosaku", "Yosaku"],
]);

const FR_EXACT = new Map([
  ["", ""],
  ["Aucune", "Aucune"],
  ["Alabasta", "Royaume d'Alabasta"],
  ["Alliance Baggy et Alvida/Les Pirates d'Expédition", "Alliance Baggy et Alvida"],
  ["Armée RévolutionnaireRoyaume de KamabakkaNewcomer Land", "Armée Révolutionnaire"],
  ["Armée Révolutionnaire.", "Armée Révolutionnaire"],
  ["Bar de l'ArnaqueSilvers Rayleigh", "Bar de l'Arnaque"],
  ["Baroque Works Spider's", "Baroque Works"],
  ["Clan d'Ener", "Armée Divine"],
  ["CP-AIGIS0Pègre", "CP-AIGIS0"],
  ["Colisée Corrida Forces Royales Riku", "Colisée Corrida"],
  ["Cross GuildLes Pirates d'Expédition", "Cross Guild"],
  ["César Clown espionnage", "César Clown"],
  ["César Clown Unité de Patrouille Centaure", "César Clown"],
  ["Dressrosa Colisée Corrida", "Dressrosa"],
  ["Dracule MihawkRoronoa Zoro", "Cross Guild"],
  ["Erbaf Les Pirates d'Expédition", "Erbaf"],
  ["ErbafLes Pirates d'Expédition", "Erbaf"],
  ["Famille Kozuki Orochi Oniwabanshu", "Famille Kozuki"],
  ["Famille de Neptune", "Famille Neptune"],
  ["Famille royale du royaume Ryugu", "Famille Neptune"],
  ["Grand corsaire", "Sept grands corsaires"],
  ["Galley-La Company Water Seven", "Galley-La Company"],
  ["Gang du Pays des Fleurs", "Famille Chinjao"],
  ["Gouvernement Mondial Enies Lobby", "Gouvernement Mondial"],
  ["Hommes-poissons", "Famille Neptune"],
  ["Kujas", "Équipage des Pirates Kuja"],
  ["L'", ""],
  ["La", ""],
  ["L’Équipage aux Cent Bêtes", "Équipage aux Cent Bêtes"],
  ["L'Équipage aux Cent Bêtes", "Équipage aux Cent Bêtes"],
  ["L’Équipage d'Arlong", "Équipage d'Arlong"],
  ["L'Équipage d'Arlong", "Équipage d'Arlong"],
  ["L'Équipage d'Alvida", "Équipage d'Alvida"],
  ["L’Équipage d'Ideo", "Équipage d'Ideo"],
  ["L'Équipage d'Ideo", "Équipage d'Ideo"],
  ["L’Équipage de Barbe Blanche", "Équipage de Barbe Blanche"],
  ["L'Équipage de Barbe Blanche", "Équipage de Barbe Blanche"],
  ["L’Équipage de Barbe Noire", "Équipage de Barbe Noire"],
  ["L'Équipage de Barbe Noire", "Équipage de Barbe Noire"],
  ["L'Équipage de Barbe Noire Les Prisonniers d'", "Équipage de Barbe Noire"],
  ["L’Équipage de Bellamy", "Équipage de Bellamy"],
  ["L'Équipage de Bellamy", "Équipage de Bellamy"],
  ["L’Équipage de Big Mom", "Équipage de Big Mom"],
  ["L'Équipage de Big Mom", "Équipage de Big Mom"],
  ["L’Équipage de Bluejam", "Équipage de Bluejam"],
  ["L'Équipage de Bluejam", "Équipage de Bluejam"],
  ["L’Équipage de Bonney", "Équipage de Bonney"],
  ["L'Équipage de Bonney", "Équipage de Bonney"],
  ["L’Équipage de Caribou", "Équipage de Caribou"],
  ["L'Équipage de Caribou", "Équipage de Caribou"],
  ["L'Équipage de Caribou Faux", "Équipage de Caribou"],
  ["L’Équipage de Don Quichotte Doflamingo", "Équipage de Don Quijote"],
  ["L'Équipage de Don Quichotte Doflamingo", "Équipage de Don Quijote"],
  ["L’Équipage de Foxy", "Équipage de Foxy"],
  ["L'Équipage de Foxy Davy Back Fight", "Équipage de Foxy"],
  ["L’Équipage de Hawkins", "Équipage de Hawkins"],
  ["L'Équipage de Hawkins", "Équipage de Hawkins"],
  ["L’Équipage de Kid", "Équipage de Kid"],
  ["L'Équipage de Kid", "Équipage de Kid"],
  ["L’Équipage de Rocks", "Équipage de Rocks"],
  ["L'Équipage de Rocks", "Équipage de Rocks"],
  ["L’Équipage de X. Barrels", "Équipage de X. Barrels"],
  ["L'Équipage de X. Barrels", "Équipage de X. Barrels"],
  ["L’Équipage des Géants", "Équipage des Géants"],
  ["L'Équipage des Géants", "Équipage des Géants"],
  ["L'Équipage des Géants Erbaf", "Équipage des Géants"],
  ["L'Équipage des Géants Staff d'Enies Lobby", "Équipage des Géants"],
  ["L’Équipage des Nouveaux Hommes-Poissons", "Équipage des Nouveaux Hommes-Poissons"],
  ["L'Équipage des Nouveaux Hommes-Poissons", "Équipage des Nouveaux Hommes-Poissons"],
  ["L’Équipage des Pirates Kuja", "Équipage des Pirates Kuja"],
  ["L'Équipage des Pirates Kuja", "Équipage des Pirates Kuja"],
  ["L'Équipage des Pirates Roger East Blue (Loguetown)", "Équipage des Pirates de Roger"],
  ["L’Équipage des Pirates Volants", "Équipage des Pirates Volants"],
  ["L'Équipage des Pirates Volants", "Équipage des Pirates Volants"],
  ["L’Équipage des Pirates de Roger", "Équipage des Pirates de Roger"],
  ["L'Équipage des Pirates de Roger", "Équipage des Pirates de Roger"],
  ["L’Équipage des Pirates du Soleil", "Équipage des Pirates du Soleil"],
  ["L'Équipage des Pirates du Soleil", "Équipage des Pirates du Soleil"],
  ["L’Équipage du Chapeau de Paille", "Équipage du Chapeau de Paille"],
  ["L'Équipage du Chapeau de Paille", "Équipage du Chapeau de Paille"],
  ["L’Équipage du Chat Noir", "Équipage du Chat Noir"],
  ["L'Équipage du Chat Noir", "Équipage du Chat Noir"],
  ["L’Équipage du Clown", "Équipage du Clown"],
  ["L'Équipage du Clown", "Équipage du Clown"],
  ["L’Équipage du Fire Tank", "Équipage du Fire Tank"],
  ["L'Équipage du Fire Tank", "Équipage du Fire Tank"],
  ["L’Équipage du Heart", "Équipage du Heart"],
  ["L'Équipage du Heart", "Équipage du Heart"],
  ["L’Équipage du Rolling", "Équipage du Rolling"],
  ["L'Équipage du Rolling", "Équipage du Rolling"],
  ["L'Équipage du RollingAssociation des Victimes de", "Équipage du Rolling"],
  ["L’Équipage du Roux", "Équipage du Roux"],
  ["L'Équipage du Roux", "Équipage du Roux"],
  ["L’", ""],
  ["L'Équipage du Rumbar Crocus", "Équipage du Rumbar"],
  ["Marine L'Escadre des Harpons Noirs", "Marine"],
  ["Marine L’Escadre des Harpons Noirs", "Marine"],
  ["Marines", "Marine"],
  ["Marines Clan des D", "Marine"],
  ["MarineG-1", "Marine G-1"],
  ["MarineG-5", "Marine G-5"],
  ["MarinesG-1", "Marine G-1"],
  ["New Comer LandBaroque Woks", "Newkama Land"],
  ["O-Niwaban Pays de Wa", "O-Niwaban"],
  ["Royaume des CerisiersRoyaume de Drum", "Royaume des Cerisiers"],
  ["Révolutionnaires", "Armée Révolutionnaire"],
  ["Révolutionnaires Kedétrav", "Armée Révolutionnaire"],
  ["Shandias", "Shandia"],
  ["Shandia Gardes de Dieu", "Shandia"],
  ["Spiders", "Spiders Café"],
  ["Water SevenGalley-La Company", "Water Seven"],
  ["Zo Pirates de Nox", "Zou"],
  ["Zou Unité des mousquetaires", "Principauté de Mokomo"],
  ["Équipage de Barbe Blanche", "Équipage de Barbe Blanche"],
  ["Équipage de Barbe Noire", "Équipage de Barbe Noire"],
  ["Équipage de Big Mom", "Équipage de Big Mom"],
  ["Équipage de Chapeau de Paille", "Équipage du Chapeau de Paille"],
  ["Équipage de Don Quijote", "Équipage de Don Quijote"],
  ["Équipage de Don Quichotte Doflamingo", "Équipage de Don Quijote"],
  ["Équipage de Hawkins", "Équipage de Hawkins"],
  ["Équipage du ClownSecond de l'", "Équipage du Clown"],
  ["Équipage du HeartTribu des Minks", "Équipage du Heart"],
  ["Équipage des cent bêtes", "Équipage aux Cent Bêtes"],
  ["Île de Drum L'", "Île de Drum"],
]);

const SPLIT_MARKERS = [
  "Alliance",
  "Armada",
  "Armée",
  "Bar de l'Arnaque",
  "Baroque Works",
  "Café",
  "CP-AIGIS0",
  "Cross Guild",
  "César Clown",
  "Équipage",
  "Famille",
  "Flotte",
  "Franky Family",
  "Galley-La Company",
  "Gouvernement Mondial",
  "Grande Flotte",
  "Impel Down",
  "Johnny",
  "Kujas",
  "L'Équipage",
  "L’Escadre",
  "Marine",
  "Marines",
  "MADS",
  "Mermaid Café",
  "New Comer Land",
  "NEO MADS",
  "O-Niwaban",
  "Ohara",
  "Pègre",
  "Principauté",
  "Quatre Empereurs",
  "Royaume",
  "Révolutionnaires",
  "Sept grands corsaires",
  "Shandia",
  "Takoyaki 8",
  "Tom's Workers",
  "Vegapunk",
  "Weatheria",
  "World Economy News Paper",
  "Yosaku",
  "espionnage",
];

const GENERIC_VALUES = new Set([
  "Allié de",
  "Civil",
  "Grand corsaire",
  "Quatre Empereurs",
  "Sept grands corsaires",
  "Subordonné de",
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

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function nextMarkerIndex(text, start) {
  let best = -1;
  for (const marker of SPLIT_MARKERS) {
    const idx = text.indexOf(marker, start);
    if (idx !== -1 && (best === -1 || idx < best)) {
      best = idx;
    }
  }
  return best;
}

function markerLengthAt(text, position) {
  let best = 0;
  for (const marker of SPLIT_MARKERS) {
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

function normalizeFrMainAffiliation(value) {
  let text = cleanText(value)
    .replace(/^L',\s*/g, "L'")
    .replace(/\.$/, "");

  if (!text) return "";
  if (FR_EXACT.has(text)) return FR_EXACT.get(text);

  if (/[\/;,]/.test(text)) {
    text = cleanText(text.split(/[\/;,]/)[0]);
  }

  const parts = splitByMarkers(text);
  if (parts.length > 1) {
    text = parts[0];
  }

  text = cleanText(text)
    .replace(/^L',\s*/g, "L'")
    .replace(/\s+L'Escadre.*$/i, "")
    .replace(/\s+Les Pirates d'Expédition.*$/i, "")
    .replace(/\s+de l'.*$/i, (match) => (match.startsWith(" de l'") ? match : ""))
    .trim();

  if (FR_EXACT.has(text)) return FR_EXACT.get(text);
  return text;
}

function translateEnMainAffiliation(value) {
  const text = cleanText(value);
  if (!text) return "";
  return EN_TO_FINAL.get(text) ?? text;
}

function isGeneric(value) {
  return GENERIC_VALUES.has(value);
}

function hasStructuredKeyword(value) {
  return /(Équipage|Famille|Royaume|Marine|Armée|Alliance|Flotte|CP-|CP\d|Gouvernement|Cross Guild|MADS|Baroque Works|Impel Down|Colisée|Café|Bar|Principauté|Franky Family|Tom's Workers|World Economy News Paper|Takoyaki|Galley-La Company|O-Niwaban)/i.test(
    value,
  );
}

function computeFinalMainAffiliation(id, enMain, frMain, existingFinal) {
  if (VERIFIED_MAIN_AFFILIATIONS.has(id)) {
    return VERIFIED_MAIN_AFFILIATIONS.get(id);
  }

  const fr = normalizeFrMainAffiliation(frMain);
  const en = translateEnMainAffiliation(enMain);

  if (fr && en) {
    if (fr === en) return fr;
    if (isGeneric(fr) && !isGeneric(en)) return en;
    if (!hasStructuredKeyword(fr) && hasStructuredKeyword(en)) return en;
    return fr;
  }

  if (fr) return fr;
  if (en) return en;

  const existing = cleanText(existingFinal);
  if (existing) return existing;

  return "Aucune";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enMainIdx = header.indexOf("en_wiki_mainaffiliation");
const frMainIdx = header.indexOf("fr_wiki_mainaffiliation");
let finalMainIdx = header.indexOf("final_mainaffiliation");

if (finalMainIdx === -1) {
  const insertAt = header.indexOf("final_age");
  finalMainIdx = insertAt === -1 ? header.length : insertAt;
  header.splice(finalMainIdx, 0, "final_mainaffiliation");
  for (let i = 1; i < rows.length; i++) {
    rows[i].splice(finalMainIdx, 0, "");
  }
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalMainIdx] = computeFinalMainAffiliation(
    row[idIdx],
    enMainIdx === -1 ? "" : row[enMainIdx],
    frMainIdx === -1 ? "" : row[frMainIdx],
    row[finalMainIdx],
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
