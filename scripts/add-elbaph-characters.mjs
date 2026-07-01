/**
 * Ajoute les personnages Elbaph (anime ép. 1156–1168) et met à jour l'arc des retours.
 * Usage: node scripts/add-elbaph-characters.mjs
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

const MANGA_ELBAPH_START = 1126;
const MANGA_ELBAPH_END = 1142;
const ANIME_ELBAPH_START = 1156;
const ANIME_ELBAPH_END = 1168;

/** @type {Record<string, { wikiFirst: string, aliases?: string[], gender: string, age: number, size: number, affiliation: string, sub_affiliation?: string[], origin: string, bounty: number, devilFruitType: string, haki: string[], race: string, indice2: string, indice3: string }>} */
const NEW_CHARS = {
  loki: {
    wikiFirst: "Chapter 1130; Episode 1160",
    aliases: ["Prince maudit", "Sun God"],
    gender: "Masculin",
    age: 63,
    size: 2800,
    affiliation: "Erbaf",
    sub_affiliation: ["Famille royale d'Erbaf"],
    origin: "Grand Line (Erbaf)",
    bounty: 2600000000,
    devilFruitType: "",
    haki: ["Conquérant"],
    race: "Géant",
    indice2: "Prince maudit",
    indice3: "Grand Line (Erbaf)",
  },
  iscat: {
    wikiFirst: "Chapter 1127; Episode 1157",
    aliases: [],
    gender: "Indéterminé",
    age: 0,
    size: 900,
    affiliation: "Royaume des Blocs",
    sub_affiliation: [],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Félin géant",
    indice3: "Grand Line (Erbaf)",
  },
  ange: {
    wikiFirst: "Chapter 1131; Episode 1161",
    aliases: [],
    gender: "Féminin",
    age: 0,
    size: 1700,
    affiliation: "École du Morse",
    sub_affiliation: [],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "École du Morse",
    indice3: "Grand Line (Erbaf)",
  },
  gunko: {
    wikiFirst: "Chapter 1134; Episode 1164",
    aliases: ["Manmayer Gunko"],
    gender: "Féminin",
    age: 77,
    size: 170,
    affiliation: "Chevaliers de Dieu",
    sub_affiliation: ["Nobles Mondiaux"],
    origin: "West Blue (Royaume d'Esperia)",
    bounty: 0,
    devilFruitType: "Paramecia",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Aro Aro no Mi",
    indice3: "Armement, Observation, Conquérant",
  },
  ripley: {
    wikiFirst: "Chapter 1134; Episode 1164",
    aliases: [],
    gender: "Féminin",
    age: 80,
    size: 1700,
    affiliation: "École du Morse",
    sub_affiliation: [],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Professeure de biologie",
    indice3: "Grand Line (Erbaf)",
  },
  biblo: {
    wikiFirst: "Chapter 1134; Episode 1164",
    aliases: [],
    gender: "Masculin",
    age: 300,
    size: 120,
    affiliation: "Bibliothèque du Hibou",
    sub_affiliation: [],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "Paramecia",
    haki: [],
    race: "Humain",
    indice2: "Iku Iku no Mi",
    indice3: "Grand Line (Erbaf)",
  },
  mosa: {
    wikiFirst: "Chapter 1134; Episode 1164",
    aliases: [],
    gender: "Indéterminé",
    age: 0,
    size: 180,
    affiliation: "Erbaf",
    sub_affiliation: ["Underworld"],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Humain",
    indice2: "Prisonnier",
    indice3: "Grand Line (Erbaf)",
  },
  ylva: {
    wikiFirst: "Chapter 1134; Episode 1164",
    aliases: [],
    gender: "Féminin",
    age: 12,
    size: 450,
    affiliation: "École du Morse",
    sub_affiliation: [],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Élève",
    indice3: "Grand Line (Erbaf)",
  },
  harald: {
    wikiFirst: "Chapter 1136; Episode 1166",
    aliases: [],
    gender: "Masculin",
    age: 144,
    size: 2200,
    affiliation: "Erbaf",
    sub_affiliation: ["Famille royale d'Erbaf", "Chevaliers de Dieu"],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Géant",
    indice2: "Ancien roi",
    indice3: "Armement, Observation, Conquérant",
  },
  kiba: {
    wikiFirst: "Chapter 1142; Episode 1168",
    aliases: [],
    gender: "Masculin",
    age: 0,
    size: 2000,
    affiliation: "École du Morse",
    sub_affiliation: ["Équipage des Géants"],
    origin: "Grand Line (Erbaf)",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Directeur",
    indice3: "Grand Line (Erbaf)",
  },
  "figarland-shamrock": {
    wikiFirst: "Chapter 907; Episode 887",
    aliases: ["Saint Figarland Shamrock"],
    gender: "Masculin",
    age: 39,
    size: 185,
    affiliation: "Chevaliers de Dieu",
    sub_affiliation: ["Nobles Mondiaux"],
    origin: "West Blue (God Valley)",
    bounty: 0,
    devilFruitType: "Zoan Mythique",
    haki: ["Armement", "Observation", "Conquérant"],
    race: "Humain",
    indice2: "Cerberus",
    indice3: "Armement, Observation, Conquérant",
  },
  kashii: {
    wikiFirst: "Chapter 377; Episode 265",
    aliases: [],
    gender: "Masculin",
    age: 156,
    size: 1700,
    affiliation: "Équipage des Géants",
    sub_affiliation: [],
    origin: "Erbaf",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Géant",
    indice3: "Erbaf",
  },
  stansen: {
    wikiFirst: "Chapter 500; Episode 394",
    aliases: [],
    gender: "Masculin",
    age: 81,
    size: 1950,
    affiliation: "Les Pirates d'Expédition",
    sub_affiliation: ["Grand Fleet du Chapeau de Paille"],
    origin: "Grand Line",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Géant",
    indice3: "Grand Line",
  },
  road: {
    wikiFirst: "Chapter 898; Episode 836",
    aliases: ["Sun God"],
    gender: "Masculin",
    age: 63,
    size: 2600,
    affiliation: "Les Pirates d'Expédition",
    sub_affiliation: ["Royaume des Blocs"],
    origin: "Erbaf",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Géant",
    indice3: "Erbaf",
  },
  goldberg: {
    wikiFirst: "Chapter 899; Episode 836",
    aliases: [],
    gender: "Masculin",
    age: 63,
    size: 2100,
    affiliation: "Les Pirates d'Expédition",
    sub_affiliation: ["Grand Fleet du Chapeau de Paille"],
    origin: "Erbaf",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Géant",
    indice3: "Erbaf",
  },
  jarul: {
    wikiFirst: "Chapter 866; Episode 836",
    aliases: ["Jarul à la barbe de montagne"],
    gender: "Masculin",
    age: 408,
    size: 2050,
    affiliation: "Équipage des Géants",
    sub_affiliation: [],
    origin: "Erbaf",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Ancien du village",
    indice3: "Erbaf",
  },
  colon: {
    wikiFirst: "Chapter 1076; Episode 1109",
    aliases: [],
    gender: "Masculin",
    age: 20,
    size: 350,
    affiliation: "Erbaf",
    sub_affiliation: [],
    origin: "Erbaf",
    bounty: 0,
    devilFruitType: "",
    haki: [],
    race: "Géant",
    indice2: "Demi-géant",
    indice3: "Erbaf",
  },
};

