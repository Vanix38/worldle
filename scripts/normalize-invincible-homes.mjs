import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const EARTH_US = "Terre, États-Unis";
const EARTH_EGYPT = "Terre, Égypte";
const EARTH_CHINA = "Terre, Chine";
const EARTH_UK = "Terre, Royaume-Uni";
const EARTH_ATLANTIS = "Terre, Atlantis";
const EARTH_RUSSIA = "Terre, Russie";
const ESPACE = "Espace";

const BY_ID = {
  // Espace
  "space-racer": ESPACE,
  "thragg": ESPACE,
  "capitaine-pikell": ESPACE,

  // Autres planètes (ville si connue)
  "argall": "Viltrum, Cité viltrumite",
  "conquest": "Viltrum, Cité viltrumite",
  "thaedus": "Talescria, Cité centrale de Talescria",
  "allen-l-extraterrestre": "Talescria, Cité centrale de Talescria",
  "omni-man": "Talescria, Cité centrale de Talescria",
  "telia": "Talescria, Cité centrale de Talescria",
  "andressa": "Thraxa",
  "battle-beast": "Dornin",
  "shapesmith": "Mars",
  "martian-man": "Mars",
  "universa": "Planète inconnue",

  // Autres mondes / dimensions
  "domina": "Enfer",
  "volcanikka": "Enfer",
  "satan": "Enfer",
  "damien-darkblood": "Enfer",
  "flaxan-leader": "Dimension flaxane",
  "robot": "Dimension flaxane",

  // Terre avec pays spécifique
  "ka-hor": EARTH_EGYPT,
  "mister-liu": EARTH_CHINA,
  "great-wall": EARTH_CHINA,
  "brit": EARTH_UK,
  "aquarus": EARTH_ATLANTIS,
  "olga": EARTH_RUSSIA,
  "l-immortel": EARTH_US,
  "l-immortel-ligne-temporelle-future": EARTH_US,
  "dropkick": EARTH_US,
  "fightmaster": EARTH_US,
  "atom-eve-ligne-temporelle-alternative": EARTH_US,
  "robot-ligne-temporelle-alternative": EARTH_US,
};

const EARTH_US_IDS = new Set([
  "powerplex",
  "radcliffe",
  "april-howsam",
  "oliver-grayson-ii",
  "lucan",
  "paul",
  "bulletproof",
  "d-a-sinclair",
  "rick-sheridan",
  "adam-wilkins",
  "betsy-wilkins",
  "isotope",
  "machine-head",
  "tether-tyrant",
  "black-samson",
  "monster-girl",
  "shrinking-rae",
  "atom-eve",
  "cecil-stedman",
  "donald-ferguson",
  "dupli-kate",
  "rex-splode",
  "amber-bennett",
  "art-rosenbaum",
  "debbie-grayson",
  "invincible",
  "kursk",
  "red-rush",
  "titan",
  "war-woman",
  "iguana",
  "komodo-dragon",
  "king-lizard",
  "supreme-lizard",
  "jumeaux-mauler",
  "the-elephant",
  "tech-jacket",
  "ed-thompson",
  "anissa",
  "kregg",
  "thula",
  "angstrom-levy",
  "doc-seismic",
  "killcannon",
  "multi-paul",
  "darkwing",
  "darkwing-ii",
  "green-ghost-ii",
]);

function normalizeHome(character) {
  if (BY_ID[character.id]) return BY_ID[character.id];
  if (EARTH_US_IDS.has(character.id)) return EARTH_US;

  const home = (character.home || "").toLowerCase();

  if (home.includes("états-unis")) return EARTH_US;
  if (home.includes("égypte")) return EARTH_EGYPT;
  if (home.includes("chine")) return EARTH_CHINA;
  if (home === "terre" || home.startsWith("terre ")) return EARTH_US;

  return character.home;
}

for (const c of data.characters) {
  c.home = normalizeHome(c);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Homes normalized.");
