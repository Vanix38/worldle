/**
 * Scrape hunterxhunter.fandom.com/fr — Catégorie:Personnages → data/hunterxhunter.json
 * Extrait tous les champs d’infobox ({{Infobox char}} / {{Infobox_char}}).
 *
 * Usage:
 *   node scripts/scrape-hunterxhunter-fandom.mjs [--limit N] [--delay MS] [--resume] [--dry-run]
 *   node scripts/scrape-hunterxhunter-fandom.mjs --recalc-prevalence [--out path]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ALIAS_SOURCE_KEYS, buildAliasesFromCharacter } from "./build-hxh-aliases.mjs";
import { mergeFirstAppearance } from "./hxh-first-appearance.mjs";
import {
  cleanIndiceWikiText,
  cleanWikiFieldValue,
  normalizeFirstAppearance,
  normalizeGenderDisplay,
  normalizeHxhStatus,
  normalizeNenType,
} from "./hxh-normalize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "data", "hunterxhunter.json");
const API = "https://hunterxhunter.fandom.com/fr/api.php";
const CATEGORY = "Catégorie:Personnages";
const INFOBOX_MARKERS = ["{{Infobox char", "{{Infobox_char"];

/** Champs bruts wiki non copiés sur les personnages (galerie / image). */
const SKIP_FIELD_KEYS = new Set(["image", "galerie"]);

/** Exclus du calcul de prévalence (métadonnées jeu). */
const RESERVED_CHARACTER_KEYS = new Set(["id", "name"]);

const WIKI_KEY_TO_JSON = {
  genre: "gender",
  statut: "status",
  age: "age",
  "anc affiliation": "ancAffiliation",
  "anc occupation": "ancOccupation",
  "anime debut": "animeDebut",
  "manga debut": "mangaDebut",
  "aussi connu sous le nom": "aussiConnuSousLeNom",
  capacites: "capacites",
  capacités: "capacites",
  "capacites2": "capacites2",
  "capacités2": "capacites2",
  "voix jap": "voixJap",
  "voix fr": "voixFr",
  voix_jap: "voixJap",
  voix_fr: "voixFr",
  "numero pendant l'exam": "numeroPendantLexam",
  "numero pendant l’exam": "numeroPendantLexam",
  numero: "numero",
  type2: "type2",
  connu: "connu",
  surnom: "surnom",
};

/** Libellé affiché pour fieldMapping (clé canonique wiki). */
const WIKI_KEY_LABEL = {
  age: "Âge",
  statut: "Statut",
  genre: "Genre",
  "manga debut": "Manga début",
  "anime debut": "Anime début",
  capacites: "Capacités",
  capacités: "Capacités",
};

function normalizeWikiKey(wikiKey) {
  return wikiKey
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/_/g, " ");
}

