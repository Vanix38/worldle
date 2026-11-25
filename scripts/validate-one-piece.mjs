/**
 * Valide sources/one-piece.json (lancé par `npm run one-piece:build|check`,
 * ou seul : `npm run one-piece:validate`).
 *
 * Erreurs (bloquantes) :
 * - champ obligatoire vide ;
 * - valeur hors vocabulaire (sources/one-piece-vocabulary.json, ou l'ordre
 *   du fieldMapping pour arc, difficulty et firstAppearance) ;
 * - 0 en âge ou en taille (utiliser « ? » si inconnu) ; nombre invalide ;
 * - arc incohérent avec le chapitre / l'épisode de première apparition ;
 * - id ou nom en double, nom d'un perso utilisé comme alias d'un autre.
 * Avertissements : alias partagé par plusieurs persos.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSIONS = ["manga", "anime"];
const REQUIRED = ["name", "race", "gender", "age", "size", "origin", "affiliation", "bounty",
  "firstAppearance", "arc", "difficulty", "hint1", "hint2", "hint3"];
const NUMERIC = ["age", "size", "bounty"];

const isSplit = (v) => v !== null && typeof v === "object" && !Array.isArray(v) &&
  Object.keys(v).length > 0 && Object.keys(v).every((k) => k === "$manga" || k === "$anime");
const valueFor = (v, version) => (isSplit(v) ? v[`$${version}`] : v);
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const empty = (v) => v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

export function validate(src, vocab) {
  const errors = [];
  const warnings = [];
  const err = (id, msg) => errors.push(`${id}: ${msg}`);

  const ids = new Set();
  const names = new Map();
  const aliases = new Map();

  for (const c of src.characters) {
    if (ids.has(c.id)) err(c.id, "id en double");
    ids.add(c.id);
    if (!Array.isArray(c.versions) || !c.versions.length || c.versions.some((v) => !VERSIONS.includes(v)))
      err(c.id, `versions invalide : ${JSON.stringify(c.versions)}`);

    for (const version of c.versions ?? []) {
      const fm = (k) => valueFor(src.fieldMapping[k], version);
      const get = (k) => valueFor(c[k], version);
      const tag = c.versions.length > 1 && VERSIONS.some((v) => isSplit(c[v])) ? ` [${version}]` : "";

      for (const k of REQUIRED) if (empty(get(k))) err(c.id, `${k} vide${tag}`);

      for (const k of NUMERIC) {
        const v = get(k);
        if (empty(v)) continue;
        if (v === "?") continue;
        if (k === "age" && typeof v === "string" && /^~\s*\d+$/.test(v)) continue;
        if (typeof v !== "number" || Number.isNaN(v)) err(c.id, `${k} invalide : ${JSON.stringify(v)}`);
        else if (v < 0) err(c.id, `${k} négatif : ${v}`);
        else if (v === 0 && k !== "bounty") err(c.id, `${k} = 0 (mettre « ? » si inconnu)`);
      }

      for (const [k, allowed] of Object.entries(vocab)) {
        if (k.startsWith("_")) continue;
        for (const v of [].concat(get(k) ?? [])) {
          if (v === "" && k === "devilFruitType") continue;
          if (!allowed.includes(v)) err(c.id, `${k} hors vocabulaire : « ${v} »${tag}`);
        }
      }

      const arcOrder = fm("arc")?.order ?? {};
      const arcs = Object.values(arcOrder).flat();
      if (!empty(get("arc")) && !arcs.includes(get("arc"))) err(c.id, `arc inconnu : « ${get("arc")} »${tag}`);
      const diff = fm("difficulty")?.order ?? [];
      if (!empty(get("difficulty")) && !diff.includes(get("difficulty"))) err(c.id, `difficulty inconnue : « ${get("difficulty")} »`);

      const fa = get("firstAppearance");
      let faArc = null;
      for (const sagaArcs of Object.values(fm("firstAppearance")?.order ?? {}))
        for (const [arc, segs] of Object.entries(sagaArcs)) if (segs.includes(fa)) faArc = arc;
      if (!empty(fa) && !faArc) err(c.id, `firstAppearance inconnue : « ${fa} »${tag}`);
      else if (faArc && arcs.includes(faArc) && get("arc") !== faArc)
        err(c.id, `arc « ${get("arc")} » incohérent avec ${fa} (${faArc})${tag}`);

      const sub = [].concat(get("sub_affiliation") ?? []);
      if (sub.includes(get("affiliation"))) err(c.id, "sub_affiliation répète l'affiliation principale");
    }

    const n = norm(valueFor(c.name, c.versions?.[0]));
    if (names.has(n)) err(c.id, `nom en double avec ${names.get(n)}`);
    names.set(n, c.id);
    const al = new Set(VERSIONS.flatMap((v) => [].concat(valueFor(c.aliases, v) ?? [])).map(norm));
    for (const a of al) {
      if (a === n) continue;
      if (!aliases.has(a)) aliases.set(a, []);
      aliases.get(a).push(c.id);
    }
  }
  for (const [a, owners] of aliases) {
    if (names.has(a) && !owners.includes(names.get(a))) err(owners.join(", "), `alias « ${a} » = nom de ${names.get(a)}`);
    else if (owners.length > 1) warnings.push(`alias « ${a} » partagé : ${owners.join(", ")}`);
  }
  return { errors: [...new Set(errors)], warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "one-piece.json"), "utf8"));
  const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "one-piece-vocabulary.json"), "utf8"));
  const { errors, warnings } = validate(src, vocab);
  for (const w of warnings) console.log(`⚠ ${w}`);
  for (const e of errors) console.error(`✗ ${e}`);
  console.log(`One Piece : ${errors.length} erreur(s), ${warnings.length} avertissement(s).`);
  if (errors.length) process.exit(1);
}