const DISPLAY_NAMES = {
  loki: "Loki",
  iscat: "Iscat",
  ange: "Ange",
  gunko: "Gunko",
  ripley: "Ripley",
  biblo: "Biblo",
  mosa: "Mosa",
  ylva: "Ylva",
  harald: "Harald",
  kiba: "Kiba",
  "figarland-shamrock": "Figarland Shamrock",
  kashii: "Kashii",
  stansen: "Stansen",
  road: "Road",
  goldberg: "Goldberg",
  jarul: "Jarul",
  colon: "Colon",
};

/** Persos déjà en base : arc Elbaph, firstAppearance inchangée */
const UPDATE_ARC_IDS = new Set([
  "lilith",
  "jewelry-bonney",
  "bartholomew-kuma",
  "oimo",
  "dorry",
  "brogy",
  "hajrudin",
  "gerd",
  "haguar-d-sauro",
]);

const EXTRA_ALIASES = {
  "haguar-d-sauro": ["Jaguar D. Saul"],
};

function parseChapter(first) {
  const m = first.match(/Chapter\s+(\d+)/i);
  return m ? `Chapitre ${m[1]}` : null;
}

function parseEpisode(first) {
  const m = first.match(/Episode\s+(\d+)/i);
  return m ? `Épisode ${m[1]}` : null;
}

function rangeLabels(prefix, start, end) {
  const out = [];
  for (let n = start; n <= end; n++) out.push(`${prefix} ${n}`);
  return out;
}

function ensureElbaphOrder(data, anime) {
  const prefix = anime ? "Épisode" : "Chapitre";
  const start = anime ? ANIME_ELBAPH_START : MANGA_ELBAPH_START;
  const end = anime ? ANIME_ELBAPH_END : MANGA_ELBAPH_END;
  const labels = rangeLabels(prefix, start, end);

  const sagaFinale = data.fieldMapping.firstAppearance.order["Saga Finale"];
  if (!sagaFinale.Elbaph) sagaFinale.Elbaph = labels;

  const arcOrder = data.fieldMapping.arc.order["Saga Finale"];
  if (!arcOrder.includes("Elbaph")) arcOrder.push("Elbaph");
}

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
    firstAppearance,
  };
}

function processFile(filePath) {
  const anime = IS_ANIME(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const existing = new Set(data.characters.map((c) => c.id));

  ensureElbaphOrder(data, anime);

  let added = 0;
  let updated = 0;

  for (const [id, def] of Object.entries(NEW_CHARS)) {
    if (existing.has(id)) {
      console.warn(`[skip add] ${path.basename(filePath)}: ${id} déjà présent`);
      continue;
    }
    data.characters.push(buildEntry(id, def, anime));
    added++;
  }

  for (const c of data.characters) {
    if (UPDATE_ARC_IDS.has(c.id)) {
      c.arc = "Elbaph";
      if (EXTRA_ALIASES[c.id]) {
        const extra = EXTRA_ALIASES[c.id];
        c.aliases = [...new Set([...(c.aliases ?? []), ...extra])];
      }
      updated++;
    }
  }

  data.characters.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`${path.basename(filePath)}: +${added} ajouts, ${updated} arcs → Elbaph (${data.characters.length} total)`);
}

for (const f of FILES) processFile(f);
console.log("Terminé.");
