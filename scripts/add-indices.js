/**
 * Ajoute indice1, indice2, indice3 à tous les personnages des 3 univers.
 * Les indices sont dérivés des attributs existants (du plus vague au plus précis).
 * Pour One Piece, indice1 = "Capitaine" pour les capitaines d'équipages,
 * sinon classe/sous-classe. indice2 utilise fruits_demon.csv.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const HTML_DIR = path.join(__dirname, "..", "html");
const FILES = ["marvel-cineverse.json", "marvel-rivals.json", "one-piece.json"];

/** Affiliation (normalized) → noms de capitaines possibles (pour matching name/alias) */
const ONE_PIECE_CAPTAINS = new Map([
  ["equipage de gecko moria", ["Gecko Moria"]],
  ["equipage des pirates gecko", ["Gecko Moria"]],
  ["equipage du rolling association des victimes de thriller bark", ["Gecko Moria"]],
  ["equipage des pirates du soleil", ["Jinbe", "Fisher Tiger"]],
  ["equipage des pirates du soleil", ["Jinbe", "Fisher Tiger"]],
  ["nouvel equipage des hommes-poissons", ["Jinbe"]],
  ["equipage aux cent betes", ["Kaidou"]],
  ["equipage aux cent betes", ["Kaidou"]],
  ["equipage d'arlong", ["Arlong"]],
  ["equipage de barbe noire", ["Marshall D. Teach"]],
  ["equipage du heart", ["Trafalgar D. Water Law"]],
  ["equipage de bluejam", ["Bluejam"]],
  ["equipage des geants", ["Dorry", "Brogy"]],
  ["equipage du chapeau de paille", ["Monkey D. Luffy"]],
  ["equipage du chat noir", ["Neko"]],
  ["equipage de big mom", ["Charlotte Linlin"]],
  ["equipage de caribou", ["Caribou"]],
  ["equipage de barbe brune", ["Chinjao"]],
  ["equipage de wapol", ["Wapol"]],
  ["faux equipage du chapeau de paille", ["Demalo Black"]],
  ["equipage de barbe blanche", ["Edward Newgate"]],
  ["equipage de kid", ["Eustass Kid"]],
  ["equipage de foxy", ["Foxy"]],
  ["equipage de roger", ["Gol D. Roger"]],
  ["equipage du fire tank", ["Capone Bege"]],
  ["equipage de bonney", ["Jewelry Bonney"]],
  ["equipage de rocks", ["Rocks D. Xebec"]],
  ["equipage du rumbar", ["Brook"]],
  ["equipage du roux", ["Shanks"]],
  ["equipage de cavendish", ["Cavendish"]],
  ["equipage des magnifiques pirates", ["Cavendish"]],
  ["equipage de bartolomeo", ["Bartolomeo"]],
  ["equipage de bellamy", ["Bellamy"]],
  ["equipage d'ideo", ["Ideo"]],
  ["equipage des pirates kuja", ["Boa Hancock"]],
  ["equipage des pirates volants", ["Shiki"]],
  ["equipage du clown", ["Baggy"]],
  ["equipage d'alvida", ["Alvida"]],
  ["equipage des moines depraves", ["Chadros Higelyges"]],
]);

function val(v) {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.length ? String(v[0]) : "";
  return String(v).trim();
}

function normalize(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function loadDevilFruitsMap() {
  const csvPath = path.join(HTML_DIR, "fruits_demon.csv");
  if (!fs.existsSync(csvPath)) return new Map();
  const csv = fs.readFileSync(csvPath, "utf-8");
  const lines = csv.split("\n").slice(1);
  const map = new Map();
  for (const line of lines) {
    const match = line.match(/^([^,]+),(.*?),([^,]+)$/);
    if (!match) continue;
    const fruit = match[1].trim();
    const detenteur = match[2].trim();
    if (!fruit || !detenteur) continue;
    const key = normalize(detenteur);
    const existing = map.get(key);
    map.set(key, existing ? `${existing} / ${fruit}` : fruit);
  }
  return map;
}

function getFruitForCharacter(char, devilFruitsMap) {
  if (!devilFruitsMap || devilFruitsMap.size === 0) return null;
  const candidates = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])];
  for (const c of candidates) {
    const key = normalize(val(c));
    if (!key) continue;
    const fruit = devilFruitsMap.get(key);
    if (fruit) return fruit;
  }
  return null;
}

