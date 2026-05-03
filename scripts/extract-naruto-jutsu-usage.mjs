/**
 * Parcourt le wiki (infobox |Jutsu =) pour chaque personnage présent dans data/naruto.json,
 * extrait les liens [[...]] (noms de techniques) et agrège le nombre d’utilisateurs par jutsu.
 *
 * Usage:
 *   node scripts/extract-naruto-jutsu-usage.mjs
 *   node scripts/extract-naruto-jutsu-usage.mjs --out data/naruto-jutsu-usage.json --delay 350
 *   node scripts/extract-naruto-jutsu-usage.mjs --with-ids
 *   node scripts/extract-naruto-jutsu-usage.mjs --patch-naruto
 *   node scripts/extract-naruto-jutsu-usage.mjs --patch-naruto data/naruto.json --min-jutsu-users 5
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_DATA = path.join(ROOT, "data", "naruto.json");
const DEFAULT_OUT = path.join(ROOT, "data", "naruto-jutsu-usage.json");
const API = "https://naruto.fandom.com/fr/api.php";
const CATEGORY = "Catégorie:Personnages";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": "worldle-naruto-jutsu-usage/1.0 (educational)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

function extractInfoboxInner(wikitext) {
  const marker = "{{Infobox/Personnage";
  const pos = wikitext.indexOf(marker);
  if (pos === -1) return null;
  let i = pos + 2;
  let depth = 1;
  const len = wikitext.length;
  while (i < len && depth > 0) {
    const two = wikitext.slice(i, i + 2);
    if (two === "{{") {
      depth++;
      i += 2;
    } else if (two === "}}") {
      depth--;
      i += 2;
    } else i++;
  }
  const full = wikitext.slice(pos, i);
  let inner = full.slice(marker.length).trim();
  if (inner.endsWith("}}")) inner = inner.slice(0, -2).trim();
  return inner;
}

function parseInfoboxParams(inner) {
  const params = {};
  let i = 0;
  const len = inner.length;
  while (i < len) {
    while (i < len && /\s/.test(inner[i])) i++;
    if (i >= len) break;
    if (inner[i] !== "|") {
      i++;
      continue;
    }
    i++;
    const eq = inner.indexOf("=", i);
    if (eq === -1) break;
    const key = inner.slice(i, eq).trim();
    i = eq + 1;
    let depth = 0;
    const valStart = i;
    while (i < len) {
      const two = inner.slice(i, i + 2);
      if (two === "{{") {
        depth++;
        i += 2;
        continue;
      }
      if (two === "}}") {
        depth--;
        i += 2;
        continue;
      }
      if (depth === 0 && inner[i] === "\n") {
        let j = i + 1;
        while (j < len && /\s/.test(inner[j])) j++;
        if (inner[j] === "|") break;
      }
      i++;
    }
    params[key] = inner.slice(valStart, i).trim();
  }
  return params;
}

function extractLinkTexts(s) {
  if (!s) return [];
  const texts = [];
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let m;
  while ((m = re.exec(s))) {
    const raw = m[1].trim();
    let disp = (m[2] ?? m[1]).trim();
    if (disp.startsWith("link=")) disp = disp.slice(5).trim();
    if (/^Fichier:/i.test(raw) || /^File:/i.test(raw)) continue;
    if (/\.(svg|png|jpg|jpeg|gif|webp)$/i.test(disp)) continue;
    if (/symbole\.svg/i.test(raw)) continue;
    if (/wikipedia:/i.test(raw)) continue;
    if (/^\d+px$/i.test(disp)) continue;
    texts.push(disp.replace(/''+/g, "").trim());
  }
  return [...new Set(texts.filter(Boolean))];
}

function titleToId(title) {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function stripPartieLabels(s) {
  if (!s || typeof s !== "string") return s;
  let t = s.replace(/\u00a0/g, " ");
  t = t.replace(/\bPartie\s+I\s*(?::|&nbsp;\s*:)\s*/gi, "");
  t = t.replace(/\bPartie\s+II\s*(?::|&nbsp;\s*:)\s*/gi, "");
  t = t.replace(/\s*\(\s*Partie\s+I\s*\)\s*/gi, " ");
  t = t.replace(/\s*\(\s*Partie\s+II\s*\)\s*/gi, " ");
  const pipe = t.indexOf("|");
  if (pipe !== -1) t = t.slice(0, pipe);
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

