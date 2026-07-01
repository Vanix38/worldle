/**
 * Nettoie les Jolly Roger : supprime persos + non utilisés, renomme vers slug affiliation JSON.
 * Usage: node scripts/cleanup-jolly-rogers.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "public", "universes", "one-piece-anime", "specific-symbols");
const JSON_PATH = path.join(ROOT, "data", "one-piece-anime.json");

function slugify(text) {
  return text
    .replace(/^l['']/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Fichier wiki → slug affiliation JSON */
const RENAME = {
  "armada-de-don-krieg": "equipage-de-don-krieg",
  "equipage-des-pirates-de-caribou": "equipage-de-caribou",
  "equipage-des-pirates-de-roger": "equipage-de-roger",
  "equipage-de-don-quichotte-doflamingo": "don-quichotte-family",
  "equipage-des-nouveaux-hommes-poissons": "nouvel-equipage-des-hommes-poissons",
  "equipage-du-firetank": "equipage-du-fire-tank",
  "equipage-de-foxy-apres-davy-back-fight": "equipage-de-foxy",
};

/** Drapeaux personnels (pas des affiliations) */
const PERSONAL = new Set([
  "bartholomew-kuma",
  "black-maria",
  "brook-apres-ellipse",
  "brook-avant-ellipse",
  "douglas-bullet",
  "dracule-mihawk",
  "edward-weeble",
  "emporio-ivankov",
  "franky-apres-ellipse",
  "killer",
  "kureha",
  "lip-doughty",
  "merry",
  "nami-apres-ellipse",
  "nami-avant-ellipse",
  "nefertari-vivi",
  "nico-robin-apres-ellipse",
  "perona",
  "queen",
  "sabo",
  "sanji-apres-ellipse",
  "tony-tony-chopper-apres-ellipse",
  "usopp-apres-ellipse",
  "usopp-avant-ellipse",
  "woonan",
  "zoro-roronoa-apres-ellipse",
]);

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const validSlugs = new Set(
  data.characters.flatMap((c) => [c.affiliation, ...(c.sub_affiliation || [])].filter(Boolean).map(slugify)),
);

const files = fs.readdirSync(DIR).filter((f) => /\.(png|svg|webp|jpg)$/i.test(f));
const kept = [];
const deleted = [];
const renamed = [];

for (const file of files) {
  const ext = path.extname(file);
  const stem = file.slice(0, -ext.length);

  if (PERSONAL.has(stem)) {
    fs.unlinkSync(path.join(DIR, file));
    deleted.push(`${stem} (personnel)`);
    continue;
  }

  const targetStem = RENAME[stem] ?? stem;

  if (!validSlugs.has(targetStem)) {
    fs.unlinkSync(path.join(DIR, file));
    deleted.push(`${stem} (absent du JSON)`);
    continue;
  }

  const targetFile = `${targetStem}${ext}`;
  const srcPath = path.join(DIR, file);
  const destPath = path.join(DIR, targetFile);

  if (stem !== targetStem) {
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(srcPath);
      deleted.push(`${stem} (doublon de ${targetStem})`);
    } else {
      fs.renameSync(srcPath, destPath);
      renamed.push(`${stem} → ${targetStem}`);
      kept.push(targetStem);
    }
  } else {
    kept.push(stem);
  }
}

console.log(`Conservés (${kept.length}):`);
kept.sort().forEach((s) => console.log(`  ${s}`));
console.log(`\nRenommés (${renamed.length}):`);
renamed.forEach((r) => console.log(`  ${r}`));
console.log(`\nSupprimés (${deleted.length}):`);
deleted.forEach((d) => console.log(`  ${d}`));
