/**
 * Ajoute fieldMapping.*.description dans les JSON data/.
 * Usage : node scripts/inject-column-descriptions.cjs
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const DESCRIPTIONS = {
  "dead-by-daylight": {
    gender: "Genre du personnage (tueur ou survivant).",
    role: "Rôle de jeu : survivant ou tueur.",
    licence: "Univers ou licence d'origine du personnage (original, film, jeu, etc.).",
    releaseDate:
      "Date d'arrivée du personnage dans Dead by Daylight ; la grille indique si ta date est avant ou après.",
    aliases: "Champ utilisé uniquement pour la recherche (non affiché dans le tableau de comparaison).",
    indice1: "Indice sur le type de rôle (survivant / tueur), débloqué après plusieurs tentatives.",
    indice2: "Indice sur la licence d'origine, débloqué après plusieurs tentatives.",
    indice3: "Indice sur la date de sortie, débloqué après plusieurs tentatives.",
  },
  "marvel-rivals": {
    gender: "Genre du héros ou de l'anti-héros.",
    affiliation: "Équipe ou faction principale (Avengers, X-Men, etc.).",
    role: "Rôle de combat dans le jeu (duelliste, stratège, etc.).",
    race: "Espèce ou nature du personnage (humain, mutant, etc.).",
    origin: "Lieu ou monde d'origine.",
    powerSource: "Origine des pouvoirs (cosmique, technologique, etc.).",
    releaseDate:
      "Mois de sortie du personnage dans Marvel Rivals ; comparaison chronologique.",
    aliases: "Champ de recherche par alias (non affiché dans la grille).",
    indice1: "Indice sur l'équipe et l'origine, débloqué après plusieurs tentatives.",
    indice2: "Indice sur le rôle et la race, débloqué après plusieurs tentatives.",
    indice3: "Indice sur la source de pouvoir, débloqué après plusieurs tentatives.",
  },
  "marvel-cineverse": {
    status: "État du personnage dans le MCU au moment de la dernière œuvre prise en compte (vivant, décédé, etc.).",
    species: "Espèce ou type (humain, Asgardien, Kree, etc.).",
    gender: "Genre du personnage.",
    affiliation: "Organisation ou équipe principale (Avengers, Wakanda, etc.).",
    role: "Rôle narratif ou fonction (héros, méchant, anti-héros, etc.).",
    indice1: "Indice sur l'acteur ou la doubleuse, débloqué après plusieurs tentatives.",
    indice2: "Indice sur l'année de première apparition à l'écran, débloqué après plusieurs tentatives.",
    indice3: "Indice sur les films et séries où le personnage apparaît, débloqué après plusieurs tentatives.",
    firstAppearance:
      "Première œuvre du MCU où le personnage apparaît ; la colonne compare l'ordre chronologique des œuvres.",
    aliases: "Alias et noms alternatifs utilisés pour la recherche (non affichés dans la grille).",
    earth: "Numéro de Terre ou filière du multivers (ex. 616).",
    univers: "Franchise ou label (MCU, etc.).",
  },
  "one-piece": {
    gender: "Genre du personnage.",
    age: "Âge en années ; la grille indique si l'âge est plus haut ou plus bas.",
    bounty: "Prime en berries ; comparaison numérique plus haut / plus bas.",
    arc:
      "Arc narratif de la première apparition du personnage dans le manga ou l'anime ; ordre chronologique des arcs.",
    devilFruitType: "Type de fruit du démon (Paramecia, Zoan, Logia, aucun, etc.).",
    affiliation: "Équipage ou organisation principale.",
    sub_affiliation: "Sous-affiliations ou sous-groupes (recherche uniquement).",
    aliases: "Alias pour la recherche (non affichés dans la grille).",
    indice1: "Indice sur le rang et le rôle dans le monde de One Piece, débloqué après plusieurs tentatives.",
    indice2: "Indice sur le fruit du démon ou son type, débloqué après plusieurs tentatives.",
    indice3: "Indice sur le haki et l'origine, débloqué après plusieurs tentatives.",
    origin: "Lieu ou mer d'origine (Grand Line, East Blue, etc.).",
    haki: "Types de haki maîtrisés (Observation, Armement, des Rois).",
    size: "Taille en centimètres ; comparaison numérique.",
    race: "Race ou peuple (humain, homme-poisson, géant, etc.).",
  },
};

for (const file of fs.readdirSync(DATA_DIR)) {
  if (!file.endsWith(".json")) continue;
  const fp = path.join(DATA_DIR, file);
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  if (!data.id || !data.fieldMapping) continue;
  const per = DESCRIPTIONS[data.id];
  if (!per) {
    console.warn("Pas de descriptions définies pour", data.id, "- ignoré");
    continue;
  }
  for (const [key, entry] of Object.entries(data.fieldMapping)) {
    if (per[key]) {
      entry.description = per[key];
    }
  }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Mis à jour:", file);
}