/** Map: affiliation (normalized) → captain names (normalized). */
function buildOnePieceCaptainsMap() {
  const map = new Map();
  const add = (aff, ...names) => {
    const key = normalize(aff);
    map.set(key, names.map((n) => normalize(n)));
  };
  add("Équipage de Gecko Moria", "Gecko Moria");
  add("Équipage des Pirates du Soleil", "Jinbe", "Fisher Tiger");
  add("Équipage des Pirates du soleil", "Jinbe", "Fisher Tiger");
  add("Équipage aux cent bêtes", "Kaidou");
  add("Équipage aux Cent Bêtes", "Kaidou");
  add("Équipage d'Arlong", "Arlong");
  add("Équipage de Barbe Noire", "Marshall D. Teach");
  add("Équipage du Heart", "Trafalgar D. Water Law");
  add("Équipage de Bluejam", "Bluejam");
  add("Équipage des Géants", "Dorry", "Brogy");
  add("Équipage du Chapeau de Paille", "Monkey D. Luffy", "Luffy");
  add("Équipage du Chat Noir", "Bepo");
  add("Équipage de Big Mom", "Charlotte Linlin");
  add("Équipage de Caribou", "Caribou");
  add("Équipage de Barbe Brune", "Chinjao");
  add("Équipage du Rolling Association des Victimes de Thriller Bark", "Gecko Moria");
  add("Équipage de Wapol", "Wapol");
  add("Faux Équipage du Chapeau de Paille", "Demalo Black");
  add("Nouvel Équipage des Hommes-Poissons", "Jinbe");
  add("Équipage de Barbe Blanche", "Edward Newgate");
  add("Équipage de Kid", "Eustass Kid");
  add("Équipage de Foxy", "Foxy");
  add("Équipage des Pirates Gecko", "Gecko Moria");
  add("Équipage de Roger", "Gol D. Roger", "Roger");
  add("Équipage du Fire Tank", "Capone Bege");
  add("Équipage de Bonney", "Jewelry Bonney");
  add("Équipage de Rocks", "Rocks D. Xebec", "Edward Newgate", "Charlotte Linlin", "Kaidou");
  add("Équipage du Rumbar", "Brook");
  add("Équipage du Roux", "Shanks");
  add("Équipage de Cavendish", "Cavendish");
  add("Équipage de Bartolomeo", "Bartolomeo");
  add("Équipage de Bellamy", "Bellamy");
  add("Équipage d'Ideo", "Ideo");
  add("Équipage des Pirates Kuja", "Boa Hancock");
  add("Équipage des Magnifiques Pirates", "Cavendish");
  add("Équipage des Pirates Volants", "Shiki");
  add("Équipage du Clown", "Baggy");
  add("Équipage d'Alvida", "Alvida");
  add("Équipage du Roux", "Shanks");
  add("Équipage des Moines Dépravés", "Lafitte");
  return map;
}

function isCaptain(char, captainsMap) {
  if (!char.affiliation || !captainsMap) return false;
  const affKey = normalize(char.affiliation);
  const captains = captainsMap.get(affKey);
  if (!captains) return false;
  const charKeys = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])]
    .map((s) => normalize(val(s)))
    .filter(Boolean);
  return charKeys.some((k) => captains.includes(k));
}

