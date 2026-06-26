/**
 * Build data/amazon-invincible.json from data/amazon-invincible-characters-fields.csv.
 *
 * Usage:
 *   node scripts/build-invincible-json-from-csv.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_CSV = path.join(ROOT, "data", "amazon-invincible-characters-fields.csv");
const DEFAULT_OUT = path.join(ROOT, "data", "amazon-invincible.json");

const FIRST_APPEARANCE_ORDER = [
  "1x01",
  "1x02",
  "1x03",
  "1x04",
  "1x05",
  "1x06",
  "1x07",
  "1x08",
  "2x01",
  "2x02",
  "2x03",
  "2x04",
  "2x05",
  "2x06",
  "2x07",
  "2x08",
  "3x01",
  "3x02",
  "3x03",
  "3x04",
  "3x05",
  "3x06",
  "3x07",
  "3x08",
  "4x01",
  "4x02",
  "4x03",
  "4x04",
  "4x05",
  "4x06",
  "4x07",
  "4x08",
];

const FIELD_MAPPING = {
  firstAppearance: {
    header: "Première apparition",
    fonction: "Comparaison",
    order: FIRST_APPEARANCE_ORDER,
    description: "Premier épisode d'apparition dans la série Invincible, au format saison x épisode.",
  },
  gender: {
    header: "Genre",
    fonction: "Classique",
    description: "Genre du personnage.",
  },
  species: {
    header: "Espèce",
    fonction: "Multivalue",
    description: "Espèce ou race du personnage. Orange si au moins une entrée est commune avec la cible.",
  },
  status: {
    header: "Statut",
    fonction: "Classique",
    description: "Statut actuel du personnage.",
  },
  home: {
    header: "Lieu",
    fonction: "Multivalue",
    description: "Lieu de résidence, planète, monde ou univers associé au personnage.",
  },
  occupation: {
    header: "Occupation actuelle",
    fonction: "Multivalue",
    description: "Occupations actuelles du personnage.",
  },
  formerOccupations: {
    header: "Anciennes occupations",
    fonction: "Multivalue",
    description: "Anciennes occupations connues du personnage.",
  },
  enemies: {
    header: "Ennemis",
    fonction: "Multivalue",
    description: "Ennemis listés sur la fiche wiki. Orange si au moins une entrée est commune avec la cible.",
  },
  aliases: {
    header: "Alias",
    fonction: "Recherche",
    description: "Alias et autres noms, utilisés pour la recherche.",
  },
};

function parseCsvLine(line, delimiter = ";") {
  const out = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cur += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += char;
  }

  out.push(cur);
  return out;
}

function parseArgs(argv) {
  const opts = {
    csvPath: DEFAULT_CSV,
    outPath: DEFAULT_OUT,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--csv") opts.csvPath = argv[++i] || DEFAULT_CSV;
    else if (arg === "--out") opts.outPath = argv[++i] || DEFAULT_OUT;
  }

  return opts;
}

function readCsv(csvPath) {
  const lines = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function maybeList(value) {
  const list = splitList(value);
  if (list.length === 0) return "";
  return list.join(", ");
}

function buildCharacter(row) {
  const char = {
    id: slugify(row.title),
    name: row.title,
    aliases: splitList(row["other names"]),
    firstAppearance: row["first appearance"] || "",
    gender: row.gender || "",
    species: maybeList(row.species),
    status: row.status || "",
    home: maybeList(row.home),
    occupation: maybeList(row.occupation),
    formerOccupations: maybeList(row.former_occupations),
    enemies: maybeList(row.enemies),
  };

  if (row.image_url) char.imageUrl = row.image_url;
  return char;
}

function main() {
  const opts = parseArgs(process.argv);
  const rows = readCsv(opts.csvPath);
  const data = {
    id: "amazon-invincible",
    name: "Invincible",
    fieldMapping: FIELD_MAPPING,
    characters: rows.map(buildCharacter),
  };

  fs.writeFileSync(opts.outPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Wrote ${opts.outPath}`);
  console.log(`Characters: ${data.characters.length}`);
}

main();
