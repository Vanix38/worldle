/**
 * Export / import des indices One Piece en CSV, pour les relire sans ouvrir
 * tout sources/one-piece.json.
 *
 *   node scripts/one-piece-hints-csv.mjs export [fichier.csv]
 *     → id, hint1, hint2, hint3, puis des colonnes de contexte (nom,
 *       affiliation, race, fruit, haki, origine) et « problemes », la liste des
 *       défauts détectés automatiquement.
 *   node scripts/one-piece-hints-csv.mjs import [fichier.csv]
 *     → réécrit hint1/hint2/hint3 de la source à partir du CSV (les autres
 *       colonnes sont ignorées). Relancer ensuite `npm run one-piece:build`.
 *
 * Une valeur qui diffère selon la version s'écrit « manga: X || anime: Y ».
 * Séparateur « ; » (Excel FR), encodage UTF-8 avec BOM.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "sources", "one-piece.json");
const DEFAULT_CSV = path.join(ROOT, "scripts", "one-piece-hints.csv");
const HINTS = ["hint1", "hint2", "hint3"];
const SEP = ";";

const isSplit = (v) => v !== null && typeof v === "object" && !Array.isArray(v) &&
  Object.keys(v).length > 0 && Object.keys(v).every((k) => k === "$manga" || k === "$anime");
const flat = (v) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));
const show = (v) => (isSplit(v)
  ? Object.entries(v).map(([k, x]) => `${k.slice(1)}: ${flat(x)}`).join(" || ")
  : flat(v));
const parse = (s) => {
  if (!/^(manga|anime): /.test(s)) return s;
  return Object.fromEntries(s.split(" || ").map((p) => {
    const [, k, x] = p.match(/^(manga|anime): ([\s\S]*)$/);
    return [`$${k}`, x];
  }));
};
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const JAPANESE = /[぀-ヿ一-鿿]/;
const ENGLISH = /\b(Family|Pirates|Crew|Marines|Government|Bandits|Army|Kingdom|Navy|Officer|Commander|Tribe|Guard|of the)\b/;

/** Défauts détectés sur les indices d'un perso. */
export function problems(c) {
  const out = [];
  const values = (v) => (isSplit(v) ? Object.values(v) : [v]).map(flat);
  const first = (v) => values(v)[0];
  const nameParts = norm(c.name).split(/[\s.]+/).filter((p) => p.length > 3);
  for (const k of HINTS) {
    for (const h of values(c[k])) {
      if (!h.trim()) out.push(`${k} vide`);
      if (JAPANESE.test(h)) out.push(`${k} en japonais`);
      if (ENGLISH.test(h) && !/Pirates (Kuja|du Soleil)/.test(h)) out.push(`${k} en anglais ?`);
      if (norm(h) === norm(c.name)) out.push(`${k} = nom`);
      else if (k === "hint2" && norm(h) === norm(flat(c.race))) continue;
      else if (nameParts.some((p) => norm(h).split(/[\s'-]+/).includes(p))) out.push(`${k} contient le nom`);
    }
  }
  if (norm(first(c.hint1)) === norm(first(c.affiliation))) out.push("hint1 = affiliation (pas un rang/rôle)");
  if (norm(first(c.hint3)) === norm(first(c.affiliation))) out.push("hint3 = affiliation (pas haki/origine)");
  return [...new Set(out)];
}

const csvCell = (s) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === SEP) { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const [cmd, file = DEFAULT_CSV] = process.argv.slice(2);
const src = JSON.parse(fs.readFileSync(SOURCE, "utf8"));

if (cmd === "export") {
  const header = ["id", ...HINTS, "nom", "versions", "affiliation", "race", "fruit", "haki", "origine", "problemes"];
  const lines = [header.join(SEP)];
  for (const c of src.characters) {
    lines.push([
      c.id, ...HINTS.map((k) => show(c[k])), c.name, c.versions.join(", "),
      show(c.affiliation), show(c.race), show(c.devilFruit), show(c.haki), show(c.origin),
      problems(c).join(" | "),
    ].map(csvCell).join(SEP));
  }
  fs.writeFileSync(file, "﻿" + lines.join("\n") + "\n");
  const n = src.characters.filter((c) => problems(c).length).length;
  console.log(`${src.characters.length} persos exportés dans ${path.relative(ROOT, file)} (${n} avec au moins un problème).`);
} else if (cmd === "import") {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const byId = new Map(src.characters.map((c) => [c.id, c]));
  let changed = 0;
  for (const r of rows) {
    if (!r[col.id]) continue;
    const c = byId.get(r[col.id]);
    if (!c) { console.warn(`id inconnu : ${r[col.id]}`); continue; }
    for (const k of HINTS) {
      const v = parse(r[col[k]].trim());
      if (JSON.stringify(v) !== JSON.stringify(c[k])) { c[k] = v; changed++; }
    }
  }
  fs.writeFileSync(SOURCE, JSON.stringify(src, null, 2) + "\n");
  console.log(`${changed} indices modifiés dans sources/one-piece.json. Lancer npm run one-piece:build.`);
} else {
  console.error("Usage : node scripts/one-piece-hints-csv.mjs export|import [fichier.csv]");
  process.exit(1);
}
