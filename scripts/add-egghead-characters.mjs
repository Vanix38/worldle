/**
 * Ajoute les personnages Egghead aux JSON anime/manga et renomme vegapunk → stella.
 * Usage: node scripts/add-egghead-characters.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FILES = [
  path.join(ROOT, "data", "one-piece-manga.json"),
  path.join(ROOT, "data", "one-piece-anime.json"),
];

const IS_ANIME = (p) => p.includes("anime");

function parseChapter(first) {
  const m = first.match(/Chapter\s+(\d+)/i);
  return m ? `Chapitre ${m[1]}` : null;
}

function parseEpisode(first) {
  const m = first.match(/Episode\s+(\d+)/i);
  return m ? `Épisode ${m[1]}` : null;
}

function parseHeightCm(height) {
  const m = String(height).match(/(\d+)\s*cm/i);
  return m ? Number(m[1]) : 0;
}

function parseBioAge(age) {
  const s = String(age);
  const bio = s.match(/biologically\s+(\d+)/i);
  if (bio) return Number(bio[1]);
  const over = s.match(/over\s+(\d+)/i);
  if (over) return Number(over[1]);
  const num = s.match(/(\d+)/);
  return num ? Number(num[1]) : 0;
}

/** @type {Record<string, { wikiFirst: string, aliases?: string[], gender: string, age: number, size: number, affiliation: string, sub_affiliation?: string[], origin: string, bounty: number, devilFruitType: string, haki: string[], race: string, indice2: string, indice3: string }>} */
const EGGHEAD_CHARS = {
  shaka: {
    wikiFirst: "Chapter 1062; Episode 1091",
    aliases: ["Shaka le Bon"],
    gender: "Masculin",
    age: 30,
    size: 220,
    affiliation: "Marine",
    sub_affiliation: ["SSG"],
    origin: "Grand Line (Egghead)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Satellite de Vegapunk",
    indice3: "Grand Line (Egghead)",
  },
  lilith: {
    wikiFirst: "Chapter 1061; Episode 1090",
    aliases: [],
    gender: "Féminin",
    age: 24,
    size: 204,
    affiliation: "Marine",
    sub_affiliation: ["SSG"],
    origin: "Grand Line (Egghead)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Satellite de Vegapunk",
    indice3: "Grand Line (Egghead)",
  },
  edison: {
    wikiFirst: "Chapter 1065; Episode 1095",
    aliases: ["Edison le Penseur"],
    gender: "Masculin",
    age: 18,
    size: 100,
    affiliation: "Marine",
    sub_affiliation: ["SSG"],
    origin: "Grand Line (Egghead)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Satellite de Vegapunk",
    indice3: "Grand Line (Egghead)",
  },
  pythagoras: {
    wikiFirst: "Chapter 1065; Episode 1095",
    aliases: ["Pythagoras le Sage"],
    gender: "Masculin",
    age: 26,
    size: 341,
    affiliation: "Marine",
    sub_affiliation: ["SSG"],
    origin: "Grand Line (Egghead)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Satellite de Vegapunk",
    indice3: "Grand Line (Egghead)",
  },
  atlas: {
    wikiFirst: "Chapter 1062; Episode 1091",
    aliases: ["Atlas la Violente"],
    gender: "Féminin",
    age: 16,
    size: 729,
    affiliation: "Marine",
    sub_affiliation: ["SSG"],
    origin: "Grand Line (Egghead)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Satellite de Vegapunk",
    indice3: "Grand Line (Egghead)",
  },
  york: {
    wikiFirst: "Chapter 1065; Episode 1095",
    aliases: [],
    gender: "Féminin",
    age: 16,
    size: 482,
    affiliation: "Gouvernement Mondial",
    sub_affiliation: ["Nobles Mondiaux"],
    origin: "Grand Line (Egghead)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Satellite de Vegapunk",
    indice3: "Grand Line (Egghead)",
  },
  doll: {
    wikiFirst: "Chapter 1061; Episode 1090",
    aliases: [],
    gender: "Féminin",
    age: 28,
    size: 220,
    affiliation: "Marine",
    sub_affiliation: [],
    origin: "Grand Line",
    bounty: 500000000,
    devilFruitType: "",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Vice-amiral",
    indice3: "Armement, Observation, Conquérant",
  },
  emet: {
    wikiFirst: "Chapter 1065; Episode 1095",
    aliases: ["Géant de fer"],
    gender: "Indéterminé",
    age: 900,
    size: 1050,
    affiliation: "Gouvernement Mondial",
    sub_affiliation: [],
    origin: "Grand Line (Egghead)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Géant de fer",
    indice3: "Grand Line (Egghead)",
  },
  ginny: {
    wikiFirst: "Chapter 1095; Episode 1129",
    aliases: [],
    gender: "Féminin",
    age: 39,
    size: 174,
    affiliation: "Armée Révolutionnaire",
    sub_affiliation: ["Armée de l'Est"],
    origin: "Grand Line (Royaume de Porco)",
    bounty: 190000000,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Capitaine de l'Armée de l'Est",
    indice3: "Grand Line (Royaume de Porco)",
  },
  "jaygarcia-saturn": {
    wikiFirst: "Chapter 233; Episode 151",
    aliases: ["Saint Jaygarcia Saturn"],
    gender: "Masculin",
    age: 200,
    size: 350,
    affiliation: "Gouvernement Mondial",
    sub_affiliation: ["Cinq Sages"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "Zoan Mythique",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Ushi Ushi no Mi modèle Gyuki",
    indice3: "Armement, Observation, Conquérant",
  },
  "figarland-garling": {
    wikiFirst: "Chapter 1086; Episode 1120",
    aliases: ["Saint Figarland Garling"],
    gender: "Masculin",
    age: 58,
    size: 310,
    affiliation: "Gouvernement Mondial",
    sub_affiliation: ["Cinq Sages", "Chevaliers de Dieu"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Chevaliers de Dieu",
    indice3: "Armement, Observation, Conquérant",
  },
  "marcus-mars": {
    wikiFirst: "Chapter 233; Episode 151",
    aliases: ["Saint Marcus Mars"],
    gender: "Masculin",
    age: 200,
    size: 350,
    affiliation: "Gouvernement Mondial",
    sub_affiliation: ["Cinq Sages"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "Zoan Mythique",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Tori Tori no Mi modèle Itsumade",
    indice3: "Armement, Observation, Conquérant",
  },
  "topman-warcury": {
    wikiFirst: "Chapter 233; Episode 151",
    aliases: ["Saint Topman Warcury"],
    gender: "Masculin",
    age: 200,
    size: 350,
    affiliation: "Gouvernement Mondial",
    sub_affiliation: ["Cinq Sages"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "Zoan Mythique",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Hito Hito no Mi modèle Fengxi",
    indice3: "Armement, Observation, Conquérant",
  },
  "ethanbaron-v-nusjuro": {
    wikiFirst: "Chapter 233; Episode 151",
    aliases: ["Saint Ethanbaron V. Nusjuro"],
    gender: "Masculin",
    age: 200,
    size: 350,
    affiliation: "Gouvernement Mondial",
    sub_affiliation: ["Cinq Sages"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "Zoan Mythique",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Inu Inu no Mi modèle Bakotsu",
    indice3: "Armement, Observation, Conquérant",
  },
  "shepherd-ju-peter": {
    wikiFirst: "Chapter 233; Episode 151",
    aliases: ["Saint Shepherd Ju Peter"],
    gender: "Masculin",
    age: 200,
    size: 350,
    affiliation: "Gouvernement Mondial",
    sub_affiliation: ["Cinq Sages"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "Zoan Mythique",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Hito Hito no Mi modèle Morphon",
    indice3: "Armement, Observation, Conquérant",
  },
};

const DISPLAY_NAMES = {
  shaka: "Shaka",
  lilith: "Lilith",
  edison: "Edison",
  pythagoras: "Pythagoras",
  atlas: "Atlas",
  york: "York",
  doll: "Doll",
  emet: "Emet",
  ginny: "Ginny",
  "jaygarcia-saturn": "Jaygarcia Saturn",
  "figarland-garling": "Figarland Garling",
  "marcus-mars": "Marcus Mars",
  "topman-warcury": "Topman Warcury",
  "ethanbaron-v-nusjuro": "Ethanbaron V. Nusjuro",
  "shepherd-ju-peter": "Shepherd Ju Peter",
};

function buildEntry(id, def, anime) {
  const firstAppearance = anime
    ? parseEpisode(def.wikiFirst) || parseChapter(def.wikiFirst)
    : parseChapter(def.wikiFirst) || parseEpisode(def.wikiFirst);

  return {
    id,
    name: DISPLAY_NAMES[id],
    aliases: def.aliases ?? [],
    affiliation: def.affiliation,
    sub_affiliation: def.sub_affiliation ?? [],
    age: def.age,
    arc: "Egghead",
    bounty: def.bounty,
    devilFruitType: def.devilFruitType,
    gender: def.gender,
    haki: def.haki,
    origin: def.origin,
    size: def.size,
    race: def.race,
    indice1: def.affiliation,
    indice2: def.indice2,
    indice3: def.indice3,
    firstAppearance,
  };
}

function renameVegapunkToStella(characters) {
  const idx = characters.findIndex((c) => c.id === "vegapunk");
  if (idx === -1) throw new Error("vegapunk introuvable");
  const c = characters[idx];
  characters[idx] = {
    ...c,
    id: "stella",
    name: "Stella",
    aliases: ["Vegapunk", "Dr. Vegapunk", ...(c.aliases || []).filter((a) => !/vegapunk/i.test(a))],
    arc: "Egghead",
  };
}

function processFile(filePath) {
  const anime = IS_ANIME(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const existing = new Set(data.characters.map((c) => c.id));

  renameVegapunkToStella(data.characters);

  let added = 0;
  for (const [id, def] of Object.entries(EGGHEAD_CHARS)) {
    if (existing.has(id)) {
      console.warn(`[skip] ${path.basename(filePath)}: ${id} déjà présent`);
      continue;
    }
    data.characters.push(buildEntry(id, def, anime));
    added++;
  }

  data.characters.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`${path.basename(filePath)}: stella OK, +${added} persos (${data.characters.length} total)`);
}

for (const f of FILES) processFile(f);

// Images: renommer vegapunk → stella
for (const universe of ["one-piece-manga", "one-piece-anime"]) {
  const dir = path.join(ROOT, "public", "universes", universe, "characters");
  const from = path.join(dir, "vegapunk.png");
  const to = path.join(dir, "stella.png");
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    fs.unlinkSync(from);
    console.log(`image: ${universe}/vegapunk.png → stella.png`);
  }
}

// Overrides scripts fetch
for (const script of [
  "fetch-one-piece-first-appearance.mjs",
  "fetch-one-piece-manga-first-appearance.mjs",
  "add-one-piece-final-premiere.mjs",
]) {
  const p = path.join(ROOT, "scripts", script);
  if (!fs.existsSync(p)) continue;
  let src = fs.readFileSync(p, "utf8");
  if (src.includes('["vegapunk"')) {
    src = src.replace(/\["vegapunk",/g, '["stella",');
    fs.writeFileSync(p, src, "utf8");
    console.log(`script: ${script} vegapunk → stella`);
  }
}

console.log("Terminé.");
