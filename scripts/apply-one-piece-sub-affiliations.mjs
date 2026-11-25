/**
 * Remplit `sub_affiliation` des persos One Piece (manga + anime) à partir des
 * affiliations de l'infobox du wiki One Piece (Fandom), traduites en français
 * avec le même vocabulaire que `affiliation`. L'affiliation principale est
 * retirée de la liste ; les groupes-titres déjà présents (Supernova, Calamités…)
 * sont conservés.
 *
 * Source : scripts/one-piece-sub-affiliations-wiki.json (infobox Fandom, 2026-11-25).
 * Usage: node scripts/apply-one-piece-sub-affiliations.mjs [wiki-sub.json]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const wiki = JSON.parse(fs.readFileSync(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "one-piece-sub-affiliations-wiki.json"), "utf8"));

/** Alignement sur le vocabulaire du champ affiliation. */
const RENAME = {
  "Baggy's Delivery": "Les Pirates d'Expédition",
  "Royaume de Kamabakka": "Kedétrav",
  "Armée d'Ener": "Clan d'Ener",
  "Cinq Doyens": "Cinq Sages",
};
/** Valeurs existantes conservées (groupes-titres absents de l'infobox du wiki). */
const KEEP = {
  "Supernova": "Supernova", "Génération Terrible": "Génération Terrible",
  "Calamités": "Calamités", "Superstars": "Superstars",
  "Tobiroppo": "Tobiroppo", "Tobi Roppo": "Tobiroppo",
  "Neuf Écarlates": "Neuf Fourreaux Rouges",
  "Quatre Mystérieux": "Quatre Mystérieux", "SSG": "SSG",
  "Nobles Mondiaux": "Nobles Mondiaux", "Cinq Sages": "Cinq Sages",
  "Sept Grands Corsaires": "Sept Grands Corsaires", "Shichibukai": "Sept Grands Corsaires",
  "Quatre Empereurs": "Quatre Empereurs", "Famille Charlotte": "Famille Charlotte",
  "Chevaliers de Dieu": "Chevaliers de Dieu", "Premiers Vingt": "Premiers Vingt",
  "Famille Nerona": "Famille Nerona", "Famille royale d'Erbaf": "Famille royale d'Erbaf",
  "Amazon Lily": "Pirates Kuja", "Battle Convoy": "Battle Convoy", "Garde royale": "Garde royale",
  "Grand Fleet du Chapeau de Paille": "Grande Flotte du Chapeau de Paille",
};
const SUPERNOVAS = ["monkey-d-luffy", "roronoa-zoro", "trafalgar-d-water-law", "eustass-kid", "killer",
  "basil-hawkins", "scratchmen-apoo", "x-drake", "jewelry-bonney", "urouge", "capone-bege"];
const EXTRA = Object.fromEntries(SUPERNOVAS.map((id) => [id, ["Supernova", "Génération Terrible"]]));
for (const id of ["alber", "queen", "jack"]) EXTRA[id] = ["Calamités"];

const has = (v) => v == null ? false : typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : true;

for (const name of ["one-piece-manga", "one-piece-anime"]) {
  const file = path.join(ROOT, "data", `${name}.json`);
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  let n = 0;
  for (const c of d.characters) {
    const old = Array.isArray(c.sub_affiliation) ? c.sub_affiliation : c.sub_affiliation ? [c.sub_affiliation] : [];
    const base = wiki[c.id] ?? null;
    const vals = [
      ...(base ?? []).map((v) => RENAME[v] ?? v),
      ...old.map((v) => KEEP[v] ?? (base ? null : RENAME[v] ?? v)),
      ...(EXTRA[c.id] ?? []),
    ];
    const out = [];
    for (const v of vals) if (v && v !== c.affiliation && !out.includes(v)) out.push(v);
    if (JSON.stringify(out) !== JSON.stringify(old)) { c.sub_affiliation = out; n++; }
  }
  const keys = Object.keys(d.fieldPrevalence);
  const r = {};
  for (const k of keys) r[k] = d.characters.filter((c) => has(c[k])).length / d.characters.length;
  d.fieldPrevalence = Object.fromEntries(Object.entries(r).sort((a, b) => b[1] - a[1] || keys.indexOf(a[0]) - keys.indexOf(b[0])));
  fs.writeFileSync(file, JSON.stringify(d, null, 2) + "\n");
  console.log(`[${name}] ${n} sous-affiliation(s) modifiée(s), remplies: ${d.characters.filter((c) => has(c.sub_affiliation)).length}/${d.characters.length}`);
}
