import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_OCCUPATIONS = new Map([
  ["absalom", "Commandant en chef des zombies et des soldats zombies"],
  ["bellemere", "Cultivatrice de mandarines"],
  ["bartholomew-kuma", "Commandant de l'Armée Révolutionnaire"],
  ["boa-marigold", "Pirate"],
  ["boa-sandersonia", "Pirate"],
  ["charlotte-praline", "Ministre du Design"],
  ["chinjao", "12e chef de la flotte de Happou"],
  ["hack", "Maître du Karaté des Hommes-Poissons"],
  ["izou", "Commandant de la 16e division de l'Équipage de Barbe Blanche"],
  ["koala", "Officière de l'Armée Révolutionnaire"],
  ["meuh-meuh", "Animal de compagnie"],
  ["monkey-d-dragon", "Chef de l'Armée Révolutionnaire"],
  ["pedro", "Capitaine des Gardiens de Zo"],
  ["perona", "Pirate"],
  ["sabo", "Chef d'état-major de l'Armée Révolutionnaire"],
  ["sainte-rosward-sharlia", "Noble mondiale"],
  ["yamato", "Civil"],
  ["zeff", "Chef cuisinier du Baratie"],
]);

const EN_EXACT = new Map([
  ["", ""],
  ["2nd DivisionCommander", "Commandant de la 2e division de l'Équipage de Barbe Blanche"],
  ["Admiral", "Amiral"],
  ["Adventurer", "Aventurier"],
  ["All-Star", "Calamité"],
  ["Archaeologist", "Archéologue"],
  ["Army Commander of the Revolutionary Army", "Commandant de l'Armée Révolutionnaire"],
  ["Bartender", "Barman"],
  ["Bounty Hunter", "Chasseur de primes"],
  ["Caesar's secretary", "Secrétaire"],
  ["Captain", "Capitaine"],
  ["Captain of SWORD", "Capitaine de SWORD"],
  ["Captain of the Guardians", "Capitaine des Gardiens de Zo"],
  ["Captain of the Kuja Pirates", "Capitaine des Pirates Kuja"],
  ["Captain of the Third Ship of the Straw Hat Grand Fleet", "Commandant de la 3e flotte du Chapeau de Paille"],
  ["Captain of the Sixth Ship of the Straw Hat Grand Fleet", "Commandant de la 6e flotte du Chapeau de Paille"],
  ["Captain of the Seventh Ship of the Straw Hat Grand Fleet", "Commandant de la 7e flotte du Chapeau de Paille"],
  ["Captain of the First Ship of the Straw Hat Grand Fleet", "Commandant de la 1re flotte du Chapeau de Paille"],
  ["Captain of the Second Ship of the Straw Hat Grand Fleet", "Commandant de la 2e flotte du Chapeau de Paille"],
  ["Captain of the Fourth Ship of the Straw Hat Grand Fleet", "Commandant de la 4e flotte du Chapeau de Paille"],
  ["Captain of the Fifth Ship of the Straw Hat Grand Fleet", "Commandant de la 5e flotte du Chapeau de Paille"],
  ["Cafe Delivery Boy", "Livreur du Spiders Cafe"],
  ["Cafe Employee", "Employé du Spiders Cafe"],
  ["Cafe Patissier", "Patissière du Spiders Cafe"],
  ["Cafe Waitress", "Serveuse du Spiders Cafe"],
  ["Chief Justices of Enies Lobby", "Juge du Tribunal"],
  ["Chief Warden", "Directeur"],
  ["Cipher Pol Agent", "Agent du Cipher Pol"],
  ["Coating Mechanic", "Mécanicien du revêtement"],
  ["Commodore", "Contre-Amiral"],
  ["Commander of Royal Guards", "Commandant de l'Armée Royale"],
  ["Combatant", "Combattant"],
  ["Cook", "Cuisinier"],
  ["Daimyo", "Daimyo"],
  ["Daimyo of Ringo", "Daimyo de Ringo"],
  ["Dial Boat Engineer", "Ingénieur des bateaux-dials"],
  ["Dismantler", "Désosseur"],
  ["Dock 1 Foreman", "Contremaître du Quai 1"],
  ["Dock One Foreman", "Contremaître du Quai 1"],
  ["Doctor", "Docteur"],
  ["Dojo Master", "Maître de dojo"],
  ["Dyer", "Teinturier"],
  ["East Army Commander of the Revolutionary Army", "Commandante de l'Armée de l'Est"],
  ["Environmental Minister", "Ministre royal de l'environnement"],
  ["Executive Chef", "Chef cuisinier"],
  ["Fleet Admiral", "Amiral en chef"],
  ["G Army Commander of the Revolutionary Army", "Commandant de l'Armée G"],
  ["Gladiator", "Gladiateur"],
  ["God of Skypiea", "Dieu de Skypiéa"],
  ["Governor-General", "Gouverneur général"],
  ["Guardian of the Island of Rare AnimalsPirate", "Gardien de l'Île des Animaux Rares"],
  ["Head-Doctor of the Sakura Kingdom", "Docteur"],
  ["History TeacherVice Admiral", "Professeur d'Histoire"],
  ["Head Chef of Baratie, Pirate Captain", "Chef cuisinier du Baratie"],
  ["Inspector General", "Inspecteur Général"],
  ["King", "Roi"],
  ["King of Arabasta", "Roi d'Alabasta"],
  ["King of the Ryugu Kingdom", "Roi du royaume Ryugu"],
  ["Kunoichi", "Kunoichi"],
  ["Kunoichi in training", "Apprentie kunoichi"],
  ["Leader of the Centaur Patrol Unit", "Chef de l'Unité de patrouille centaure"],
  ["Marine Captain", "Capitaine de la Marine"],
  ["Marine Commander", "Commandant de la Marine"],
  ["Marine Officer", "Officier de la Marine"],
  ["Mikan Farmer", "Cultivatrice de mandarines"],
  ["Mercenaries", "Mercenaires"],
  ["Musketeer", "Mousquetaire"],
  ["Musician", "Musicien"],
  ["Navigator", "Navigateur"],
  ["Ninja", "Ninja"],
  ["North Army Commander of the Revolutionary Army", "Commandant de l'Armée du Nord"],
  ["Oiran", "Oiran"],
  ["Pet", "Animal de compagnie"],
  ["Pirate", "Pirate"],
  ["Pirate Captain", "Capitaine Pirate"],
  ["Pirate Elite Officer", "Officier d'élite pirate"],
  ["Pirate Executive Officer", "Officier exécutif pirate"],
  ["Pirate Officer", "Officier pirate"],
  ["Pirate Special Officer", "Officier spécial pirate"],
  ["Prince", "Prince"],
  ["Prince of the Ryugu Kingdom", "Prince du royaume Ryugu"],
  ["Princess", "Princesse"],
  ["Princess of Arabasta", "Princesse d'Alabasta"],
  ["Princess of Dressrosa", "Princesse de Dressrosa"],
  ["Princess of the Ryugu Kingdom", "Princesse du royaume Ryugu"],
  ["Priest of Enel", "Prélat"],
  ["Priest of Enel, Head Clerk of Hot Springs Resort", "Prélat"],
  ["President of the Galley-La Company", "Président de Galley-La Company"],
  ["Proprietor of the Mermaid Cafe", "Propriétaire de Mermaid Cafe"],
  ["Queen of Newkama Land", "Reine de Newkama Land"],
  ["Queen of the Ryugu Kingdom", "Reine du royaume Ryugu"],
  ["Rear Admiral", "Contre-Amiral"],
  ["Revolutionary", "Révolutionnaire"],
  ["Revolutionary Army Officer", "Officière de l'Armée Révolutionnaire"],
  ["Ruler of Mokomo Dukedom", "Souverain de la principauté de Mokomo"],
  ["Ruler of Amazon Lily", "Pirate"],
  ["Samurai", "Samouraï"],
  ["Scientist", "Scientifique"],
  ["Shandia Warrior", "Guerrier Shandia"],
  ["Shinuchi", "Shinuchi"],
  ["Shinuchi of the Gifters, Gifutazu Shin'uchi", "Shinuchi"],
  ["Shipwright", "Charpentier"],
  ["Shogun", "Shogun"],
  ["Shogun of Wano Country", "Shogun du pays des Wa"],
  ["Sniper", "Tireur d'élite"],
  ["Special Zombie", "Zombie spécial"],
  ["Spy", "Espion"],
  ["Stationmaster", "Cheffe de gare"],
  ["Sunday stationmaster of the Shift Station", "Cheffe de la gare Shift Station"],
  ["Supreme Commander of the Revolutionary Army", "Chef de l'Armée Révolutionnaire"],
  ["Sweet Commander", "Général Sucré"],
  ["Takoyaki seller", "Vendeur de takoyaki"],
  ["Theatre Performer", "Acteur de théâtre"],
  ["Trainee Swordsman", "Apprentie épéiste"],
  ["Vice Admiral", "Vice-Amiral"],
  ["Vice President of Galley-La", "Vice-président de Galley-La Company"],
  ["Vice Warden", "Vice Directeur"],
  ["Waitress", "Serveuse"],
  ["Warrior", "Guerrier"],
  ["World Economy News Paper President", "Président du World Economy News Paper"],
  ["World Noble", "Dragon Céleste"],
  ["Wrestler", "Lutteur"],
  ["Yakuza Boss", "Chef yakuza"],
]);