function parseArgv(argv) {
  const out = {
    limit: Infinity,
    delay: 350,
    outPath: DEFAULT_OUT,
    resume: false,
    dryRun: false,
    recalcPrevalence: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--recalc-prevalence") out.recalcPrevalence = true;
    else if (a === "--resume") out.resume = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
    else if (a === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, {
    headers: { "User-Agent": "worldle-hxh-scraper/1.0 (educational)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

function stripGalleryFromInfoboxInner(inner) {
  return inner.replace(/<gallery>[\s\S]*?<\/gallery>/gi, "\n");
}

function extractInfoboxInner(wikitext) {
  let best = null;
  for (const marker of INFOBOX_MARKERS) {
    const pos = wikitext.indexOf(marker);
    if (pos === -1) continue;
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
    inner = stripGalleryFromInfoboxInner(inner);
    if (!best || inner.length > best.length) best = inner;
  }
  return best;
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
    let key = inner.slice(i, eq).trim();
    if (!key || key.includes("\n") || key.includes("<") || key.includes(">")) {
      i++;
      continue;
    }
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

function stripRefs(s) {
  return s
    .replace(/<ref\s+[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\s*\/>/gi, "")
    .replace(/<ref[^>]*>/gi, "");
}

function cleanWikiText(s) {
  if (!s) return "";
  let t = stripRefs(s);
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  for (let n = 0; n < 40; n++) {
    const m = t.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (!m) break;
    let disp = (m[2] ?? m[1]).trim();
    if (disp.startsWith("link=")) disp = disp.slice(5).trim();
    disp = disp.replace(/''+/g, "").trim();
    t = t.replace(m[0], disp);
  }
  let prev;
  do {
    prev = t;
    t = t.replace(/\{\{[^{}]+\}\}/g, "");
  } while (t !== prev);
  t = t.replace(/\n+/g, " / ").replace(/\s+/g, " ").trim();
  return t;
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
    if (/wikipedia:/i.test(raw)) continue;
    if (/^\d+px$/i.test(disp)) continue;
    const t = disp.replace(/''+/g, "").trim();
    if (t) texts.push(t);
  }
  return texts;
}

function wikiKeyToJsonKey(wikiKey) {
  const norm = normalizeWikiKey(wikiKey);
  if (WIKI_KEY_TO_JSON[norm]) return WIKI_KEY_TO_JSON[norm];
  const ascii = norm
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['']/g, "'");
  const parts = ascii.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "field";
  return parts
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join("");
}

function wikiKeyToHeader(canonicalWikiKey) {
  if (WIKI_KEY_LABEL[canonicalWikiKey]) return WIKI_KEY_LABEL[canonicalWikiKey];
  const h = canonicalWikiKey.trim();
  if (!h) return h;
  return h.charAt(0).toUpperCase() + h.slice(1);
}

function canonicalizeParams(params) {
  const out = {};
  for (const [rawKey, rawVal] of Object.entries(params)) {
    const ck = normalizeWikiKey(rawKey);
    if (!ck) continue;
    const prev = out[ck];
    if (!prev || String(rawVal).length > String(prev).length) out[ck] = rawVal;
  }
  return out;
}

function fieldValueFromRaw(raw) {
  if (!raw || !String(raw).trim()) return "";
  const links = extractLinkTexts(raw);
  if (links.length > 1) return [...new Set(links)].join(", ");
  if (links.length === 1) return links[0];
  return cleanWikiText(raw);
}

function splitVersionedSegments(raw) {
  let s = String(raw);
  s = s.replace(/\)\s*(?=[A-ZÀ-ÖØ-öø-ÿ])/g, ") / ");
  s = s.replace(/\)\s*(?=(?:Episode|Épisode|episode|épisode))/gi, ") / ");
  s = s.replace(/(1999|1998)\s*(?=[A-ZÀ-ÖØ-öø-ÿ(])/gi, "$1 / ");
  return s
    .split(/\s*\/\s*|\s*,\s*|\s*;\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function clean2011AttributeSegment(p) {
  return p
    .replace(/\([^)]*1999[^)]*\)/gi, "")
    .replace(/\([^)]*1998[^)]*\)/gi, "")
    .replace(/\([^)]*2011[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Garde uniquement les mentions 2011 (ou sans année si pas de 2011 sur la fiche). */
function normalizeAnimeDebut2011(raw) {
  if (!raw || !String(raw).trim()) return "";
  const parts = splitVersionedSegments(raw);
  const y2011 = parts.filter((p) => /2011/i.test(p));
  if (y2011.length > 0) return y2011.join(" / ");
  const no1999 = parts.filter((p) => !/1999|1998/i.test(p));
  return no1999.join(" / ") || "";
}

/** Cheveux, yeux, etc. : segments 2011 uniquement, sans libellés d’année. */
function normalizeVersionedAttribute2011(raw) {
  if (!raw || !String(raw).trim()) return "";
  const parts = splitVersionedSegments(raw);
  const y2011 = parts.filter((p) => /2011/i.test(p));
  if (y2011.length > 0) {
    return y2011.map(clean2011AttributeSegment).filter(Boolean).join(" / ");
  }
  const no1999 = parts.filter((p) => !/1999|1998/i.test(p));
  return no1999.map(clean2011AttributeSegment).filter(Boolean).join(" / ") || "";
}

function titleToId(title) {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function displayNameFromParams(params, pageTitle) {
  const nom = fieldValueFromRaw(params.nom || "");
  if (nom) return nom;
  return pageTitle.replace(/_/g, " ");
}

function buildCharacter(pageTitle, params) {
  const canon = canonicalizeParams(params);
  const name = displayNameFromParams(canon, pageTitle);
  const char = { id: titleToId(pageTitle), name };
  const aliasSources = {};
  let mangaDebut = "";
  let animeDebut = "";
  for (const [wikiKey, raw] of Object.entries(canon)) {
    const jsonKey = wikiKeyToJsonKey(wikiKey);
    if (
      jsonKey === "nom" ||
      jsonKey === "kanji" ||
      jsonKey === "voixJap" ||
      jsonKey === "voixFr" ||
      jsonKey === "sang" ||
      jsonKey === "kana" ||
      jsonKey === "pelage" ||
      jsonKey === "naissance" ||
      jsonKey === "lieu" ||
      jsonKey === "poids" ||
      jsonKey === "numero" ||
      jsonKey === "taille" ||
      jsonKey === "age"
    )
      continue;
    if (SKIP_FIELD_KEYS.has(jsonKey)) continue;
    let val = fieldValueFromRaw(raw);
    if (!val) continue;
    if (jsonKey === "animeDebut") {
      val = normalizeAnimeDebut2011(val);
      if (val) animeDebut = val;
      continue;
    }
    if (jsonKey === "mangaDebut") {
      if (val) mangaDebut = val;
      continue;
    }
    if (jsonKey === "cheveux" || jsonKey === "yeux") val = normalizeVersionedAttribute2011(val);
    if (!val) continue;
    if (ALIAS_SOURCE_KEYS.includes(jsonKey)) {
      aliasSources[jsonKey] = val;
      continue;
    }
    char[jsonKey] = val;
  }
  if (char.ancOccupation) {
    const parts = [];
    const seen = new Set();
    for (const raw of [char.occupation, char.ancOccupation]) {
      for (const tok of String(raw || "")
        .split(/\s*,\s*|\s*\/\s*|\s*;\s*/)
        .map((s) => {
          const pipe = s.indexOf("|");
          return (pipe !== -1 ? s.slice(0, pipe) : s).trim();
        })
        .filter(Boolean)) {
        const key = tok.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        parts.push(tok);
      }
    }
    if (parts.length > 0) char.occupation = parts.join(", ");
    delete char.ancOccupation;
  }
  if (char.cheveux) {
    char.indice1 = char.cheveux;
    delete char.cheveux;
  }
  if (char.capacites) {
    char.indice2 = char.capacites;
    delete char.capacites;
  }
  if (char.relations) {
    char.indice3 = char.relations;
    delete char.relations;
  }
  if (char.ancAffiliation) {
    const parts = [];
    const seen = new Set();
    for (const raw of [char.affiliation, char.ancAffiliation]) {
      for (const tok of String(raw || "")
        .split(/\s*,\s*|\s*\/\s*/)
        .map((s) => s.trim())
        .filter(Boolean)) {
        const key = tok.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        parts.push(tok);
      }
    }
    if (parts.length > 0) char.affiliation = parts.join(", ");
    delete char.ancAffiliation;
  }
  const firstAppearance = mergeFirstAppearance(mangaDebut, animeDebut);
  if (firstAppearance) char.firstAppearance = normalizeFirstAppearance(firstAppearance);
  if (char.gender) char.gender = normalizeGenderDisplay(char.gender);
  if (char.status) char.status = normalizeHxhStatus(char.status);
  if (char.type) {
    const nen = normalizeNenType(char.type);
    if (nen) char.type = nen;
    else delete char.type;
  }
  if (char.occupation) char.occupation = cleanWikiFieldValue(char.occupation);
  if (char.indice2) {
    const cap = cleanIndiceWikiText(char.indice2);
    if (cap) char.indice2 = cap;
    else delete char.indice2;
  }
  const aliases = buildAliasesFromCharacter({ ...char, ...aliasSources });
  if (aliases.length > 0) char.aliases = aliases;
  return char;
}

function inferFonction(jsonKey, characters) {
  let multi = 0;
  let total = 0;
  for (const c of characters) {
    const v = c[jsonKey];
    if (v == null || v === "") continue;
    total++;
    if (typeof v === "string" && v.includes(",")) multi++;
  }
  if (total > 0 && multi / total >= 0.35) return "Multivalue";
  return "Classique";
}

function buildFieldMapping(wikiKeysSorted, characters) {
  const mapping = {};
  for (const wikiKey of wikiKeysSorted) {
    const jsonKey = wikiKeyToJsonKey(wikiKey);
    if (SKIP_FIELD_KEYS.has(jsonKey)) continue;
    mapping[jsonKey] = {
      header: wikiKeyToHeader(wikiKey),
      fonction: inferFonction(jsonKey, characters),
      description: `Champ infobox wiki « ${wikiKey} » (hunterxhunter.fandom.com).`,
    };
  }
  return mapping;
}

function hasFieldValue(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Union des clés présentes sur les fiches + clés du fieldMapping. */
function collectAllFieldKeys(characters, fieldMapping = {}) {
  const keys = new Set(Object.keys(fieldMapping));
  for (const c of characters) {
    for (const k of Object.keys(c)) {
      if (!RESERVED_CHARACTER_KEYS.has(k)) keys.add(k);
    }
  }
  return [...keys].sort((a, b) => a.localeCompare(b, "fr"));
}

function presenceRates(characters, keys) {
  const n = characters.length || 1;
  const rates = {};
  for (const key of keys) {
    let count = 0;
    for (const c of characters) {
      if (hasFieldValue(c[key])) count++;
    }
    rates[key] = count / n;
  }
  return rates;
}

function buildFieldPrevalence(characters, fieldMapping = {}) {
  const keys = collectAllFieldKeys(characters, fieldMapping);
  return Object.fromEntries(
    Object.entries(presenceRates(characters, keys)).sort((a, b) => b[1] - a[1]),
  );
}

function printFieldPrevalence(fieldPrevalence, characterCount) {
  const n = characterCount || 1;
  console.log(`\nfieldPrevalence (${n} personnages)\n`);
  for (const [key, rate] of Object.entries(fieldPrevalence)) {
    const count = Math.round(rate * n);
    const pct = `${(rate * 100).toFixed(1)}%`.padStart(7);
    console.log(`${key.padEnd(26)} ${pct}  (${count}/${n})`);
  }
}

function recalcPrevalence(opts) {
  const raw = fs.readFileSync(opts.outPath, "utf8");
  const data = JSON.parse(raw);
  const characters = Array.isArray(data.characters) ? data.characters : [];
  if (characters.length === 0) {
    console.error("Aucun personnage dans", opts.outPath);
    process.exit(1);
  }
  const fieldPrevalence = buildFieldPrevalence(characters, data.fieldMapping || {});
  data.fieldPrevalence = fieldPrevalence;
  fs.writeFileSync(opts.outPath, JSON.stringify(data, null, 2), "utf8");
  console.log("Wrote fieldPrevalence →", opts.outPath);
  printFieldPrevalence(fieldPrevalence, characters.length);
}

async function fetchCategoryTitles(limit, delay) {
  const titles = [];
  let cmcontinue;
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
    format: "json",
    redirects: "1",
  });
  if (data.error) {
    return { wikitext: "", resolvedTitle: title, error: data.error.info || "parse error" };
  }
  const wt = data.parse?.wikitext?.["*"] || "";
  return { wikitext: wt, resolvedTitle: data.parse?.title || title, error: null };
}

function loadExisting(outPath) {
  try {
    const raw = fs.readFileSync(outPath, "utf8");
    const data = JSON.parse(raw);
    const chars = Array.isArray(data.characters) ? data.characters : [];
    return { characters: chars, ids: new Set(chars.map((c) => c.id)) };
  } catch {
    return { characters: [], ids: new Set() };
  }
}

async function scrape(opts) {
  const titles = await fetchCategoryTitles(opts.limit, opts.delay);
  console.log("Category titles:", titles.length);

  let characters = [];
  const ids = new Set();
  const wikiKeysUnion = new Set();

  if (opts.resume && fs.existsSync(opts.outPath)) {
    const ex = loadExisting(opts.outPath);
    characters = ex.characters;
    ex.ids.forEach((id) => ids.add(id));
    console.log("Resume: loaded", characters.length, "existing");
  }

  let ok = 0;
  let skipped = 0;
  let fail = 0;

  for (let idx = 0; idx < titles.length; idx++) {
    const title = titles[idx];
    const id = titleToId(title);
    if (ids.has(id)) {
      skipped++;
      continue;
    }
    try {
      const { wikitext, resolvedTitle, error } = await fetchWikitext(title);
      await sleep(opts.delay);
      if (error) {
        fail++;
        console.warn("[skip]", title, error);
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      if (!inner) {
        fail++;
        console.warn("[no infobox]", title);
        continue;
      }
      const params = canonicalizeParams(parseInfoboxParams(inner));
      Object.keys(params).forEach((k) => wikiKeysUnion.add(k));
      const char = buildCharacter(resolvedTitle, params);
      if (ids.has(char.id)) {
        skipped++;
        continue;
      }
      characters.push(char);
      ids.add(char.id);
      ok++;
      if ((idx + 1) % 50 === 0) console.log("Progress", idx + 1, "/", titles.length, "ok", ok);
    } catch (e) {
      fail++;
      console.warn("[err]", title, e.message);
      await sleep(opts.delay * 2);
    }
  }

  characters.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const wikiKeysSorted = [...wikiKeysUnion].sort((a, b) => a.localeCompare(b, "fr"));
  const fieldMapping = buildFieldMapping(wikiKeysSorted, characters);
  const jsonKeys = Object.keys(fieldMapping);
  const fieldPrevalence = buildFieldPrevalence(characters, fieldMapping);

  const universe = {
    id: "hunterxhunter",
    name: "Hunter × Hunter",
    fieldMapping,
    fieldPrevalence,
    wikiInfoboxKeys: wikiKeysSorted,
    characters,
  };

  if (opts.dryRun) {
    console.log("Dry run:", characters.length, "chars, fields:", jsonKeys.length, "fail", fail);
    return;
  }

  fs.writeFileSync(opts.outPath, JSON.stringify(universe, null, 2), "utf8");
  console.log("Wrote", opts.outPath);
  console.log("Characters:", characters.length, "| Fields:", jsonKeys.length, "| ok", ok, "skip", skipped, "fail", fail);
}

const opts = parseArgv(process.argv);
if (opts.recalcPrevalence) {
  try {
    recalcPrevalence(opts);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
} else {
  scrape(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