async function fetchCategoryTitles(limit, delay) {
  const titles = [];
  let cmcontinue = undefined;
  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: CATEGORY,
      cmlimit: "500",
      cmnamespace: "0",
      format: "json",
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const data = await fetchJson(params);
    const batch = data.query?.categorymembers || [];
    for (const m of batch) {
      if (m.ns === 0 && m.title) titles.push(m.title);
      if (titles.length >= limit) return titles.slice(0, limit);
    }
    cmcontinue = data.continue?.cmcontinue;
    await sleep(delay);
  } while (cmcontinue);
  return titles.slice(0, limit);
}

async function fetchWikitext(title) {
  const data = await fetchJson({
    action: "parse",
    page: title,
    prop: "wikitext",
    redirects: "1",
    format: "json",
  });
  if (data.error) return { error: data.error.info || JSON.stringify(data.error), wikitext: "" };
  return { wikitext: data.parse?.wikitext?.["*"] || "" };
}

function parseArgs(argv) {
  let outPath = DEFAULT_OUT;
  let dataPath = DEFAULT_DATA;
  let delay = 350;
  let limit = Infinity;
  let withIds = false;
  /** @type {string | null} */
  let patchNarutoPath = null;
  let minJutsuUsers = 5;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") outPath = path.resolve(ROOT, argv[++i] || "");
    else if (argv[i] === "--data") dataPath = path.resolve(ROOT, argv[++i] || "");
    else if (argv[i] === "--delay") delay = Math.max(0, parseInt(argv[++i], 10) || 350);
    else if (argv[i] === "--limit") limit = Math.max(1, parseInt(argv[++i], 10) || Infinity);
    else if (argv[i] === "--with-ids") withIds = true;
    else if (argv[i] === "--patch-naruto") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        patchNarutoPath = path.resolve(ROOT, next);
        i++;
      } else {
        patchNarutoPath = DEFAULT_DATA;
      }
    } else if (argv[i] === "--min-jutsu-users") {
      minJutsuUsers = Math.max(1, parseInt(argv[++i], 10) || 5);
    }
  }
  return { outPath, dataPath, delay, limit, withIds, patchNarutoPath, minJutsuUsers };
}

/**
 * Indice 1 : par défaut uniquement les jutsu « courants » (≥ minPopular utilisateurs dans le jeu).
 * Si le perso n’en a aucun sur sa fiche, retomber sur tous les jutsu liés (y compris rares).
 * @param {Map<string, Set<string>>} jutsuUsers
 * @param {number} minPopular
 * @returns {{ labels: Map<string, string>, usedFallback: number }}
 */
function indice1LabelsFromJutsu(jutsuUsers, minPopular) {
  /** @type {Map<string, string[]>} */
  const allById = new Map();
  for (const [jutsuName, idSet] of jutsuUsers) {
    for (const id of idSet) {
      if (!allById.has(id)) allById.set(id, []);
      allById.get(id).push(jutsuName);
    }
  }
  for (const arr of allById.values()) {
    arr.sort((a, b) => a.localeCompare(b, "fr"));
  }

  /** @type {Map<string, string>} */
  const labels = new Map();
  let usedFallback = 0;
  for (const [id, allNames] of allById) {
    const popular = allNames.filter((n) => (jutsuUsers.get(n)?.size ?? 0) >= minPopular);
    const chosen = popular.length > 0 ? popular : allNames;
    if (popular.length === 0 && allNames.length > 0) usedFallback++;
    labels.set(id, chosen.length ? chosen.join(", ") : "—");
  }
  return { labels, usedFallback };
}

const opts = parseArgs(process.argv);
const data = JSON.parse(fs.readFileSync(opts.dataPath, "utf8"));
const knownIds = new Set(data.characters.map((c) => c.id));

