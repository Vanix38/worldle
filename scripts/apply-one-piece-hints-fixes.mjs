/**
 * Applique scripts/one-piece-hints-fixes.json à sources/one-piece.json :
 * - hint1/hint2/hint3 : valeur donnée, ou "auto" (hint2 → race ; hint3 → haki
 *   s'il y en a, sinon origine) ;
 * - _fruits : complète devilFruit / devilFruitType / hint2 des persos dont le
 *   fruit manquait.
 * Puis lancer `npm run one-piece:build`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "sources", "one-piece.json");
const fixes = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "one-piece-hints-fixes.json"), "utf8"));
const src = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const byId = new Map(src.characters.map((c) => [c.id, c]));

const isSplit = (v) => v !== null && typeof v === "object" && !Array.isArray(v) &&
  Object.keys(v).length > 0 && Object.keys(v).every((k) => k === "$manga" || k === "$anime");
const list = (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));

/** "auto", résolu version par version (race / haki / origine peuvent différer). */
function auto(c, key) {
  const at = (field, ver) => (isSplit(c[field]) ? c[field][ver] : c[field]);
  const per = Object.fromEntries(c.versions.map((v) => `$${v}`).map((ver) => {
    if (key === "hint2") return [ver, list(at("race", ver))];
    const haki = at("haki", ver);
    return [ver, Array.isArray(haki) && haki.length ? haki.join(", ") : list(at("origin", ver))];
  }));
  const vals = Object.values(per);
  return vals.every((x) => x === vals[0]) ? vals[0] : per;
}

const get = (id) => {
  const c = byId.get(id);
  if (!c) throw new Error(`id inconnu : ${id}`);
  return c;
};

for (const [id, fix] of Object.entries(fixes._fruits ?? {})) Object.assign(get(id), fix);
let n = 0;
for (const [id, fix] of Object.entries(fixes)) {
  if (id.startsWith("_")) continue;
  const c = get(id);
  for (const [k, v] of Object.entries(fix)) {
    c[k] = v === "auto" ? auto(c, k) : v;
    n++;
  }
}
fs.writeFileSync(SOURCE, JSON.stringify(src, null, 2) + "\n");
console.log(`${n} indices corrigés, ${Object.keys(fixes._fruits ?? {}).length} fruits complétés.`);
