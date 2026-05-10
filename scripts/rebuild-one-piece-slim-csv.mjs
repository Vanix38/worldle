/**
 * Lit le CSV infobox large → écrit one-piece-wiki-fixed.csv au schéma réduit :
 * fusion des colonnes de noms / alias FR dans fr_wiki_aliases,
 * virgules sur champs liste (affiliation, lieux, occupation),
 * âge FR = le plus récent (post-ellipse, etc.).
 *
 * Usage: node scripts/rebuild-one-piece-slim-csv.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "one-piece-wiki-fixed.csv");
/** Copie de l’export infobox large (ex. `git show HEAD:data/one-piece-wiki-fixed.csv`) pour rejouer le slim. */
const WIDE_BACKUP = path.join(ROOT, "data", "one-piece-wiki-wide.csv");

const SLIM_HEADERS = [
  "id",
  "local_name",
  "en_wiki_mainaffiliation",
  "en_wiki_subaffiliations",
  "en_wiki_age",
  "en_wiki_aliases",
  "en_wiki_bounty",
  "en_wiki_dfname",
  "en_wiki_dftype",
  "en_wiki_first",
  "en_wiki_height",
  "en_wiki_occupation_actuelle",
  "en_wiki_autres_occupations",
  "en_wiki_origin",
  "en_wiki_status",
  "fr_wiki_affiliation",
  "fr_wiki_âge",
  "fr_wiki_aliases",
  "fr_wiki_dfnom",
  "fr_wiki_dftype",
  "fr_wiki_lieuvie",
  "fr_wiki_occupation",
  "fr_wiki_origine",
  "fr_wiki_première",
  "fr_wiki_prime",
  "fr_wiki_statut",
  "fr_wiki_taille",
];

/** Colonnes FR fusionnées dans fr_wiki_aliases (ordre conservé, dédoublonnage insensible à la casse). */
const FR_NAME_MERGE_KEYS = [
  "fr_wiki_alias",
  "fr_wiki_ancien_nomf",
  "fr_wiki_épithète",
  "fr_wiki_nom",
  "fr_wiki_Nom",
  "fr_wiki_nom_réel",
  "fr_wiki_nomf",
  "fr_wiki_Nomf",
  "fr_wiki_nomj",
  "fr_wiki_Nomj",
  "fr_wiki_nomr",
  "fr_wiki_Nomr",
  "fr_wiki_titre",
];

/** Colonnes larges retirées après fusion (hors celles déjà absentes du slim). */
const DROP_AFTER_MERGE = new Set([
  ...FR_NAME_MERGE_KEYS,
  "fr_wiki_page_title",
  "fr_wiki_image_url",
  "fr_wiki_match_status",
  "fr_wiki_match_via",
  "fr_wiki_A",
  "fr_wiki_acteur",
  "fr_wiki_capitaine",
  "fr_wiki_Chapitres",
  "fr_wiki_cp9clé",
  "fr_wiki_Date",
  "fr_wiki_df2nom",
  "fr_wiki_df2nomf",
  "fr_wiki_df2signifiant",
  "fr_wiki_df2type",
  "fr_wiki_dfnomf",
  "fr_wiki_doriki",
  "fr_wiki_Ending",
  "fr_wiki_Format",
  "fr_wiki_groupe_sanguin",
  "fr_wiki_naissance",
  "fr_wiki_navire",
  "fr_wiki_numgladiateur",
  "fr_wiki_numzombie",
  "fr_wiki_Opening",
  "fr_wiki_P",
  "fr_wiki_particularités",
  "fr_wiki_Piece",
  "fr_wiki_poids",
  "fr_wiki_premiere",
  "fr_wiki_Saison",
  "fr_wiki_SaisonKHV",
  "fr_wiki_signe_astrologique",
  "fr_wiki_signifiant",
  "fr_wiki_Tomes",
  "fr_wiki_vf",
  "fr_wiki_vo",
]);

function parseLine(line) {
  const o = [];
  let c = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const x = line[i];
    if (q) {
      if (x === '"' && line[i + 1] === '"') {
        c += '"';
        i++;
      } else if (x === '"') q = false;
      else c += x;
    } else {
      if (x === '"') q = true;
      else if (x === ";") {
        o.push(c);
        c = "";
      } else c += x;
    }
  }
  o.push(c);
  return o;
}

