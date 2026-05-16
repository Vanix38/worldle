/**
 * Patch marvel-cineverse.json abilities per user rules.
 * Run: node scripts/patch-marvel-cineverse-abilities.mjs
 */
import fs from "node:fs";

const path = new URL("../data/marvel-cineverse.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(path, "utf8"));

const TECH_IDS = new Set([
  "tony_stark-mcu-616",
  "james_rhodes-mcu-616",
  "sam_wilson-mcu-616",
  "scott_lang-mcu-616",
  "hope_van_dyne-mcu-616",
  "cassie_lang-mcu-616",
  "hank_pym-mcu-616",
  "shuri-mcu-616",
  "pepper_potts-mcu-616",
  "obadiah_stane-mcu-616",
  "ivan_vanko-mcu-616",
  "justin_hammer-mcu-616",
  "aldrich_killian-mcu-616",
  "raza-mcu-616",
  "howard_stark-mcu-616",
  "riri_williams-mcu-616",
  "nick_fury-mcu-616",
  "phillip_coulson-mcu-616",
]);

const COSMIC_IDS = new Set([
  "carol_danvers-mcu-616",
  "monica_rambeau-mcu-616",
  "maria_rambeau-mcu-838",
]);

const SPECIES_TAG = {
  Eternal: ["Cosmique"],
  "Entité Cosmique": ["Cosmique"],
  Titan: ["Cosmique"],
  Faltine: ["Cosmique"],
  Deviant: ["Cosmique"],
  "Céleste|Insectoïde": ["Cosmique"],
  Alien: ["Alien"],
  Kree: ["Alien"],
  Skrull: ["Alien"],
  "Frost Giant": ["Alien"],
  "Flora Colossus": ["Alien"],
  Luphomoid: ["Alien"],
  Zehoberei: ["Alien"],
  Centaurian: ["Alien"],
  "Dark Elf": ["Alien"],
  Sakaaran: ["Alien"],
  Souverain: ["Alien"],
  Xandarian: ["Alien"],
  Kronan: ["Alien"],
  "Halfworlder|Raton laveur": ["Alien"],
  Symbiote: ["Alien"],
  Talokanil: ["Alien"],
  Vanir: ["Alien"],
  Chien: ["Alien"],
  Vampire: ["Surhumain"],
  Robot: ["Technologie"],
  "Elder of the Universe": ["Cosmique"],
  Démon: ["Cosmique"],
  "Démon de Feu": ["Cosmique"],
  "Créature des marais": ["Surhumain"],
};

function speciesKey(species) {
  if (Array.isArray(species)) return species.join("|");
  return species;
}

function abilitiesFromSpecies(species) {
  const key = speciesKey(species);
  if (key === "Humain|Kree" || key === "Humain|Noor") return ["Cosmique"];
  if (SPECIES_TAG[key]) return [...SPECIES_TAG[key]];
  if (Array.isArray(species)) {
    for (const s of species) {
      if (SPECIES_TAG[s]) return [...SPECIES_TAG[s]];
    }
  }
  return null;
}

function isProtectedPreset(abilities) {
  if (!abilities || abilities.length === 0) return false;
  if (abilities.length === 1) {
    const a = abilities[0];
    return a === "Divin" || a === "Mutante";
  }
  return false;
}

for (const c of data.characters) {
  const id = c.id;

  if (id === "vision-mcu-616" || id === "white_vision-mcu-616" || id === "ultron-mcu-616") {
    c.abilities = ["Technologie"];
    continue;
  }

  if (id.startsWith("stephen_strange-") || id === "wong-mcu-616" || id === "l_ancien-mcu-616") {
    c.abilities = ["Mystique", "Magique"];
    continue;
  }

  if (id === "wanda_maximoff-mcu-616" || id === "agatha_harkness-mcu-616") {
    c.abilities = ["Magique"];
    continue;
  }

  if (c.role === "Civil") continue;

  if (isProtectedPreset(c.abilities)) continue;

  if (TECH_IDS.has(id)) {
    c.abilities = ["Technologie"];
    continue;
  }

  if (COSMIC_IDS.has(id)) {
    c.abilities = ["Cosmique"];
    continue;
  }

  const fromSpecies = abilitiesFromSpecies(c.species);
  if (fromSpecies) {
    c.abilities = fromSpecies;
    continue;
  }

  if (c.species === "Humain") {
    const combat = new Set([
      "Héros",
      "Vilain",
      "Anti-héros",
      "Justicier",
      "Antagoniste",
      "Traître",
      "Traétre",
      "Amoral",
    ]);
    if (combat.has(c.role)) {
      c.abilities = ["Surhumain"];
    }
    continue;
  }

  if (!c.abilities || c.abilities.length === 0) {
    c.abilities = ["Surhumain"];
  }
}

/** Mentor / Réformé humains : hors set « combat » par défaut */
const EMPTY_FILL = {
  "bucky_barnes-mcu-616": ["Surhumain"],
  "yelena_belova-mcu-616": ["Surhumain"],
  "pietro_maximoff-mcu-616": ["Surhumain"],
  "stick-mcu-616": ["Surhumain"],
  "stick-independants-701306": ["Surhumain"],
  "adrian_toomes-mcu-616": ["Technologie"],
  "kraglin-mcu-616": ["Surhumain"],
  "t_chaka-mcu-616": ["Aucune"],
  "ramonda-mcu-616": ["Aucune"],
  "janet_van_dyne-mcu-616": ["Technologie"],
  "alexei_shostakov-mcu-616": ["Surhumain"],
  "curt_connors-raimi_verse-96283": ["Aucune"],
  "harry_osborn-raimi_verse-96283": ["Technologie"],
  "ben_parker-raimi_verse-96283": ["Aucune"],
  "ben_parker-webb_verse-120703": ["Aucune"],
  "carter_slade-independants-121347": ["Magique"],
};

for (const c of data.characters) {
  if (c.abilities && c.abilities.length > 0) continue;
  const fill = EMPTY_FILL[c.id];
  if (fill) c.abilities = [...fill];
}

fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