/** Affiliation (normalized) → Set de noms/alias normalisés des capitaines */
function buildCaptainsMap(characters) {
  const MANUAL = {
    "equipage du chapeau de paille": ["monkey d. luffy", "luffy"],
    "equipage du heart": ["trafalgar d. water law", "trafalgar law", "law"],
    "equipage du clown": ["baggy", "le clown"],
    "equipage du fire tank": ["capone bege", "bege"],
    "equipage du roux": ["shanks", "roux"],
    "equipage du rumbar": ["brook", "yorki"],
    "equipage du chat noir": ["nekko"],
    "equipage des pirates du soleil": ["jinbe", "jimbe", "fisher tiger"],
    "equipage des pirates du soleil ": ["jinbe", "jimbe", "fisher tiger"],
    "equipage aux cent betes": ["kaidou", "kaido"],
    "equipage aux cent betes ": ["kaidou", "kaido"],
    "equipage de barbe noire": ["marshall d. teach", "barbe noire", "teach"],
    "equipage de barbe blanche": ["edward newgate", "barbe blanche", "newgate"],
    "equipage de big mom": ["charlotte linlin", "big mom", "linlin"],
    "equipage de roger": ["gol d. roger", "roger", "gold roger"],
    "equipage de rocks": ["rocks d. xebec", "xebec"],
    "equipage des geants": ["dorry", "brogy"],
    "equipage des pirates kuja": ["boa hancock", "hancock"],
    "equipage des pirates gecko": ["gecko moria", "moria"],
    "equipage des pirates volants": ["shiki"],
    "equipage des magnifiques pirates": ["cavendish"],
    "nouvel equipage des hommes-poissons": ["jinbe", "jimbe"],
    "faux equipage du chapeau de paille": ["demalo black"],
    "equipage du rolling association des victimes de thriller bark": ["gecko moria", "moria"],
  };

  const map = new Map();
  for (const [affNorm, captains] of Object.entries(MANUAL)) {
    const set = new Set(captains.map(normalize));
    map.set(affNorm, set);
  }

  for (const char of characters) {
    const aff = val(char.affiliation);
    if (!aff || !aff.toLowerCase().includes("équipage") && !aff.toLowerCase().includes("equipage")) continue;
    const affNorm = normalize(aff);
    if (map.has(affNorm)) continue;
    const m = aff.match(/Équipage\s+(?:de\s+|du\s+|d')?(\w[\w\s'-]+?)(?:\s+aux?\s+|\s+des?\s+)?$/i)
      || aff.match(/Équipage\s+de\s+(.+)$/i)
      || aff.match(/Équipage\s+du\s+(.+)$/i)
      || aff.match(/Équipage\s+d'(.+)$/i);
    if (m) {
      const extracted = m[1].trim();
      const captainNormalized = normalize(extracted);
      if (!captainNormalized || captainNormalized.length < 2) continue;
      const existing = map.get(affNorm) || new Set();
      existing.add(captainNormalized);
      map.set(affNorm, existing);
    }
  }

  for (const char of characters) {
    const aff = val(char.affiliation);
    if (!aff || !aff.toLowerCase().includes("équipage")) continue;
    const affNorm = normalize(aff);
    if (map.has(affNorm)) continue;
    if (aff.match(/Équipage\s+de\s+/i)) {
      const x = aff.replace(/^Équipage\s+de\s+/i, "").trim();
      if (x.length > 1) {
        const set = new Set([normalize(x)]);
        map.set(affNorm, set);
      }
    } else if (aff.match(/Équipage\s+d'/i)) {
      const x = aff.replace(/^Équipage\s+d'/i, "").trim();
      if (x.length > 1) {
        const set = new Set([normalize(x)]);
        map.set(affNorm, set);
      }
    }
  }
  return map;
}

function isCaptain(char, captainsMap) {
  if (!captainsMap || captainsMap.size === 0) return false;
  const aff = normalize(val(char.affiliation));
  if (!aff) return false;
  const captainSet = captainsMap.get(aff);
  if (!captainSet) return false;
  const candidates = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])];
  for (const c of candidates) {
    if (captainSet.has(normalize(val(c)))) return true;
  }
  return false;
}