const allTitles = await fetchCategoryTitles(Infinity, opts.delay);
const titlesToFetch = [];
for (const t of allTitles) {
  if (knownIds.has(titleToId(t))) titlesToFetch.push(t);
}
titlesToFetch.sort((a, b) => a.localeCompare(b, "fr"));
const toProcess = titlesToFetch.slice(0, opts.limit);

/** @type {Map<string, Set<string>>} */
const jutsuUsers = new Map();

let wikiPagesOk = 0;
let noInfobox = 0;
let noJutsuField = 0;
let fetchErrors = 0;
const missingInWiki = [];

for (const title of toProcess) {
  const charId = titleToId(title);
  try {
    const { wikitext, error } = await fetchWikitext(title);
    await sleep(opts.delay);
    if (error || !wikitext) {
      fetchErrors++;
      continue;
    }
    const inner = extractInfoboxInner(wikitext);
    if (!inner) {
      noInfobox++;
      continue;
    }
    wikiPagesOk++;
    const params = parseInfoboxParams(inner);
    const raw = params["Jutsu"] || "";
    if (!String(raw).trim()) {
      noJutsuField++;
      continue;
    }
    const links = extractLinkTexts(raw).map((x) => stripPartieLabels(x)).filter(Boolean);
    for (const name of links) {
      if (!jutsuUsers.has(name)) jutsuUsers.set(name, new Set());
      jutsuUsers.get(name).add(charId);
    }
  } catch (e) {
    fetchErrors++;
    console.warn("[err]", title, e.message);
  }
}

for (const id of knownIds) {
  if (!titlesToFetch.some((t) => titleToId(t) === id)) missingInWiki.push(id);
}

const jutsuList = [...jutsuUsers.entries()]
  .map(([name, ids]) => {
    const entry = {
      name,
      userCount: ids.size,
    };
    if (opts.withIds) entry.characterIds = [...ids].sort((a, b) => a.localeCompare(b));
    return entry;
  })
  .sort((a, b) => b.userCount - a.userCount || a.name.localeCompare(b.name, "fr"));

const out = {
  meta: {
    generatedAt: new Date().toISOString(),
    dataFile: path.relative(ROOT, opts.dataPath).replace(/\\/g, "/"),
    category: CATEGORY,
    characterCountInJson: knownIds.size,
    wikiTitlesMatched: titlesToFetch.length,
    wikiTitlesProcessed: toProcess.length,
    wikiPagesWithInfobox: wikiPagesOk,
    pagesNoInfobox: noInfobox,
    pagesNoJutsuField: noJutsuField,
    fetchErrors,
    uniqueJutsu: jutsuList.length,
    idsInJsonButNotInCategory: missingInWiki.length,
  },
  ...(missingInWiki.length > 0 ? { idsInJsonButNotInCategory: missingInWiki.sort() } : {}),
  jutsu: jutsuList,
};

fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
fs.writeFileSync(opts.outPath, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(
  "Wrote",
  opts.outPath,
  "| jutsu:",
  jutsuList.length,
  "| persos traités:",
  toProcess.length,
  "| sans champ Jutsu:",
  noJutsuField,
);

if (opts.patchNarutoPath) {
  const { labels, usedFallback } = indice1LabelsFromJutsu(jutsuUsers, opts.minJutsuUsers);
  const narutoPath = opts.patchNarutoPath;
  const naruto = JSON.parse(fs.readFileSync(narutoPath, "utf8"));
  if (!Array.isArray(naruto.characters)) {
    console.error("[patch-naruto] JSON invalide : characters[] manquant");
    process.exit(1);
  }
  let withList = 0;
  for (const c of naruto.characters) {
    const v = labels.get(c.id);
    c.indice1 = v !== undefined ? v : "—";
    if (c.indice1 !== "—") withList++;
  }
  fs.writeFileSync(narutoPath, JSON.stringify(naruto, null, 2) + "\n", "utf8");
  console.log(
    "Patched indice1 →",
    narutoPath,
    "| persos avec texte:",
    withList,
    "| fallback jutsu rares (aucun courant):",
    usedFallback,
  );
}
