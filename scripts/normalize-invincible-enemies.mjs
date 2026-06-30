import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const EMPIRE_VILTRUMITE = "Empire Viltrumite";
const TEAM_EVIL_INVINCIBLE = "Équipe des Invincibles maléfiques";
const GUARDIANS_OF_THE_GLOBE = "Gardiens du Globe";
const TEEN_TEAM = "Teen Team";
const THE_ORDER = "L'ordre";
const LIZARD_LEAGUE = "Ligue Lézard";
const COALITION_OF_PLANETS = "Coalition des Planètes";
const GLOBAL_DEFENSE_AGENCY = "Agence de Défence Globale (A.D.G.)";
const FLAXANS = "Flaxans";
const REANIMEN = "RéAnimen";
const GRAYSON_FAMILY = "Famille Grayson";
const SEQUIDS = "Sequids";
const THRAXA = "Thraxa";
const HELL_FORCES = "Forces de l'Enfer";
const IMMORTAL = "L\u2019Immortel";
const MISCELLANEOUS_ENEMIES = "Divers ennemis";
const CIVILIANS = "Civils";
const INVINCIBLE_FRIENDS = "Amis d'Invincible";
const EXCLUDED_ENEMIES = new Set(
  [
    "The Elephant",
    "Elephant",
    "Rampage",
    "Brit",
    "Killcannon",
    "Bi-Plane",
    "John Wilkes Booth",
    "Beach Kaiju",
    "Hail Mary",
    "Rognarrs",
    "Dinosaurus",
    "Prof. Ock",
    "Elite Guard",
    "Giant",
    "Kresh",
    "Torth",
    "Gardes extraterrestres de prison",
    "Jumeau Data II",
    "Chronodile",
    "Sam",
    "Sam's Friend",
    "Steven Erickson",
    "Rodgers",
  ].map((name) => name.toLowerCase())
);

function makeConsolidator(teamName, members) {
  const memberSet = new Set(members.map((name) => name.toLowerCase()));
  const teamKey = teamName.toLowerCase();

  return function consolidate(parts) {
    const count = parts.filter((part) => {
      const key = part.toLowerCase();
      return key === teamKey || memberSet.has(key);
    }).length;
    if (count < 2) return parts;

    const rest = parts.filter((part) => {
      const key = part.toLowerCase();
      return key !== teamKey && !memberSet.has(key);
    });
    return [teamName, ...rest];
  };
}

const consolidateLizardLeague = makeConsolidator(LIZARD_LEAGUE, [
  LIZARD_LEAGUE,
  "Roi Lézard",
  "Komodo Dragon",
  "Iguana",
  "Salamander",
  "Lézard Suprême",
  "Octoboss",
]);

const consolidateCoalition = makeConsolidator(COALITION_OF_PLANETS, [
  COALITION_OF_PLANETS,
  "Thaedus",
  "Allen l'Extraterrestre",
  "Allen l’Extraterrestre",
  "Space Racer",
  "Capitaine Pikell",
  "Tech Jacket",
  "Empereur geldérien",
  "Elia",
  "Mokk",
  "Battle Beast",
  "Générale Telia",
  "Marvin",
  "Jumeau Data I",
]);

const consolidateFlaxans = makeConsolidator(FLAXANS, [FLAXANS, "Chef flaxan"]);

const consolidateReanimen = makeConsolidator(REANIMEN, [
  REANIMEN,
  "D.A. Sinclair",
]);

const consolidateGraysonFamily = makeConsolidator(GRAYSON_FAMILY, [
  GRAYSON_FAMILY,
  "Debbie Grayson",
  "Oliver Grayson",
  "William Clockwell",
  "Amber Bennett",
]);

const consolidateSequids = makeConsolidator(SEQUIDS, [SEQUIDS, "Rus Livingston"]);

const consolidateThraxa = makeConsolidator(THRAXA, [
  THRAXA,
  "Thraxans",
  "Andressa",
  "Nuolzot",
]);

const consolidateHellForces = makeConsolidator(HELL_FORCES, [
  HELL_FORCES,
  "Volcanikka",
  "Magmanites",
  "Le Vil",
  "Cerberus",
  "Satan",
  "Domina",
]);

const consolidateCivilians = makeConsolidator(CIVILIANS, [
  CIVILIANS,
  "Adolescent 1",
  "Adolescent 2",
  "Jeune homme",
]);

const GUARDIAN_MEMBER_NAMES = new Set(
  [
    "Rex Splode",
    "Dupli-Kate",
    "L'Immortel",
    "L’Immortel",
    "Shrinking Rae",
    "Black Samson",
    "Monster Girl",
    "Robot",
    "Darkwing",
    "Darkwing II",
    "Red Rush",
    "War Woman",
    "Aquarus",
    "Fantôme Vert",
    "Fantôme Vert II",
    "Homme martien",
    "Bulletproof",
    "Shapesmith",
    "Giant",
  ].map((name) => name.toLowerCase())
);

function isGuardianEnemy(part) {
  const key = part.toLowerCase();
  return key === GUARDIANS_OF_THE_GLOBE.toLowerCase() || GUARDIAN_MEMBER_NAMES.has(key);
}

