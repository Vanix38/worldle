/**
 * Ajoute aux alias de sources/one-piece.json les noms anglais et japonais
 * (romaji) relevés sur onepiece.fandom.com (scripts/one-piece-wiki-names.json).
 * Filtre : mentions de doublage (VIZ, 4Kids…), variantes identiques au nom ou
 * à un alias existant (accents/casse ignorés), noms d'autres persos.
 * Modifie directement la source ; lancer ensuite `npm run one-piece:build`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "sources", "one-piece.json");
const src = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const wiki = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "one-piece-wiki-names.json"), "utf8"));

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const isSplit = (v) => v && typeof v === "object" && !Array.isArray(v);
const DUB = /\b(viz|4kids|funimation|crunchyroll|odex|netflix|dub)\b/i;

// Octo = Hatchan (même personnage) ; « Wolf » avait été rattaché à Sanjuan Wolf.
const octo = src.characters.findIndex((c) => c.id === "octo");
if (octo >= 0) src.characters.splice(octo, 1);
const wolf = src.characters.find((c) => c.id === "wolf-elbaph");
if (wolf) wolf.sub_affiliation = [];

const otherNames = new Map(src.characters.map((c) => [c.id, norm(isSplit(c.name) ? Object.values(c.name)[0] : c.name)]));
let added = 0;
for (const c of src.characters) {
  const cands = [...(wiki[c.id] ?? []), ...(c.id === "hatchan" ? ["Octo"] : [])];
  const sides = isSplit(c.aliases) ? Object.values(c.aliases) : [(c.aliases ??= [])];
  for (const raw of cands) {
    let a = String(raw).split("(")[0].replace(/\s+/g, " ").trim();
    if (!a || a.includes(")") || DUB.test(a) || a.length < 2) continue;
    const n = norm(a);
    if (!n || n === otherNames.get(c.id)) continue;
    if ([...otherNames].some(([id, nm]) => id !== c.id && nm === n)) continue;
    for (const list of sides) {
      if (list.some((x) => norm(x) === n)) continue;
      list.push(a);
      added++;
    }
  }
}
fs.writeFileSync(SOURCE, JSON.stringify(src, null, 2) + "\n");
console.log(`${added} alias ajoutés.`);