/** Affiliation -> capitaine(s) pour les équipages One Piece (surcharges manuelles). */
const CAPTAIN_OVERRIDES = {
  "équipage des pirates du soleil": ["jinbe", "fisher tiger"],
  "équipage des pirates du soleil ": ["jinbe", "fisher tiger"],
  "équipage aux cent bêtes": ["kaidou"],
  "équipage aux cent bêtes ": ["kaidou"],
  "équipage du heart": ["trafalgar d. water law", "trafalgar law"],
  "équipage du chapeau de paille": ["monkey d. luffy", "luffy"],
  "équipage du clown": ["baggy"],
  "équipage du fire tank": ["capone bege"],
  "équipage des géants": ["dorry", "brogy"],
  "équipage de barbe noire": ["marshall d. teach"],
  "équipage de barbe blanche": ["edward newgate"],
  "équipage de big mom": ["charlotte linlin"],
  "équipage de roger": ["gol d. roger", "roger"],
  "équipage du roux": ["shanks"],
  "équipage des pirates kuja": ["boa hancock"],
  "équipage du rumbar": ["brook"],
  "équipage des pirates gecko": ["gecko moria"],
  "nouvel équipage des hommes-poissons": ["jinbe"],
  "équipage du rolling association des victimes de thriller bark": ["gecko moria"],
  "faux équipage du chapeau de paille": ["demalo black"],
  "équipage des pirates volants": ["shiki"],
  "équipage des magnifiques pirates": ["cavendish"],
};

function getCaptainsMap(data) {
  const map = new Map();
  for (const char of data.characters) {
    const aff = val(char.affiliation);
    if (!aff || !aff.toLowerCase().includes("équipage")) continue;
    const key = normalize(aff);
    if (map.has(key)) continue;
    const override = CAPTAIN_OVERRIDES[key];
    if (override) {
      map.set(key, new Set(override.map(normalize)));
      continue;
    }
    let extracted = null;
    const m1 = aff.match(/Équipage de ([A-Za-zÀ-ÿ][^,]*(?: [A-Za-zÀ-ÿ][^,]*)?)/i);
    const m2 = aff.match(/Équipage du ([A-Za-zÀ-ÿ][^,]*(?: [A-Za-zÀ-ÿ][^,]*)?)/i);
    const m3 = aff.match(/Équipage d'([A-Za-zÀ-ÿ][^,]*(?: [A-Za-zÀ-ÿ][^,]*)?)/i);
    if (m1) extracted = [m1[1].trim()];
    else if (m2) extracted = [m2[1].trim()];
    else if (m3) extracted = [m3[1].trim()];
    if (extracted) {
      map.set(key, new Set(extracted.map((s) => normalize(s))));
    }
  }
  return map;
}

function isCaptain(char, captainsMap) {
  if (!captainsMap || captainsMap.size === 0) return false;
  const aff = val(char.affiliation);
  if (!aff || !aff.toLowerCase().includes("équipage")) return false;
  const key = normalize(aff);
  const captains = captainsMap.get(key);
  if (!captains) return false;
  const candidates = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])];
  for (const c of candidates) {
    if (captains.has(normalize(val(c)))) return true;
  }
  return false;
}

