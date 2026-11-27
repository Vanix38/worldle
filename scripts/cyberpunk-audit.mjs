/**
 * Audit de data/cyberpunk.json.
 *
 *   node scripts/cyberpunk-audit.mjs export [fichier.csv]
 *     → une ligne par perso : id, nom, indices (occupation = indice 5,
 *       hint1 = voix / acteur, indice 10), colonnes de contexte et
 *       « problemes », la liste des défauts détectés automatiquement.
 *       Séparateur « ; » (Excel FR), UTF-8 avec BOM.
 *   node scripts/cyberpunk-audit.mjs check
 *     → résumé des problèmes par type (compte), code de sortie 1 s'il reste
 *       des erreurs bloquantes (id/nom en double, alias = nom d'un autre perso,
 *       valeur hors liste dans une colonne à liste fermée).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data", "cyberpunk.json");
const IMAGES = path.join(ROOT, "public", "universes", "cyberpunk", "characters");
const DEFAULT_CSV = path.join(ROOT, "scripts", "cyberpunk-audit.csv");
const SEP = ";";

const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
const chars = data.characters;
const fm = data.fieldMapping;

const list = (v) => (Array.isArray(v) ? v : String(v ?? "").split(",")).map((s) => String(s).trim()).filter(Boolean);
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Colonnes à liste fermée : toute autre valeur est une erreur. */
const CLOSED = {
  gender: ["Homme", "Femme"],
  type: ["Humain", "IA", "Engramme", "Animal"],
  status: ["Vivant", "Mort", "Inconnu"],
  affiliationType: ["Gang", "Corpo", "Nomades", "Mercenaires", "Forces de l'ordre", "Gouvernement & armée", "Médias & musique"],
  district: ["Watson", "Westbrook", "City Center", "Heywood", "Santo Domingo", "Pacifica", "Dogtown"],
  region: ["Night City", "Badlands", "NUSA", "Japon", "Étranger", "Net", "Orbite"],
  firstAppearance: fm.firstAppearance.order,
  importance: fm.importance.order,
  difficulty: fm.difficulty.order,
};

/** Les 10 rôles de Cyberpunk (jeu de rôle / 2077). Le reste est un métier. */
const ROLES = ["Solo", "Netrunner", "Techie", "Nomad", "Lawman", "Media", "Rockerboy", "Fixer", "Medtech", "Corpo", "Exec"];

/** Valeurs d'occupation qui ne sont pas un métier (lieu, employeur, quête…). */
const BAD_OCCUPATION = ["Jenkins", "V", "Corpo", "President Myers", "Run This Town", "Ghost Town", "Night City",
  "Tom's Diner", "Info Flash", "Jacked and Coke", "Arasaka Academy", "Braindance", "Braindance parlor"];

const ENGLISH = /\b(Vendor|Officer|Mercenary|Soldier|Driver|Owner|Manager|Leader|Musician|Bartender|Boxer|Priest|Specialist|Doctor|Mechanic|Host|Singer|Reporter|Mayor|Pet|Student|Spy)\b/;

/** Métiers collés sans virgule (deux métiers ou plus dans une seule valeur). */
const GLUED = /(Vendor|Officer|Bartender|Mechanic|Owner|Investigator|Inspector|Figure|Leader|leader|Colonel|CEO|President|Musician|Manager|Executive|engineer|Racer|DJ|media|Televangelist|Waiter|vendor|writer|Bouncer|member)\s+[A-Z]/;

const names = new Map(chars.map((c) => [norm(c.name), c.id]));
const personAffiliations = new Set(["D", "V", "David", "Kyoko", "Faraday", "Mr. Hands", "Regina Jones", "Doc Ryder",
  "Herold Lowe", "Dakota Smith", "Wakako Okada", "Talia Yang", "Muamar Reyes", "Mikhail Akulov", "Rogue Amendiares",
  "Dexter DeShawn", "Dino Dinovic", "Maine"]);
/** Affiliation → celle avec laquelle elle fait doublon. */
const DUP_AFFILIATIONS = {
  "U.S. Army": "NUSA Armed Forces",
  USMC: "NUSA Armed Forces",
  "World News Service": "WNS",
  Afterlife: "Afterlife Mercs",
  Nomad: "nom du clan (Aldecaldos…)",
};
const DOUBTFUL_TYPES = { Clouds: "Corpo", BARGHEST: "Gang", "Night City Devils": "Médias & musique", Samurai: "Médias & musique" };

const images = new Set(fs.existsSync(IMAGES) ? fs.readdirSync(IMAGES).map((f) => f.replace(/\.[^.]+$/, "")) : []);

const DIFF_OK = {
  Principal: ["Très facile", "Facile"],
  Secondaire: ["Facile", "Moyen", "Difficile"],
  Figurant: ["Moyen", "Difficile", "Impossible"],
};