function consolidateGuardians(parts) {
  const guardianCount = parts.filter(isGuardianEnemy).length;
  if (guardianCount < 2) return parts;

  const rest = parts.filter((part) => !isGuardianEnemy(part));
  return [GUARDIANS_OF_THE_GLOBE, ...rest];
}

const TEEN_TEAM_MEMBER_NAMES = new Set(
  ["Robot", "Rex Splode", "Monster Girl", "Bulletproof", "Steve", "Pete"].map(
    (name) => name.toLowerCase()
  )
);

function isTeenTeamEnemy(part) {
  const key = part.toLowerCase();
  return key === TEEN_TEAM.toLowerCase() || TEEN_TEAM_MEMBER_NAMES.has(key);
}

function consolidateTeenTeam(parts) {
  const teenTeamCount = parts.filter(isTeenTeamEnemy).length;
  if (teenTeamCount < 2) return parts;

  const rest = parts.filter((part) => !isTeenTeamEnemy(part));
  return [TEEN_TEAM, ...rest];
}

const ENEMY_REPLACEMENTS = new Map(
  [
    ...[
      "Grand régent Thragg",
      "Général Kregg",
      "Conquest",
      "Anissa",
      "Lucan",
      "Thula",
      "Vidor",
      "Kradd",
      "Elix",
      "Bourreau 1",
      "Bourreau 2",
      "Auxiliaires viltrumites",
      "Empereur Argall",
      "Partenaire de Nolan",
      "Empire viltrumite",
    ].map((name) => [name.toLowerCase(), EMPIRE_VILTRUMITE]),
    ...[
      "Gogglesvincible",
      "Gogglevincible",
      "Movincihawk",
      "Omnivincible",
      "Hoodvincible",
      "Capvincible",
      "Hairvincible",
      "Capevincible",
      "Maskvincible",
      "Stripevincible",
      "Flaxancible",
      "Lightblueincible",
      "Nogogglesible",
      "Viltrumincible",
      "Prisonincible",
      "Nomaskible",
      "Bulletproofible",
      "Mustachible",
      "Sportvincible",
    ].map((name) => [name.toLowerCase(), TEAM_EVIL_INVINCIBLE]),
    ...[
      "Agence de défense mondiale",
      "Agence de Défense Mondiale",
      "Cecil Stedman",
      "Directeur Cecil Stedman",
      "Donald Ferguson",
      "Soldats G.D.A.",
      "Radcliffe",
      "Directeur Radcliffe",
    ].map((name) => [name.toLowerCase(), GLOBAL_DEFENSE_AGENCY]),
    ...[
      "Amber Bennett",
      "William Clockwell",
      "Rick Sheridan",
    ].map((name) => [name.toLowerCase(), INVINCIBLE_FRIENDS]),
    ...[
      "Équipe de Machine Head",
      "Machine Head",
      "Titan",
      "Isotope",
      "Kursk",
      "Tether Tyrant",
      "Magmaniac",
      "Furnace",
      "Mister Liu",
      "Mr. Liu",
      "Great Wall",
      "Multi-Paul",
      "Magnattack",
      "The Walking Dread",
      "The Face",
      "Red Eye",
      "Embrace",
      "Slaying Mantis",
      "Insomniac",
      "War Woman II",
      "Set",
    ].map((name) => [name.toLowerCase(), THE_ORDER]),
    ...[
      "L'Immortel/Ligne temporelle future",
      "L'Immortel/Ligne temporelle future",
      "L'Immortel",
    ].map((name) => [name.toLowerCase(), IMMORTAL]),
    ["divers autres", MISCELLANEOUS_ENEMIES],
    ["diverses races soumises", MISCELLANEOUS_ENEMIES],
  ]
);

function splitEnemies(value) {
  const preprocessed = (value || "").replace(
    /99,\s*9\s*%\s*des autres/gi,
    "99,9 % des autres"
  );

  return preprocessed
    .split(/,\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeEnemies(value) {
  const parts = splitEnemies(value);

  let normalized = parts.map(
    (part) => ENEMY_REPLACEMENTS.get(part.toLowerCase()) ?? part
  );
  normalized = consolidateLizardLeague(normalized);
  normalized = consolidateCoalition(normalized);
  normalized = consolidateFlaxans(normalized);
  normalized = consolidateReanimen(normalized);
  normalized = consolidateGraysonFamily(normalized);
  normalized = consolidateSequids(normalized);
  normalized = consolidateThraxa(normalized);
  normalized = consolidateHellForces(normalized);
  normalized = consolidateCivilians(normalized);
  normalized = consolidateGuardians(normalized);
  normalized = consolidateTeenTeam(normalized);

  normalized = normalized.filter(
    (part) => !EXCLUDED_ENEMIES.has(part.toLowerCase())
  );

  return [...new Set(normalized)].join(", ");
}

for (const c of data.characters) {
  c.indice1 = normalizeEnemies(c.indice1);

  if ((c.home || "").toLowerCase().includes("talescria")) {
    const parts = splitEnemies(c.indice1);
    const hasEmpire = parts.some(
      (part) => part.toLowerCase() === EMPIRE_VILTRUMITE.toLowerCase()
    );
    if (!hasEmpire) {
      c.indice1 = [EMPIRE_VILTRUMITE, ...parts].join(", ");
    }
  }
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Enemies normalized.");