const FR_EXACT = new Map([
  ["", ""],
  ['"', ""],
  ["Agent du CP9 et", "Agent du Cipher Pol"],
  ["Amiral", "Amiral"],
  ["Animal", "Animal de compagnie"],
  ["Animal de compagnieMonture", "Animal de compagnie"],
  ["BanditsMère d'accueil d'Ace", "Cheffe des bandits des montagnes"],
  ["Capitaine", "Capitaine"],
  ["Capitaine Pirate", "Capitaine Pirate"],
  ["Capitaine Pirate de l'Équipage du Cook", "Capitaine Pirate"],
  ["Capitaine PirateGrand Corsaire", "Capitaine Pirate"],
  ["Capitaine PirateSoldat de l'armée de Ryugu", "Capitaine Pirate"],
  ["CharpentierDésosseur", "Charpentier"],
  ["Chasseurs de Primes", "Chasseur de primes"],
  ["Chef de l'armée révolutionnaireMarine", "Chef de l'Armée Révolutionnaire"],
  ["Chief de la gare Shift Station", "Cheffe de la gare Shift Station"],
  ["Commandant", "Commandant"],
  ["Commandant des Révolutionnaires Armée G", "Commandant de l'Armée G"],
  ["Commandant du 10e navire de Barbe Noire.", "Commandant de la 10e flotte de l'Équipage de Barbe Noire"],
  ["Commandant du 10e navire de Barbe Noire", "Commandant de la 10e flotte de l'Équipage de Barbe Noire"],
  ["Commandant en", "Commandant en chef des zombies et des soldats zombies"],
  ["Conductrice du Puffing Tom", "Conductrice du Puffing Tom"],
  ["Cuisinier", "Cuisinier"],
  ["Daimyo", "Daimyo"],
  ["Daimyo Guardians de la Forêt de la Baleine", "Daimyo"],
  ["Daimyo Serviteur de la Famille Kozuki", "Daimyo"],
  ["Daimyo Serviteur de la famille Kozuki", "Daimyo"],
  ["Dieu de Skypiea", "Dieu de Skypiéa"],
  ["Docteur", "Docteur"],
  ["Esclave", "Esclave"],
  ["EsclaveInvitée de L'Équipage des", "Esclave"],
  ["Ex-", "Ex-"],
  ["Gardien en Chef Directeur Vice Directeur", "Gardien en Chef"],
  ["Gérante de Bar", "Gérante de Bar"],
  ["GuerrierCapitaine de l'armée de Tontatta", "Guerrier"],
  ["Guardians de la Forêt de la Baleine", "Gardien de la forêt de la Baleine"],
  ["Inspecteur Général", "Inspecteur Général"],
  ["Instructeur", "Instructeur"],
  ["Maire de Water SevenPrésident de Galley-La Company", "Maire de Water Seven"],
  ["Marines", "Marine"],
  ["Officier de la Marine", "Officier de la Marine"],
  ["Pirate", "Pirate"],
  ["Pirate Calamité", "Calamité"],
  ["Pirate Capitaine", "Capitaine Pirate"],
  ["Pirate et", "Pirate"],
  ["PirateGardien d'Enies Lobby", "Pirate"],
  ["PirateGénéral Sucré", "Général Sucré"],
  ["PirateGuerrière Kuja", "Pirate"],
  ["PirateSecond", "Pirate"],
  ["PirateSniper", "Pirate"],
  ["PirateTireur d'Elite", "Pirate"],
  ["PirateTireur d'Élite", "Pirate"],
  ["Pirates", "Pirate"],
  ["Prince", "Prince"],
  ["Prince du Ryugu Palace", "Prince du royaume Ryugu"],
  ["Princesse", "Princesse"],
  ["Princesse d'AlabastaAgent Frontière de Baroque Works", "Princesse d'Alabasta"],
  ["Princesse du royaume des hommes-poissons", "Princesse du royaume Ryugu"],
  ["Prélat", "Prélat"],
  ["Roi", "Roi"],
  ["Roi de Drum", "Roi de Drum"],
  ["Roi du Royaume des CerisiersHomme de main du", "Roi du Royaume des Cerisiers"],
  ["Roi du royaume Ryugu", "Roi du royaume Ryugu"],
  ["Samouraï", "Samouraï"],
  ["Scientifique", "Scientifique"],
  ["Sous-", "Révolutionnaire"],
  ["Tobiroppo", "Tobiroppo"],
  ["Vice", "Vice-Amiral"],
  ["Vice-Amiral", "Vice-Amiral"],
]);