/** Affiliation -> capitaine(s). Cas spéciaux non déductibles du pattern "Équipage de/du X". */
const ONE_PIECE_CAPTAIN_OVERRIDES = {
  "Équipage du Chapeau de Paille": ["Monkey D. Luffy", "Luffy"],
  "Équipage du Heart": ["Trafalgar D. Water Law", "Trafalgar Law", "Law"],
  "Équipage du Clown": ["Baggy", "Cabaji"],
  "Équipage du Fire Tank": ["Capone Bege", "Bege"],
  "Équipage du Roux": ["Shanks"],
  "Équipage de Barbe Noire": ["Marshall D. Teach", "Barbe Noire"],
  "Équipage de Barbe Blanche": ["Edward Newgate", "Barbe Blanche"],
  "Équipage de Big Mom": ["Charlotte Linlin", "Big Mom"],
  "Équipage aux cent bêtes": ["Kaidou", "Kaidou"],
  "Équipage aux Cent Bêtes": ["Kaidou"],
  "Équipage de Roger": ["Gol D. Roger", "Roger"],
  "Équipage des Pirates du Soleil": ["Jinbe", "Fisher Tiger"],
  "Équipage des Pirates du soleil": ["Jinbe", "Fisher Tiger"],
  "Nouvel Équipage des Hommes-Poissons": ["Jinbe"],
  "Équipage des Géants": ["Dorry", "Brogy"],
  "Équipage des Pirates Gecko": ["Gecko Moria", "Moria"],
  "Équipage du Rumbar": ["Brook"],
  "Équipage des Pirates Kuja": ["Boa Hancock", "Hancock"],
  "Équipage des Magnifiques Pirates": ["Cavendish"],
  "Équipage des Pirates Volants": ["Shiki"],
  "Équipage de Rocks": ["Rocks D. Xebec", "Xebec"],
  "Faux Équipage du Chapeau de Paille": ["Demalo Black"],
  "Équipage du Rolling Association des Victimes de Thriller Bark": ["Gecko Moria"],
  "Équipage de Barbe Brune": ["Chinjao"],
};

/** Affiliation → second(s) d'équipage (bras droit / vice-capitaine). */
const ONE_PIECE_SECOND_OVERRIDES = {
  "Équipage du Chapeau de Paille": ["Roronoa Zoro", "Zoro"],
  "Équipage du Heart": ["Bepo"],
  "Équipage de Barbe Blanche": ["Marco"],
  "Équipage aux cent bêtes": ["Alber", "King"],
  "Équipage aux Cent Bêtes": ["Alber", "King"],
  "Équipage de Big Mom": ["Charlotte Katakuri", "Katakuri"],
  "Équipage de Kid": ["Killer"],
  "Équipage de Gecko Moria": ["Perona"],
  "Équipage des Pirates Gecko": ["Perona"],
  "Thriller Bark": ["Perona"],
};

/** Affiliation → troisième(s) d'équipage. */
const ONE_PIECE_THIRD_OVERRIDES = {
  "Équipage du Chapeau de Paille": ["Sanji", "Vinsmoke Sanji"],
  "Équipage du Heart": ["Shachi", "Penguin"],
  "Équipage de Barbe Blanche": ["Joz", "Jozu"],
  "Équipage aux cent bêtes": ["Queen"],
  "Équipage aux Cent Bêtes": ["Queen"],
  "Équipage de Big Mom": ["Charlotte Cracker", "Cracker"],
  "Équipage de Kid": ["Heat", "Wire"],
  "Équipage de Gecko Moria": ["Absalom"],
  "Équipage des Pirates Gecko": ["Absalom"],
  "Thriller Bark": ["Absalom"],
};

function isThird(char) {
  const aff = val(char.affiliation);
  if (!aff) return false;
  const override = ONE_PIECE_THIRD_OVERRIDES[aff];
  if (!override) return false;
  const candidates = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])].map(
    (c) => normalize(val(c))
  );
  const thirdSet = new Set(override.map(normalize));
  return candidates.some((c) => thirdSet.has(c));
}

function isSecond(char) {
  const aff = val(char.affiliation);
  if (!aff) return false;
  const override = ONE_PIECE_SECOND_OVERRIDES[aff];
  if (!override) return false;
  const candidates = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])].map(
    (c) => normalize(val(c))
  );
  const secondSet = new Set(override.map(normalize));
  return candidates.some((c) => secondSet.has(c));
}

