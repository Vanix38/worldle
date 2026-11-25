/**
 * Uniformise les affiliations One Piece en français (manga + anime) et
 * recalcule fieldPrevalence.
 * Usage: node scripts/normalize-one-piece-affiliations.mjs
 *
 * Modifie les fichiers générés : lancer ensuite `npm run one-piece:merge`
 * pour reporter le changement dans sources/one-piece.json.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const MAP = {
  "Alabasta": "Royaume d'Alabasta",
  "Arabasta Kingdom": "Royaume d'Alabasta",
  "Allié de Équipage du Chapeau de Paille": "Grande Flotte du Chapeau de Paille",
  "Ancien Équipage de Roger": "Équipage de Roger",
  "Arlong Pirates": "Équipage d'Arlong",
  "Beasts Pirates": "Équipage aux Cent Bêtes",
  "Bell-mère's mikan": "Village de Cocoyasi",
  "Cocoyasi Village": "Village de Cocoyasi",
  "Bellamy Pirates": "Équipage de Bellamy",
  "Big Mom Pirates": "Équipage de Big Mom",
  "Black Cat Pirates": "Équipage du Chat Noir",
  "Blackbeard Pirates": "Équipage de Barbe Noire",
  "Charlotte Family": "Famille Charlotte",
  "Charlotte Family ‡": "Famille Charlotte",
  "Criminal brand": "Marque Criminal",
  "Don Quichotte Family": "Famille Don Quichotte",
  "Donquixote Pirates": "Famille Don Quichotte",
  "Drum Island": "Royaume de Drum",
  "Fake Straw Hat Crew": "Faux Équipage du Chapeau de Paille",
  "Franky Family": "Famille Franky",
  "Giant Warrior Pirates": "Équipage des Géants",
  "Pirates Guerriers Géants": "Équipage des Géants",
  "Higuma Bandits": "Bandits de Higuma",
  "Hyougoro Family": "Famille Hyougoro",
  "Kouzuki Family": "Famille Kozuki",
  "Kouzuki Hiyori": "Famille Kozuki",
  "Kuja": "Pirates Kuja",
  "Kujas": "Pirates Kuja",
  "Pirates Kujas": "Pirates Kuja",
  "Équipage des Pirates Kuja": "Pirates Kuja",
  "Loguetown Arms Shop": "Armurerie de Logue Town",
  "Lvneel Kingdom": "Royaume de Lvneel",
  "L’Équipage de Wapol": "Équipage de Wapol",
  "Marines": "Marine",
  "Marines (153rd Branch)": "Marine",
  "Marines (G-14)": "Marine",
  "Marines (Headquarters": "Marine",
  "Marines (SSG)": "Marine",
  "Marines G-1 Branch": "Marine",
  "Marine ; L’Escadre des Harpons Noirs": "Marine",
  "Mogaro Kingdom": "Royaume de Mogaro",
  "Mokomo Dukedom": "Principauté de Mokomo",
  "New Fish-Man Pirates": "Nouvel Équipage des Hommes-Poissons",
  "Ohara": "Archéologues d'Ohara",
  "Ohara Archaeologists": "Archéologues d'Ohara",
  "Prodence Kingdom": "Royaume de Prodence",
  "Red Hair Pirates": "Équipage du Roux",
  "Revolutionary Army (South Army)": "Armée Révolutionnaire",
  "Revolutionary Army (West Army)": "Armée Révolutionnaire",
  "Riku Family": "Famille Riku",
  "Rocks Pirates": "Équipage de Rocks",
  "Rolling Pirates": "Équipage du Rolling",
  "Équipage du Rolling Association des Victimes de Thriller Bark": "Équipage du Rolling",
  "Ryugu Kingdom": "Royaume Ryugu",
  "Famille de Neptune": "Famille royale Ryugu",
  "Famille royale de l'île des hommes-poissons": "Famille royale Ryugu",
  "Famille royale du royaume Ryugu": "Famille royale Ryugu",
  "Saruyama Alliance": "Ligue des Primates",
  "Saruyama Alliance (Shoujou Pirates)": "Ligue des Primates",
  "Shandias": "Shandia",
  "Shimotsuki Family": "Famille Shimotsuki",
  "Straw Hat Pirates": "Équipage du Chapeau de Paille",
  "Super Spot-Billed Duck Troops": "Super Canards",
  "Thriller Bark Pirates": "Équipage de Gecko Moria",
  "Underworld": "Pègre",
  "Usopp Pirates (disbanded)": "Équipage d'Usopp",
  "Vinsmoke Family": "Famille Vinsmoke",
  "Whitebeard Pirates": "Équipage de Barbe Blanche",
  "World Government": "Gouvernement Mondial",
  "World Government (Donquixote Family)": "Gouvernement Mondial",
  "World Government (Rosward Family)": "Gouvernement Mondial",
  "Krieg Pirates": "Équipage de Don Krieg",
  "Johnny": "Chasseurs de Primes",
};

const has = (v) =>
  v == null ? false : typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : true;

for (const name of ["one-piece-manga", "one-piece-anime"]) {
  const file = path.join(ROOT, "data", `${name}.json`);
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  let n = 0;
  for (const c of d.characters) {
    const to = MAP[c.affiliation];
    if (to && to !== c.affiliation) { c.affiliation = to; n++; }
  }
  const keys = new Set([...Object.keys(d.fieldMapping), ...d.characters.flatMap((c) => Object.keys(c).filter((k) => !k.startsWith("_")))]);
  ["id", "name", "aliases"].forEach((k) => keys.delete(k));
  const r = {};
  for (const k of keys) r[k] = d.characters.filter((c) => has(c[k])).length / d.characters.length;
  d.fieldPrevalence = Object.fromEntries(Object.entries(r).sort((a, b) => b[1] - a[1]));
  fs.writeFileSync(file, JSON.stringify(d, null, 2) + "\n");
  console.log(`[${name}] ${n} affiliation(s) modifiée(s)`);
}
