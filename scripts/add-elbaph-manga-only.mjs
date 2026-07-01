/**
 * Ajoute à one-piece-manga.json les persos Elbaph pas encore dans l'anime.
 * Usage: node scripts/add-elbaph-manga-only.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MANGA_PATH = path.join(ROOT, "data", "one-piece-manga.json");

const MANGA_ELBAPH_ORDER_END = 1160;

/** @type {Record<string, { chapter: number, aliases?: string[], gender: string, age: number, size: number, affiliation: string, sub_affiliation?: string[], origin: string, bounty: number, devilFruitType: string, haki: string[], race: string, indice2: string, indice3: string }>} */
const MANGA_ONLY_CHARS = {
  "scopper-gaban": {
    chapter: 1139,
    aliases: ["Ya-san", "Mountain-Eater", "Bras gauche du Roi des Pirates"],
    gender: "Masculin",
    age: 79,
    size: 195,
    affiliation: "Erbaf",
    sub_affiliation: ["Équipage de Roger"],
    origin: "Grand Line",
    bounty: 0,
    devilFruitType: "",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Navigateur",
    indice3: "Armement, Observation, Conquérant",
  },
  "shepherd-sommers": {
    chapter: 1140,
    aliases: ["Saint Shepherd Sommers"],
    gender: "Masculin",
    age: 0,
    size: 175,
    affiliation: "Chevaliers de Dieu",
    sub_affiliation: ["Nobles Mondiaux"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "Paramecia",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Iba Iba no Mi",
    indice3: "Armement, Observation, Conquérant",
  },
  "rimoshifu-killingham": {
    chapter: 1140,
    aliases: ["Saint Rimoshifu Killingham"],
    gender: "Masculin",
    age: 0,
    size: 175,
    affiliation: "Chevaliers de Dieu",
    sub_affiliation: ["Nobles Mondiaux"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "Zoan Mythique",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Ryu Ryu no Mi modèle Kirin",
    indice3: "Armement, Observation, Conquérant",
  },
  "wolf-elbaph": {
    chapter: 1142,
    aliases: ["Wolf"],
    gender: "Masculin",
    age: 0,
    size: 1900,
    affiliation: "École du Morse",
    sub_affiliation: [],
    origin: "Erbaf",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Professeur de sport",
    indice3: "Erbaf",
  },
  blade: {
    chapter: 1142,
    aliases: [],
    gender: "Masculin",
    age: 0,
    size: 1800,
    affiliation: "École du Morse",
    sub_affiliation: [],
    origin: "Erbaf",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Professeur de mathématiques",
    indice3: "Erbaf",
  },
  estrid: {
    chapter: 1153,
    aliases: [],
    gender: "Féminin",
    age: 0,
    size: 1700,
    affiliation: "Erbaf",
    sub_affiliation: ["Famille royale d'Erbaf"],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Reine",
    indice3: "Grand Line (Erbaf)",
  },
  ida: {
    chapter: 1153,
    aliases: [],
    gender: "Féminin",
    age: 0,
    size: 1700,
    affiliation: "Erbaf",
    sub_affiliation: ["Village des Pêcheurs"],
    origin: "South Blue (Île de Samuwanai)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Barmaid",
    indice3: "South Blue (Île de Samuwanai)",
  },
  magnolia: {
    chapter: 1158,
    aliases: [],
    gender: "Féminin",
    age: 0,
    size: 170,
    affiliation: "God Valley",
    sub_affiliation: [],
    origin: "Grand Line (God Valley)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Mère de Shanks et Shamrock",
    indice3: "Grand Line (God Valley)",
  },
  eris: {
    chapter: 1159,
    aliases: [],
    gender: "Féminin",
    age: 0,
    size: 170,
    affiliation: "Famille Davy",
    sub_affiliation: [],
    origin: "Grand Line (God Valley)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Épouse de Rocks D. Xebec",
    indice3: "Grand Line (God Valley)",
  },
  "satchels-maffey": {
    chapter: 1160,
    aliases: ["Saint Satchels Maffey"],
    gender: "Féminin",
    age: 0,
    size: 450,
    affiliation: "Chevaliers de Dieu",
    sub_affiliation: ["Nobles Mondiaux"],
    origin: "Grand Line (Mary Geoise)",
    bounty: 0,
    devilFruitType: "",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Chevalière de Dieu",
    indice3: "Armement, Observation, Conquérant",
  },
};

const DISPLAY_NAMES = {
  "scopper-gaban": "Scopper Gaban",
  "shepherd-sommers": "Shepherd Sommers",
  "rimoshifu-killingham": "Rimoshifu Killingham",
  "wolf-elbaph": "Wolf",
  blade: "Blade",
  estrid: "Estrid",
  ida: "Ida",
  magnolia: "Magnolia",
  eris: "Eris",
  "satchels-maffey": "Satchels Maffey",
};

function extendElbaphOrder(data) {
  const elbaph = data.fieldMapping.firstAppearance.order["Saga Finale"].Elbaph;
  const last = elbaph.length
    ? Number(elbaph[elbaph.length - 1].replace("Chapitre ", ""))
    : 1125;
  for (let n = last + 1; n <= MANGA_ELBAPH_ORDER_END; n++) {
    elbaph.push(`Chapitre ${n}`);
  }
}

function buildEntry(id, def) {
  return {
    id,
    name: DISPLAY_NAMES[id],
    aliases: def.aliases ?? [],
    affiliation: def.affiliation,
    sub_affiliation: def.sub_affiliation ?? [],
    age: def.age,
    arc: "Elbaph",
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
    firstAppearance: `Chapitre ${def.chapter}`,
  };
}

const data = JSON.parse(fs.readFileSync(MANGA_PATH, "utf8"));
const existing = new Set(data.characters.map((c) => c.id));

extendElbaphOrder(data);

let added = 0;
for (const [id, def] of Object.entries(MANGA_ONLY_CHARS)) {
  if (existing.has(id)) {
    console.warn(`[skip] ${id} déjà présent`);
    continue;
  }
  data.characters.push(buildEntry(id, def));
  added++;
}

data.characters.sort((a, b) => a.name.localeCompare(b.name, "fr"));
fs.writeFileSync(MANGA_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`one-piece-manga.json: +${added} persos manga-only (${data.characters.length} total), order → Ch. ${MANGA_ELBAPH_ORDER_END}`);
