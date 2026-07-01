/**
 * Regroupe fieldMapping.firstAppearance.order par année de sortie.
 * Usage: node scripts/build-marvel-cineverse-order-by-year.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "marvel-cineverse.json");

/** Années pour œuvres sans personnage (ou sans indice2) dans le dataset. */
const MANUAL_RELEASE_YEARS = {
  "Agents of S.H.I.E.L.D. (Saison 1)": "2013",
  "Wolverine : Le combat de l'immortel": "2013",
  "Agents of S.H.I.E.L.D. (Saison 2)": "2014",
  "Agent Carter (Saison 1)": "2015",
  "Agents of S.H.I.E.L.D. (Saison 3)": "2015",
  "Agent Carter (Saison 2)": "2016",
  "X-Men : Apocalypse": "2016",
  "Agents of S.H.I.E.L.D. (Saison 4)": "2016",
  "Marvel’s Inhumans (Saison 1)": "2017",
  "Marvel’s Runaways (Saison 1)": "2017",
  "Jessica Jones (Saison 2)": "2018",
  "Marvel’s Cloak & Dagger (Saison 1)": "2018",
  "Luke Cage (Saison 2)": "2018",
  "Marvel’s Runaways (Saison 2)": "2018",
  "Jessica Jones (Saison 3)": "2019",
  "Le Punisher (Saison 2)": "2019",
  "Marvel’s Cloak & Dagger (Saison 2)": "2019",
  "Agents of S.H.I.E.L.D. (Saison 6)": "2019",
  "Marvel’s Runaways (Saison 3)": "2019",
  "The New Mutants": "2020",
  "Agents of S.H.I.E.L.D. (Saison 7)": "2020",
  "Helstrom (Saison 1)": "2020",
  "Spider-Man : No Way Home": "2021",
  "Thor : Love and Thunder": "2022",
  "Je suis Groot (Saison 1)": "2022",
  "Les Gardiens de la Galaxie : Les Fêtes des Fêtes": "2022",
  "Spider-Man : Across the Spider-Verse": "2023",
  "Secret Invasion (Saison 1)": "2023",
  "Je suis Groot (Saison 2)": "2023",
  "Loki (Saison 2)": "2023",
  "What If...? (Saison 2)": "2023",
  "Echo (Saison 1)": "2024",
  "Venom: The Last Dance": "2024",
  "What If...? (Saison 3)": "2024",
  "Captain America : Brave New World": "2025",
  "Daredevil : Born Again (Saison 1)": "2025",
  "Daredevil : Born Again (Saison 2)": "2025",
  "Avengers : Doomsday": "2026",
  "Spider-Man : Brand New Day": "2026",
};

const YEAR_OVERRIDES = {
  "What If...? (Saison 1)": "2021",
};

function buildYearByTitle(characters) {
  const map = new Map();
  for (const c of characters) {
    const title = c.firstAppearance;
    const year = c.indice2;
    if (!title || year === undefined || year === null) continue;
    const y = String(year).trim();
    if (!map.has(title)) map.set(title, new Set());
    map.get(title).add(y);
  }
  return map;
}

function resolveYear(title, yearByTitle) {
  if (YEAR_OVERRIDES[title]) return YEAR_OVERRIDES[title];
  const fromChars = yearByTitle.get(title);
  if (fromChars?.size === 1) return [...fromChars][0];
  if (fromChars && fromChars.size > 1) {
    return [...fromChars].sort()[0];
  }
  const manual = MANUAL_RELEASE_YEARS[title];
  if (manual) return manual;
  return null;
}

function groupOrderByYear(flatOrder, characters) {
  const yearByTitle = buildYearByTitle(characters);
  const grouped = {};
  const missing = [];

  for (const title of flatOrder) {
    const year = resolveYear(title, yearByTitle);
    if (!year) {
      missing.push(title);
      continue;
    }
    const key = year;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(title);
  }

  if (missing.length) {
    throw new Error(`Année manquante pour: ${missing.join(", ")}`);
  }

  const flat = Object.values(grouped).flat();
  if (flat.length !== flatOrder.length) {
    throw new Error(`Perte d'entrées: ${flatOrder.length} → ${flat.length}`);
  }
  for (let i = 0; i < flatOrder.length; i++) {
    if (flat[i] !== flatOrder[i]) {
      throw new Error(`Ordre altéré à l'index ${i}: ${flatOrder[i]} vs ${flat[i]}`);
    }
  }

  return grouped;
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const flatOrder = data.fieldMapping.firstAppearance.order;
if (!Array.isArray(flatOrder)) {
  throw new Error("order déjà groupé ou absent");
}

const grouped = groupOrderByYear(flatOrder, data.characters);
data.fieldMapping.firstAppearance.order = grouped;

fs.writeFileSync(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`OK — ${flatOrder.length} œuvres, ${Object.keys(grouped).length} années`);