const SPLIT_MARKERS = [
  "Agent du Cipher Pol",
  "Agent numéro",
  "Amiral",
  "Animal",
  "Apprentie",
  "Assassin",
  "Barman",
  "Capitaine",
  "Chasseur",
  "Charpentier",
  "Chef",
  "Combattant",
  "Commandant",
  "Conductrice",
  "Conseiller",
  "Contre-Amiral",
  "Courtisane",
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
  "Timonier",
  "Tobiroppo",
  "Vice-Amiral",
  "Vice",
  "Zombie",
];

const LOW_SIGNAL_FR = new Set([
  "",
  "Animal de compagnie",
  "Capitaine",
  "Capitaine Pirate",
  "Civil",
  "Esclave",
  "Ex-",
  "Pirate",
  "Prince",
  "Princesse",
  "Roi",
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
    .replace(/^"+|"+$/g, "")
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

function normalizeFrOccupation(value) {
  let text = cleanText(value).replace(/\.$/, "");
  if (!text) return "";

  if (FR_EXACT.has(text)) return FR_EXACT.get(text);

  if (/[;,/]/.test(text)) {
    text = cleanText(text.split(/[;,/]/)[0]);
  } else {
    const parts = splitByMarkers(text);
    if (parts.length > 1) text = parts[0];
  }

  text = cleanText(text).replace(/\.$/, "");

  if (FR_EXACT.has(text)) return FR_EXACT.get(text);
  return text;
}

function ordinalToFrench(word, gender = "m") {
  const map = {
    First: gender === "f" ? "1re" : "1er",
    Second: "2e",
    Third: "3e",
    Fourth: "4e",
    Fifth: "5e",
    Sixth: "6e",
    Seventh: "7e",
    Eighth: "8e",
    Ninth: "9e",
    Tenth: "10e",
  };
  return map[word] ?? word;
}

function translateEnOccupation(value) {
  const text = cleanText(value);
  if (!text) return "";

  if (EN_EXACT.has(text)) return EN_EXACT.get(text);

  const blackbeardCaptain = text.match(/^Titanic Captain, Captain of the (First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth) Ship$/);
  if (blackbeardCaptain) {
    return `Commandant de la ${ordinalToFrench(blackbeardCaptain[1], "f")} flotte de l'Équipage de Barbe Noire`;
  }

  const whitebeardDivision = text.match(/^(\d+)(?:st|nd|rd|th) Division Commander$/);
  if (whitebeardDivision) {
    return `Commandant de la ${whitebeardDivision[1]}e division de l'Équipage de Barbe Blanche`;
  }

  return text;
}

function isLowSignalFr(value) {
  return LOW_SIGNAL_FR.has(value);
}

function computeFinalOccupation(id, enCurrent, frCurrent, existingFinal) {
  if (VERIFIED_OCCUPATIONS.has(id)) {
    return VERIFIED_OCCUPATIONS.get(id);
  }

  const fr = normalizeFrOccupation(frCurrent);
  const en = translateEnOccupation(enCurrent);

  if (fr && en) {
    if (fr === en) return fr;
    if (isLowSignalFr(fr) && en) return en;
    return fr;
  }

  if (fr) return fr;
  if (en) return en;

  return cleanText(existingFinal);
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enCurrentIdx = header.indexOf("en_wiki_occupation_actuelle");
const frCurrentIdx = header.indexOf("fr_wiki_occupation_actuelle");
let finalOccupationIdx = header.indexOf("final_occupation_actuelle");

if (finalOccupationIdx === -1) {
  const insertAt = header.indexOf("final_age");
  finalOccupationIdx = insertAt === -1 ? header.length : insertAt;
  header.splice(finalOccupationIdx, 0, "final_occupation_actuelle");
  for (let i = 1; i < rows.length; i++) {
    rows[i].splice(finalOccupationIdx, 0, "");
  }
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  row[finalOccupationIdx] = computeFinalOccupation(
    row[idIdx],
    enCurrentIdx === -1 ? "" : row[enCurrentIdx],
    frCurrentIdx === -1 ? "" : row[frCurrentIdx],
    row[finalOccupationIdx],
  );
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