function isCaptain(char) {
  const aff = val(char.affiliation);
  if (!aff || !aff.includes("Équipage")) return false;
  const candidates = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])].map(
    (c) => normalize(val(c))
  );

  const override = ONE_PIECE_CAPTAIN_OVERRIDES[aff];
  if (override) {
    const capSet = new Set(override.map(normalize));
    return candidates.some((c) => capSet.has(c));
  }

  const mDe = aff.match(/Équipage de ([^s])([^,]*)/);
  const mDu = aff.match(/Équipage du ([^,]*)/);
  const mDes = aff.match(/Équipage d'([^,]*)/);
  let extracted = null;
  if (mDes) extracted = mDes[1].trim();
  else if (mDe) extracted = (mDe[1] + mDe[2]).trim();
  else if (mDu) extracted = mDu[1].trim();
  if (!extracted) return false;

  const extNorm = normalize(extracted);
  return candidates.some((c) => c === extNorm || c.includes(extNorm) || extNorm.includes(c));
}

function isInSet(char, nameSet) {
  const candidates = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])];
  return candidates.some((c) => nameSet.has(normalize(val(c))));
}

/** Grades Marine : listes issues de onepiece.fandom.com (Marine Ranks, Categories)
 * Hiérarchie FR : Amiral en chef > Amiral > Vice-Amiral > Sous-Amiral > Contre-Amiral > Colonel */

/** Fleet Admiral / Amiral en chef */
const ONE_PIECE_FLEET_ADMIRAL_NAMES = new Set(
  ["Sengoku", "Sakazuki", "Akainu", "Kong"].map(normalize)
);

/** Admiral / Amiral */
const ONE_PIECE_ADMIRAL_NAMES = new Set(
  [
    "Borsalino",
    "Kizaru",
    "Kuzan",
    "Aokiji",
    "Issho",
    "Fujitora",
    "Aramaki",
    "Ryokugyu",
    "Zephyr",
  ].map(normalize)
);

/** Vice Admiral / Vice-Amiral (Fandom: Marine Vice Admirals, Vice-Amiral FR) */
const ONE_PIECE_VICE_ADMIRAL_NAMES = new Set(
  [
    "Monkey D. Garp",
    "Garp",
    "Tsuru",
    "Smoker",
    "Momonga",
    "Bastille",
    "Onigumo",
    "Doberman",
    "Dobermann",
    "Strawberry",
    "Fraise",
    "Yamakaji",
    "Dalmatian",
    "Dalmatien",
    "Lacroix",
    "Ronse",
    "John Giant",
    "Jean Géant",
    "Bluegrass",
    "Nazu Ketagari",
    "Draw",
    "Gion",
    "Momousagi",
    "Tokikake",
    "Chaton",
    "Maynard",
    "Cancer",
    "Mozambia",
    "Stainless",
    "Lonz",
    "Comil",
    "Doll",
    "Hototogisu",
    "Urban",
    "Pomsky",
    "Tosa",
    "Guillotine",
    "Red King",
    "Hound",
    "T-Bone",
    "T Bone",
    "Vergo",
    "Jonathan",
    "Dohn Deynon",
    "Balzac",
    "Snitcher",
    "Graydle",
    "Prody",
    "Komei",
    "Wilder",
  ].map(normalize)
);

/** Rear Admiral / Sous-Amiral (少将 Shōshō) - Fandom: Marine Rear Admirals */
const ONE_PIECE_SOUS_AMIRAL_NAMES = new Set(
  [
    "Hina",
    "Kujaku",
    "Prince Grus",
    "Kadar",
    "Catacombo",
    "Akehende",
    "Sicily",
    "Bufflo",
    "Barricade",
    "Yukimura",
  ].map(normalize)
);

