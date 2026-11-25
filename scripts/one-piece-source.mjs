/**
 * Source unique One Piece : sources/one-piece.json → data/one-piece-manga.json
 * et data/one-piece-anime.json (les deux fichiers lus par le jeu).
 *
 * Format de la source :
 * - Une seule liste de personnages. `versions` liste les modes où le perso
 *   apparaît (["manga", "anime"] ou ["manga"]).
 * - Une valeur qui diffère selon la version s'écrit
 *   { "$manga": …, "$anime": … } (clé absente = champ absent dans ce mode).
 *   C'est le cas de firstAppearance (Chapitre N / Épisode N), de quelques arcs,
 *   alias et indices, et de fieldMapping.firstAppearance.
 * - fieldPrevalence n'est pas stockée : elle est recalculée à la génération.
 *
 * Usage :
 *   node scripts/one-piece-source.mjs build   # valide la source puis génère data/*.json
 *   node scripts/one-piece-source.mjs check   # échoue si data/*.json n'est pas à jour
 *   node scripts/one-piece-source.mjs merge   # data/*.json → source (après un script
 *                                             # qui a modifié les fichiers générés)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validate } from "./validate-one-piece.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "sources", "one-piece.json");
const VERSIONS = ["manga", "anime"];
const dataFile = (v) => path.join(ROOT, "data", `one-piece-${v}.json`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isSplit = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) &&
  Object.keys(v).length > 0 && Object.keys(v).every((k) => k === "$manga" || k === "$anime");
const has = (v) =>
  v == null ? false : typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : true;
const serialize = (d) => JSON.stringify(d, null, 2) + "\n";

/** Fusionne deux objets (même ordre de clés) en marquant les valeurs qui diffèrent. */
function mergeObjects(objs, keys) {
  const out = {};
  for (const k of keys) {
    const vals = VERSIONS.map((v) => objs[v]?.[k]);
    const present = VERSIONS.filter((v) => objs[v] && k in objs[v]);
    if (present.length === VERSIONS.filter((v) => objs[v]).length && present.every((v) => same(objs[v][k], vals[0]))) {
      out[k] = vals[0];
    } else {
      out[k] = Object.fromEntries(present.map((v) => [`$${v}`, objs[v][k]]));
    }
  }
  return out;
}

function pick(obj, version) {
  const out = {};
  for (const [k, val] of Object.entries(obj)) {
    if (isSplit(val)) {
      if (`$${version}` in val) out[k] = val[`$${version}`];
    } else out[k] = val;
  }
  return out;
}

function mergeKeys(lists) {
  const keys = [];
  for (const list of lists) {
    list.forEach((k, i) => {
      if (keys.includes(k)) return;
      const prev = list.slice(0, i).reverse().find((p) => keys.includes(p));
      keys.splice(prev ? keys.indexOf(prev) + 1 : 0, 0, k);
    });
  }
  return keys;
}

function merge() {
  const files = Object.fromEntries(VERSIONS.map((v) => [v, JSON.parse(fs.readFileSync(dataFile(v), "utf8"))]));
  const topKeys = mergeKeys(VERSIONS.map((v) => Object.keys(files[v]).filter((k) => k !== "fieldPrevalence")));
  const src = {};
  for (const k of topKeys) {
    if (k === "characters") {
      const byId = Object.fromEntries(VERSIONS.map((v) => [v, new Map(files[v].characters.map((c) => [c.id, c]))]));
      const ids = mergeKeys(VERSIONS.map((v) => files[v].characters.map((c) => c.id)));
      src.characters = ids.map((id) => {
        const objs = Object.fromEntries(VERSIONS.map((v) => [v, byId[v].get(id)]));
        const versions = VERSIONS.filter((v) => objs[v]);
        return { versions, ...mergeObjects(objs, mergeKeys(versions.map((v) => Object.keys(objs[v])))) };
      });
    } else if (k === "fieldMapping") {
      src.fieldMapping = mergeObjects(
        Object.fromEntries(VERSIONS.map((v) => [v, files[v].fieldMapping])),
        mergeKeys(VERSIONS.map((v) => Object.keys(files[v].fieldMapping))),
      );
    } else {
      src[k] = mergeObjects(files, [k])[k];
    }
  }
  fs.mkdirSync(path.dirname(SOURCE), { recursive: true });
  fs.writeFileSync(SOURCE, serialize(src));
  console.log(`Source écrite : ${path.relative(ROOT, SOURCE)} (${src.characters.length} persos)`);
}

function generate(version) {
  const src = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  const out = {};
  for (const [k, val] of Object.entries(src)) {
    if (k === "characters") {
      out.characters = val
        .filter((c) => c.versions.includes(version))
        .map(({ versions, ...c }) => pick(c, version));
    } else if (k === "fieldMapping") {
      out.fieldMapping = pick(val, version);
    } else {
      const p = pick({ [k]: val }, version);
      if (k in p) out[k] = p[k];
    }
  }
  const fieldOrder = Object.keys(out.fieldMapping);
  const keys = new Set([...fieldOrder, ...out.characters.flatMap((c) => Object.keys(c).filter((k) => !k.startsWith("_")))]);
  ["id", "name", "aliases"].forEach((k) => keys.delete(k));
  const rank = (k) => (fieldOrder.includes(k) ? fieldOrder.indexOf(k) : fieldOrder.length);
  out.fieldPrevalence = Object.fromEntries(
    [...keys]
      .map((k) => [k, out.characters.filter((c) => has(c[k])).length / out.characters.length])
      .sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0])),
  );
  return serialize(out);
}

const cmd = process.argv[2];
const run = cmd === "merge" ? (merge(), "build") : cmd;
if (run === "build" || run === "check") {
  const { errors, warnings } = validate(
    JSON.parse(fs.readFileSync(SOURCE, "utf8")),
    JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "one-piece-vocabulary.json"), "utf8")),
  );
  for (const e of errors) console.error(`✗ ${e}`);
  if (warnings.length) console.log(`One Piece : ${warnings.length} avertissement(s) (npm run one-piece:validate pour le détail).`);
  if (errors.length) {
    console.error(`One Piece : ${errors.length} erreur(s) de validation dans sources/one-piece.json.`);
    process.exit(1);
  }
  let stale = [];
  for (const v of VERSIONS) {
    const text = generate(v);
    const current = fs.existsSync(dataFile(v)) ? fs.readFileSync(dataFile(v), "utf8") : "";
    if (text === current) continue;
    if (run === "build") { fs.writeFileSync(dataFile(v), text); console.log(`Généré : data/one-piece-${v}.json`); }
    else stale.push(`data/one-piece-${v}.json`);
  }
  if (stale.length) {
    console.error(
      `${stale.join(", ")} ne correspond pas à sources/one-piece.json.\n` +
      "Modifie la source puis lance `npm run one-piece:build`, ou, si un script a modifié les fichiers générés, `npm run one-piece:merge`.",
    );
    process.exit(1);
  }
  if (run === "check") console.log("One Piece : fichiers générés à jour.");
} else {
  console.error("Usage: node scripts/one-piece-source.mjs build|check|merge");
  process.exit(1);
}