/** Défauts détectés sur un perso. Les erreurs bloquantes commencent par « ! ». */
export function problems(c) {
  const out = [];
  for (const [k, allowed] of Object.entries(CLOSED)) {
    for (const v of list(c[k])) if (!allowed.includes(v)) out.push(`! ${k} hors liste : ${v}`);
  }
  if (!c.status) out.push("statut vide (affiché « — », vert entre deux vides)");
  if (!c.role) out.push("rôle vide");
  for (const r of list(c.role)) if (!ROLES.includes(r)) out.push(`rôle hors des 10 rôles : ${r}`);
  if (!c.cyberware) out.push("cyberware vide (affiché « Aucun »)");
  const occ = list(c.occupation);
  if (!occ.length) out.push("indice occupation vide");
  else if (occ.some((o) => ENGLISH.test(o))) out.push("occupation en anglais");
  for (const o of occ) {
    if (BAD_OCCUPATION.includes(o)) out.push(`occupation pas un métier : ${o}`);
    if (GLUED.test(o)) out.push(`occupation collée : ${o}`);
  }
  const nameParts = norm(c.name).split(/[\s.]+/).filter((p) => p.length > 3);
  if (occ.some((o) => nameParts.some((p) => norm(o).split(/[\s'-]+/).includes(p)))) out.push("occupation contient le nom");
  const aff = list(c.affiliation);
  if (!aff.length) out.push("affiliation vide");
  for (const a of aff) if (personAffiliations.has(a)) out.push(`affiliation = une personne/équipe nommée d'après un perso : ${a}`);
  for (const a of aff) if (DUP_AFFILIATIONS[a]) out.push(`affiliation en doublon : ${a} ≈ ${DUP_AFFILIATIONS[a]}`);
  for (const a of aff) if (DOUBTFUL_TYPES[a]) out.push(`type de faction douteux : ${a} → ${DOUBTFUL_TYPES[a]}`);
  if (!c.region) out.push("région vide");
  if (list(c.region).includes("Night City") && !c.district && c.importance !== "Figurant") out.push("quartier vide (perso de Night City)");
  if (!c.hint1) out.push("indice voix vide");
  else {
    if (/\((English|Japanese|Polish|Brazilian Portuguese|Male|Female|feminine|masculine)\)/.test(c.hint1)) out.push("voix : libellés de langue en anglais");
    if (/\(vocalist\)|\(pre-Patch|\(divergent/.test(c.hint1)) out.push("voix : deux noms collés / note en anglais");
  }
  for (const a of c.aliases ?? []) {
    const other = names.get(norm(a));
    if (other && other !== c.id) out.push(`! alias = nom d'un autre perso : ${a} (${other})`);
    if (norm(a) === norm(c.name)) out.push(`alias = nom : ${a}`);
  }
  if (!images.has(c.id)) out.push("pas d'image");
  if (DIFF_OK[c.importance] && !DIFF_OK[c.importance].includes(c.difficulty)) {
    out.push(`difficulté incohérente : ${c.importance} / ${c.difficulty}`);
  }
  return out;
}

function globalProblems() {
  const out = [];
  const seenId = new Set(), seenName = new Set();
  for (const c of chars) {
    if (seenId.has(c.id)) out.push(`! id en double : ${c.id}`);
    if (seenName.has(norm(c.name))) out.push(`! nom en double : ${c.name}`);
    seenId.add(c.id); seenName.add(norm(c.name));
  }
  const aliasOwners = new Map();
  for (const c of chars) for (const a of c.aliases ?? []) {
    const k = norm(a);
    if (aliasOwners.has(k) && aliasOwners.get(k) !== c.id) out.push(`! alias partagé : ${a} (${aliasOwners.get(k)}, ${c.id})`);
    aliasOwners.set(k, c.id);
  }
  return out;
}

const COLUMNS = [
  ["id", (c) => c.id],
  ["nom", (c) => c.name],
  ["occupation (indice 5)", (c) => c.occupation],
  ["voix (indice 10)", (c) => c.hint1],
  ["importance", (c) => c.importance],
  ["difficulte", (c) => c.difficulty],
  ["1re apparition", (c) => c.firstAppearance],
  ["genre", (c) => c.gender],
  ["type", (c) => c.type],
  ["statut", (c) => c.status],
  ["role", (c) => c.role],
  ["cyberware", (c) => c.cyberware],
  ["affiliation", (c) => c.affiliation],
  ["type de faction", (c) => c.affiliationType],
  ["quartier", (c) => c.district],
  ["region", (c) => c.region],
  ["alias", (c) => (c.aliases ?? []).join(" | ")],
  ["problemes", (c) => problems(c).join(" | ")],
];
const cell = (v) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const [cmd = "check", file = DEFAULT_CSV] = process.argv.slice(2);
if (cmd === "export") {
  const lines = [COLUMNS.map(([h]) => h).join(SEP), ...chars.map((c) => COLUMNS.map(([, f]) => cell(f(c))).join(SEP))];
  fs.writeFileSync(file, "﻿" + lines.join("\r\n") + "\r\n");
  console.log(`${chars.length} persos exportés → ${path.relative(process.cwd(), file)}`);
} else if (cmd === "check") {
  const counts = new Map();
  for (const c of chars) for (const p of problems(c)) {
    const key = p.replace(/ : .*$/, "").replace(/ \?.*$/, " ?");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const global = globalProblems();
  console.log(`${chars.length} persos`);
  for (const [k, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${k}`);
  for (const g of global) console.log(g);
  const blocking = [...counts.keys()].filter((k) => k.startsWith("!")).length + global.length;
  process.exit(blocking ? 1 : 0);
} else {
  console.error("usage: node scripts/cyberpunk-audit.mjs export [fichier.csv] | check");
  process.exit(2);
}