/** Commodore / Contre-Amiral (准将 Junshō) - Fandom: Marine Commodores */
const ONE_PIECE_CONTRE_AMIRAL_NAMES = new Set(
  [
    "Brannew",
    "Daigin",
    "Yarisugi",
    "Guard",
    "Gage",
    "Bilić",
    "Bilic",
    "Kibin",
    "Pudding Pudding",
    "Purin-Purin",
  ].map(normalize)
);

/** Captain / Colonel (大佐 Taisa) - Fandom: Marine Captains */
const ONE_PIECE_COLONEL_NAMES = new Set(
  [
    "Koby",
    "Tashigi",
    "Nezumi",
    "Gorilla",
    "Ratel",
    "Shu",
    "Shû",
    "Sharinguru",
    "Very Good",
  ].map(normalize)
);

/** Commander / Lieutenant Colonel (中佐 Chūsa) - Fandom: Marine Commanders */
const ONE_PIECE_LIEUTENANT_COLONEL_NAMES = new Set(
  [
    "Hibari",
    "Ripper",
    "Week",
    "Shepherd",
    "Governor",
    "Glove",
    "Donquixote Rosinante",
    "Don Quichotte Rossinante",
    "Corazon",
  ].map(normalize)
);

/** Lieutenant Commander / Lieutenant Commandant (少佐 Shōsa) - Fandom: Marine Lieutenant Commanders */
const ONE_PIECE_LIEUTENANT_COMMANDANT_NAMES = new Set(
  [
    "Jango",
    "Fullbody",
    "Helmeppo",
    "Agray",
    "Drake",
    "Rapanui Pasqua",
    "Hardy",
  ].map(normalize)
);

/** Lieutenant (大尉 Taii) - Fandom: Marine Ranks */
const ONE_PIECE_LIEUTENANT_NAMES = new Set(["Zotto"].map(normalize));

/** Lieutenant Junior Grade / Vice-Lieutenant (中尉 Chūi) - Fandom: Marine Ranks */
const ONE_PIECE_VICE_LIEUTENANT_NAMES = new Set(
  ["Rokkaku", "Stalker", "Shimoi Zappa", "Ant De Bonham", "Ant de Bonam"].map(
    normalize
  )
);

/** Ensign / Sous-Lieutenant (少尉 Shōi) - Fandom: Marine Ranks */
const ONE_PIECE_SOUS_LIEUTENANT_NAMES = new Set(
  ["Isuka", "Makko", "Arsel"].map(normalize)
);

function isFleetAdmiral(char) {
  return isInSet(char, ONE_PIECE_FLEET_ADMIRAL_NAMES);
}

function isAdmiral(char) {
  if (isInSet(char, ONE_PIECE_FLEET_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_VICE_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_SOUS_AMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_CONTRE_AMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_COLONEL_NAMES)) return false;
  return isInSet(char, ONE_PIECE_ADMIRAL_NAMES);
}

function isViceAdmiral(char) {
  if (isInSet(char, ONE_PIECE_FLEET_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_SOUS_AMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_CONTRE_AMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_COLONEL_NAMES)) return false;
  return isInSet(char, ONE_PIECE_VICE_ADMIRAL_NAMES);
}

function isSousAmiral(char) {
  if (isInSet(char, ONE_PIECE_FLEET_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_VICE_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_CONTRE_AMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_COLONEL_NAMES)) return false;
  return isInSet(char, ONE_PIECE_SOUS_AMIRAL_NAMES);
}

function isContreAdmiral(char) {
  if (isInSet(char, ONE_PIECE_FLEET_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_VICE_ADMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_SOUS_AMIRAL_NAMES)) return false;
  if (isInSet(char, ONE_PIECE_COLONEL_NAMES)) return false;
  return isInSet(char, ONE_PIECE_CONTRE_AMIRAL_NAMES);
}

function isColonel(char) {
  return isInSet(char, ONE_PIECE_COLONEL_NAMES);
}

function isLieutenantColonel(char) {
  return isInSet(char, ONE_PIECE_LIEUTENANT_COLONEL_NAMES);
}