function csvEscapeField(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[,;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function mergeFrAliases(row) {
  const seen = new Set();
  const parts = [];
  for (const k of FR_NAME_MERGE_KEYS) {
    const v = String(row[k] ?? "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(v);
  }
  return parts.join(", ");
}

function mergeDfNom(row) {
  const vals = [
    row.fr_wiki_dfnom,
    row.fr_wiki_dfnomf,
    row.fr_wiki_df2nom,
    row.fr_wiki_df2nomf,
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const v of vals) {
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.join(", ");
}

function mergeDfType(row) {
  const vals = [row.fr_wiki_dftype, row.fr_wiki_df2type]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const v of vals) {
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.join(", ");
}

function pickPremiere(row) {
  const a = String(row.fr_wiki_première ?? "").trim();
  const b = String(row.fr_wiki_premiere ?? "").trim();
  return a || b;
}

/** Liste FR collée → virgules (infobox). */
function normalizeListLikeField(raw) {
  const s0 = String(raw ?? "").trim();
  if (!s0) return "";
  let t = s0.replace(/\s+/g, " ").trim();

  t = t.replace(/(CP-AIGIS\d)(?=CP\d)/gi, "$1, ");
  t = t.replace(/(CP-AIGIS0)(?=Commandant du)/gi, "$1, ");
  t = t.replace(/(CP\d)(?=CP\d)/gi, "$1, ");
  t = t.replace(/(CP\d)\s+(?=CP\d)/gi, "$1, ");
  t = t.replace(/(CP\d)\s+(?=Gouvernement)/gi, "$1, ");
  t = t.replace(/(?<![A-Za-zÀ-ÿ])\d(?=CP\d)/gi, "$&, ");
  t = t.replace(/\)(?=\s*CP\d)/gi, "), ");
  t = t.replace(/\)(?=\s*CP-AIGIS)/gi, "), ");
  t = t.replace(/\)(?=\s*Gouvernement)/gi, "), ");
  t = t.replace(/\)(?=\s*[A-ZÀ-Ÿ])(?!\s*,)/g, "), ");
  t = t.replace(/(Cipher Pol)\s*(Assassin|Membre)/gi, "$1, $2");
  t = t.replace(/(\(anciennement\))\s*(Secrétaire)/gi, "$1, $2");
  t = t.replace(/(Assassin)\s*(Tenancier|Charpentier|Secrétaire)/gi, "$1, $2");
  t = t.replace(/(\(anciennement\))\s*(Commandant du)/gi, "$1, $2");
  t = t.replace(/(CP-AIGIS0)\s+(?=CP9)/gi, "$1, ");

  // Équipages collés (wiki FR)
  t = t.replace(/(Paille)(?=L'Équipage)/gi, "$1, ");
  t = t.replace(/(même)(?=L'Équipage)/gi, "$1, ");
  t = t.replace(/(Barbe Noire)(?=L'Équipage)/gi, "$1, ");
  t = t.replace(/(Don Quichotte)(?=L'Équipage)/gi, "$1, ");
  t = t.replace(/(Chapeau de Paille)(?=La Grande)/gi, "$1, ");
  t = t.replace(/(Chapeau de Paille)(?=Grande Flotte)/gi, "$1, ");
  t = t.replace(/(Paille)(?=Quatre Empereurs)/gi, "$1, ");
  t = t.replace(/(Empereurs)(?=Alliance)/gi, "$1, ");
  t = t.replace(/(Samouraïs)(?=Famille)/gi, "$1, ");

  // Occupations / titres répétés
  t = t.replace(/(Commandant du [^,]+?)\s+(?=Commandant du)/gi, "$1, ");

  // Lieux collés courants
  t = t.replace(/(Guanhao)\s+(?=Water Seven)/gi, "$1, ");
  t = t.replace(/(Triangle de Florian)\s+(?=Île)/gi, "$1, ");
  t = t.replace(/(Musicien)(?=Escrimeur)/gi, "$1, ");
  t = t.replace(/(Escrimeur)(?=Pirate)/gi, "$1, ");
  t = t.replace(/(Pirate)(?=Capitaine)/gi, "$1, ");

  t = t.replace(/,\s*,+/g, ", ");
  t = t.replace(/\s+,/g, ",");
  t = t.replace(/,\s*/g, ", ");
  t = t.replace(/\s{2,}/g, " ");

  return t
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

/** Âge FR : garder le plus récent (après ellipse, etc.). */
function normalizeFrWikiAge(raw) {
  let t = String(raw ?? "").trim();
  if (!t) return "";
  t = t.replace(/\s+/g, " ");
  t = t.replace(/(\d+)\s*ans(?=\d)/gi, "$1 ans ");
  const hasApres =
    /(?:après|apres)\s*(?:l[''\u2019´']|\s+)?[ée]?llipse/i.test(t);
  t = t.replace(/\d+\s*ans\s*\(\s*au\s+d[ée]but\s*\)/gi, "");
  t = t.replace(/\d+\s*ans\s*\(\s*avant[^)]*\)/gi, "");
  t = t.replace(/\d+\s*\(\s*avant[^)]*\)/gi, "");
  if (hasApres && /[àa]\s*sa\s+mort/i.test(t)) {
    t = t.replace(/\d+\s*ans\s*\(\s*[àa]\s+sa\s+mort\s*\)/gi, "");
  }
  t = t.replace(/(\d+)\s*ans\s*\(\s*[àa]\s+sa\s+mort\s*\)/gi, "$1 ans");
  t = t.replace(/\s*[,;]\s*/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(
    /^(?:\d+\s*ans\s*)+(?=\d+\s*ans\s*\([^)]*(?:après|apres)[^)]*\))/gi,
    "",
  );
  t = t.replace(
    /(\d+)\s*ans\s*\(\s*(?:après|apres)\s*(?:l[''\u2019´']|\s+)?[ée]?llipse\s*\)/gi,
    "$1 ans",
  );
  t = t.replace(
    /(\d+)\s*\(\s*(?:après|apres)\s*(?:l[''\u2019´']|\s+)?[ée]?llipse\s*\)/gi,
    "$1 ans",
  );
  t = t.replace(/\d+\s*ans\s*auparavant/gi, "").trim();
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function rowObject(headers, cells) {
  const row = {};
  headers.forEach((h, i) => {
    row[h] = cells[i] ?? "";
  });
  return row;
}

const srcPath = fs.existsSync(WIDE_BACKUP) ? WIDE_BACKUP : OUT;
const text = fs.readFileSync(srcPath, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const wideHeaders = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

const looksWide =
  wideHeaders.includes("fr_wiki_page_title") || wideHeaders.includes("fr_wiki_nomj");
if (!looksWide) {
  console.error(
    "Source infobox large introuvable. Créer data/one-piece-wiki-wide.csv (export large) ou restaurer le CSV large.",
  );
  process.exit(1);
}

const missingWide = FR_NAME_MERGE_KEYS.filter((k) => !wideHeaders.includes(k));
if (missingWide.length) {
  console.warn("Colonnes nom FR absentes (ignorées):", missingWide.join(", "));
}

const outLines = [SLIM_HEADERS.map((h) => csvEscapeField(h)).join(";")];

for (let L = 1; L < lines.length; L++) {
  const cells = parseLine(lines[L]);
  while (cells.length < wideHeaders.length) cells.push("");
  const wide = rowObject(wideHeaders, cells);

  const slim = {};
  for (const h of SLIM_HEADERS) {
    slim[h] = wide[h] ?? "";
  }
  slim.fr_wiki_aliases = mergeFrAliases(wide);
  slim.fr_wiki_dfnom = mergeDfNom(wide);
  slim.fr_wiki_dftype = mergeDfType(wide);
  slim.fr_wiki_première = pickPremiere(wide);
  slim.fr_wiki_âge = normalizeFrWikiAge(wide.fr_wiki_âge ?? "");
  slim.fr_wiki_affiliation = normalizeListLikeField(wide.fr_wiki_affiliation ?? "");
  slim.fr_wiki_lieuvie = normalizeListLikeField(wide.fr_wiki_lieuvie ?? "");
  slim.fr_wiki_occupation = normalizeListLikeField(wide.fr_wiki_occupation ?? "");

  outLines.push(SLIM_HEADERS.map((h) => csvEscapeField(slim[h] ?? "")).join(";"));
}

fs.writeFileSync(OUT, outLines.join("\n") + "\n", "utf8");
console.log("Source:", srcPath, "| sortie:", OUT);
console.log(
  "CSV slim écrit:",
  OUT,
  "| lignes:",
  lines.length - 1,
  "| colonnes:",
  SLIM_HEADERS.length,
);
console.log("Colonnes fusionnées dans fr_wiki_aliases:", FR_NAME_MERGE_KEYS.join(", "));
console.log("Colonnes larges abandonnées:", DROP_AFTER_MERGE.size, "(non réécrites)");