function isLieutenantCommandant(char) {
  return isInSet(char, ONE_PIECE_LIEUTENANT_COMMANDANT_NAMES);
}

function isLieutenant(char) {
  return isInSet(char, ONE_PIECE_LIEUTENANT_NAMES);
}

function isViceLieutenant(char) {
  return isInSet(char, ONE_PIECE_VICE_LIEUTENANT_NAMES);
}

function isSousLieutenant(char) {
  return isInSet(char, ONE_PIECE_SOUS_LIEUTENANT_NAMES);
}

function deriveIndices(char, universeId, devilFruitsMap = null) {
  if (universeId === "marvel-cineverse") {
    return {
      indice1:
        val(char.acteur) ||
        val(char.indice1) ||
        val(char.world || char.affiliation) ||
        "Personnage du MCU",
      indice2: val(char.firstAppearance || char.species) || val(char.affiliation),
      indice3: val(char.firstAppearance),
    };
  }
  if (universeId === "marvel-rivals") {
    return {
      indice1: val(char.affiliation || char.origin) || "Personnage jouable",
      indice2: val(char.role || char.race) || val(char.origin),
      indice3: val(char.powerSource) || val(char.origin),
    };
  }
  if (universeId === "one-piece") {
    const sub = Array.isArray(char.sub_affiliation)
      ? char.sub_affiliation[0]
      : char.sub_affiliation;
    const haki = Array.isArray(char.haki)
      ? char.haki.join(", ")
      : val(char.haki);
    const fruitFromCsv = getFruitForCharacter(char, devilFruitsMap);
    const indice2 =
      fruitFromCsv ||
      val(char.devilFruitType) ||
      val(char.race) ||
      (char.devilFruitType === "" ? "Sans fruit du démon" : "");
    // indice1: Capitaine > Second > Troisième > Amiral en chef > Amiral > Vice-Amiral > Contre-Amiral > Sous-Amiral > Colonel > classe/sous-classe
    const classe = val(char.classe || char.affiliation);
    const sousClasse = val(char.sous_classe || sub);
    const indice1 = isCaptain(char)
      ? "Capitaine"
      : isSecond(char)
        ? "Second"
        : isThird(char)
          ? "Troisième"
          : isFleetAdmiral(char)
            ? "Amiral en chef"
            : isAdmiral(char)
              ? "Amiral"
              : isViceAdmiral(char)
                ? "Vice-Amiral"
                : isSousAmiral(char)
                  ? "Sous-Amiral"
                  : isContreAdmiral(char)
                    ? "Contre-Amiral"
                    : isColonel(char)
                      ? "Colonel"
                      : isLieutenantColonel(char)
                        ? "Lieutenant Colonel"
                        : isLieutenantCommandant(char)
                          ? "Lieutenant Commandant"
                          : isLieutenant(char)
                            ? "Lieutenant"
                            : isViceLieutenant(char)
                              ? "Vice-Lieutenant"
                              : isSousLieutenant(char)
                                ? "Sous-Lieutenant"
                                : sousClasse || classe || val(char.arc) || val(char.origin);

    return {
      indice1,
      indice2,
      indice3: val(sub) || val(haki) || val(char.origin) || val(char.affiliation),
    };
  }
  return { indice1: "", indice2: "", indice3: "" };
}

function processFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const universeId = data.id || filename.replace(".json", "");
  const devilFruitsMap =
    universeId === "one-piece" ? loadDevilFruitsMap() : null;

  let count = 0;
  for (const char of data.characters) {
    const indices = deriveIndices(char, universeId, devilFruitsMap);
    char.indice1 = indices.indice1;
    char.indice2 = indices.indice2;
    char.indice3 = indices.indice3;
    count++;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`${filename}: ${count} personnages mis à jour`);
}

function main() {
  for (const f of FILES) {
    processFile(f);
  }
  console.log("Terminé.");
}

main();
