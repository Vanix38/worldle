/**
 * Scrape cyberpunk.fandom.com — personnages Cyberpunk 2077 + Edgerunners
 * → data/cyberpunk.json
 *
 * Filtre : ignore les fiches sans appears_* et celles seulement "(mentioned)"
 * dans 2077 / Edgerunners (garde les apparitions réelles jeu ou anime).
 *
 * Analyse des champs (Infobox Character) sur V, Johnny Silverhand,
 * David Martinez, Lucyna Kushinada, Judy Álvarez, Panam Palmer, Jackie Welles :
 *   title, aka, status, gender, home, residence, affiliation,
 *   occupation, role, voiced_by, appears_games / appears_other, …
 *
 * Usage:
 *   node scripts/scrape-cyberpunk-fandom.mjs --discover
 *   node scripts/scrape-cyberpunk-fandom.mjs [--limit N] [--delay MS] [--resume] [--dry-run]
 *   node scripts/scrape-cyberpunk-fandom.mjs --out data/cyberpunk.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "data", "cyberpunk.json");
const DISCOVER_OUT = path.join(__dirname, "discovered-cyberpunk-fields.json");
const API = "https://cyberpunk.fandom.com/api.php";

/** Catégories sources (jeu + anime). */
const CATEGORIES = [
  "Category:Cyberpunk 2077 Characters",
  "Category:Cyberpunk Edgerunners characters",
];

const DISCOVER_PAGES = [
  "V (character)",
  "Johnny Silverhand",
  "David Martinez",
  "Lucyna Kushinada",
  "Judy Álvarez",
  "Panam Palmer",
  "Jackie Welles",
  "Rebecca",
];

const INFOBOX_MARKER = "{{Infobox Character";

/** Toujours garder ces clés sur les persos / fieldMapping. */
const ALWAYS_FIELD_KEYS = new Set(["aliases", "hint1", "firstAppearance"]);

const FIELD_MAPPING = {
  gender: {
    header: "Genre",
    fonction: "Multivalue",
    columnWidth: "small",
    description:
      "Homme et/ou Femme (Male/Female wiki normalisés). Orange si au moins une valeur est commune. « Homme, Femme » pour les personnages au genre Dependent (ex. V).",
  },
  status: {
    header: "Statut",
    fonction: "Classique",
    columnWidth: "small",
    description: "Vivant, Mort, ou Engramme quand l’infobox le permet.",
  },
  role: {
    header: "Rôle",
    fonction: "Multivalue",
    description:
      "Rôle(s) Cyberpunk (Solo, Netrunner, Rockerboy, Techie…). Orange si au moins un rôle est commun.",
  },
  occupation: {
    header: "Occupation",
    fonction: "Indice",
    hint: { prompt: "Occupation", icon: "FaBriefcase", unlockAfter: 5 },
    description: "Occupation(s) listées dans l’infobox (indice débloqué après 5 tentatives).",
  },
  affiliation: {
    header: "Affiliation",
    fonction: "Multivalue",
    description:
      "Affiliation(s) (gangs, corps, crews…). Orange si au moins une entrée est commune avec la cible.",
  },
  home: {
    header: "Lieu",
    fonction: "Multivalue",
    description: "Quartier / ville de rattachement (champ Home de l’infobox).",
  },
  firstAppearance: {
    header: "1ʳᵉ apparition",
    fonction: "Comparaison",
    columnWidth: "medium",
    order: [
      "Edgerunners Saison 1",
      "Jeu vidéo",
      "Phantom Liberty",
      "Edgerunners Saison 2",
    ],
    description:
      "Chronologie : Edgerunners Saison 1 → Jeu vidéo → Phantom Liberty → Edgerunners Saison 2. Une seule valeur : la première. Sert aussi au filtre « déjà vu ».",
  },
  aliases: {
    header: "Alias",
    fonction: "Recherche",
    description: "Surnoms et autres noms (recherche uniquement).",
  },
  hint1: {
    header: "Indice 1",
    fonction: "Indice",
    hint: { prompt: "Voix / acteur", icon: "FaMicrophoneLines", unlockAfter: 10 },
    description: "Doubleur / acteur (voiced_by).",
  },
};

function parseArgs(argv) {
  const out = {
    discover: false,
    limit: Infinity,
    delay: 300,
    outPath: DEFAULT_OUT,
    resume: false,
    dryRun: false,
    minRate: 0.08,
    noPrune: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--discover") out.discover = true;
    else if (a === "--resume") out.resume = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-prune") out.noPrune = true;
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 300);
    else if (a === "--min-rate") out.minRate = Math.max(0, parseFloat(argv[++i]) || 0.08);
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
    headers: { "User-Agent": "worldle-cyberpunk-scraper/1.0 (educational; fan quiz)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

async function listCategoryPages(categoryTitle) {
  const titles = [];
  let cont = null;
  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: categoryTitle,
      cmtype: "page",
      cmlimit: "500",
      format: "json",
    };
    if (cont) params.cmcontinue = cont;
    const data = await fetchJson(params);
    for (const m of data?.query?.categorymembers || []) {
      if (m.title) titles.push(m.title);
    }
    cont = data?.continue?.cmcontinue || null;
  } while (cont);
  return titles;
}

async function fetchWikitext(title) {
  const data = await fetchJson({
    action: "parse",
    page: title,
    prop: "wikitext",
    format: "json",
  });
  return data?.parse?.wikitext?.["*"] || "";
}

function extractInfoboxInner(wikitext) {
  const pos = wikitext.indexOf(INFOBOX_MARKER);
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
  let inner = full.slice(INFOBOX_MARKER.length).trim();
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

function stripRefs(s) {
  return s
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\b[^>]*\/>/gi, "")
    .replace(/<ref\b[^>]*>/gi, "");
}

function expandCpTemplates(s) {
  if (!s) return "";
  return s
    .replace(/\{\{\s*CP\s*\|\s*2077PL\s*\}\}/gi, "Phantom Liberty")
    .replace(/\{\{\s*CP\s*\|\s*2077\s*\}\}/gi, "Cyberpunk 2077")
    .replace(/\{\{\s*CP\s*\|\s*EDGEII?\s*\}\}/gi, "Edgerunners")
    .replace(/\{\{\s*CP\s*\|\s*EDGE\s*\}\}/gi, "Edgerunners")
    .replace(/\{\{\s*CP\s*\|\s*CEMK\s*\}\}/gi, "Edgerunners manga")
    .replace(/\{\{\s*CP\s*\|\s*RED\s*\}\}/gi, "Cyberpunk RED")
    .replace(/\{\{\s*CP\s*\|\s*2020\s*\}\}/gi, "Cyberpunk 2020")
    .replace(/\{\{\s*CP\s*\|\s*2013\s*\}\}/gi, "Cyberpunk 2013")
    .replace(/\{\{\s*CP\s*\|\s*[^}]+\}\}/gi, "");
}

function cleanWikiText(s) {
  if (!s) return "";
  let t = expandCpTemplates(stripRefs(s));
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/?gallery[^>]*>/gi, "\n");
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
  t = t.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/\([^)]*dependent[^)]*\)/gi, "").trim();
  t = t.replace(/\bformerly\b/gi, "").replace(/\bdefunct\b/gi, "");
  t = t.replace(/\s+,/g, ",").replace(/,\s*,+/g, ",").replace(/^,\s*|,?\s*$/g, "");
  t = t.replace(/\s+/g, " ").trim();
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
    if (/^(File|Image|Category):/i.test(raw)) continue;
    if (/\.(svg|png|jpg|jpeg|gif|webp)$/i.test(disp)) continue;
    texts.push(disp.replace(/''+/g, "").trim());
  }
  return [...new Set(texts.filter(Boolean))];
}

function splitMulti(raw) {
  if (!raw) return [];
  const links = extractLinkTexts(raw);
  if (links.length > 0) {
    return links
      .map((x) => cleanWikiText(x))
      .filter(Boolean)
      .filter((x) => !/^see\b/i.test(x) && !/^#/.test(x));
  }
  const cleaned = cleanWikiText(raw);
  if (!cleaned) return [];
  return cleaned
    .split(/\s*(?:,|;|\/|\band\b)\s*/i)
    .map((x) => x.trim())
    .filter((x) => x && !/^see\b/i.test(x) && x.length < 80);
}

function joinMulti(values) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].join(", ");
}

function isVariableGender(raw) {
  return /\bdepend(?:ent|ant)\b/i.test(String(raw || ""));
}

function normalizeGender(raw) {
  const t = cleanWikiText(raw).toLowerCase();
  if (!t || t.includes("dependent") || t.includes("dependant")) return "";
  if (/\bfemale\b|\bfemme\b|\bféminin/.test(t)) return "Femme";
  if (/\bmale\b|\bhomme\b|\bmasculin/.test(t)) return "Homme";
  return "";
}

function normalizeStatus(raw) {
  const t = cleanWikiText(raw);
  if (!t) return "";
  const low = t.toLowerCase();
  if (
    (low.includes("dependent") || low.includes("dependant")) &&
    !low.includes("deceased") &&
    !low.includes("alive")
  ) {
    return "";
  }
  if (/\bengram\b/.test(low)) return "Engramme";
  if (/\bdeceased\b|\bdead\b|\bmort/.test(low)) return "Mort";
  if (/\balive\b|\bvivant|\bactive\b/.test(low)) return "Vivant";
  if (/\bunknown\b|\binconnu/.test(low)) return "Inconnu";
  const first = t.split(/[,/]/)[0].trim().slice(0, 40);
  if (/^depend/i.test(first)) return "";
  return first;
}

/** Normalize wiki appearance blob (templates + rare plain links). */
function appearanceBlob(params) {
  let blob = [
    params.appears_games || "",
    params.appears_other || "",
    params.appears_books || "",
    params.appearances || "",
  ].join("\n");
  blob = blob
    .replace(/\[\[Cyberpunk 2077(?:\|[^\]]+)?\]\]/gi, "{{CP|2077}}")
    .replace(/\[\[Cyberpunk: Edgerunners(?:\|[^\]]+)?\]\]/gi, "{{CP|EDGE}}");
  return blob;
}

/**
 * True only if the character actually appears in CP2077 / PL or Edgerunners
 * (not merely "(mentioned)", and not empty appears_*).
 */
function hasPlayableAppearance(params) {
  const blob = appearanceBlob(params);
  if (!blob.trim()) return false;
  const tokens = [...blob.matchAll(/\{\{\s*CP\s*\|\s*([^}|]+?)\s*\}\}(\s*\([^)]*\))?/gi)];
  for (const m of tokens) {
    const tag = (m[1] || "").trim().toUpperCase();
    const note = m[2] || "";
    if (/\bmention/i.test(note)) continue;
    if (tag === "2077" || tag === "2077PL") return true;
    if (tag.startsWith("EDGE") || tag === "CEMK" || tag === "EDGEMAD") return true;
  }
  return false;
}

/** S1 anime / manga tags (before the game). EDGEII* = Saison 2 (after the game). */
function isEdgerunnersSeason1Tag(tag) {
  const t = String(tag || "").toUpperCase();
  if (!t) return false;
  if (t.startsWith("EDGEII")) return false;
  return t === "EDGE" || t === "EDGE10" || t === "CEMK" || t === "EDGEMAD" || t.startsWith("EDGE");
}

function isEdgerunnersSeason2Tag(tag) {
  return String(tag || "")
    .toUpperCase()
    .startsWith("EDGEII");
}

/** Base Cyberpunk 2077 (not Phantom Liberty). */
function isBaseGameTag(tag) {
  const t = String(tag || "").toUpperCase();
  return t === "2077" || t === "2077VG" || t === "CP2077" || t === "CP2077VG";
}

function isPhantomLibertyTag(tag) {
  const t = String(tag || "").toUpperCase();
  return t === "2077PL" || t === "CP2077PL" || t === "PL" || t === "PHANTOMLIBERTY";
}

/** Other 2077-era media (comics, etc.) — counts as jeu before S2, after PL only if no PL/base. */
function isOther2077MediaTag(tag) {
  const t = String(tag || "").toUpperCase();
  if (!t.startsWith("2077") && !t.startsWith("CP2077")) return false;
  return !isBaseGameTag(t) && !isPhantomLibertyTag(t);
}

/** Collect non-mentioned CP appearance flags from a wiki blob. */
function collectAppearanceFlags(blob) {
  const tokens = [...String(blob || "").matchAll(/\{\{\s*CP\s*\|\s*([^}|]+?)\s*\}\}(\s*\([^)]*\))?/gi)];
  let hasS1 = false;
  let hasBase = false;
  let hasPL = false;
  let hasOther2077 = false;
  let hasS2 = false;
  for (const m of tokens) {
    const tag = (m[1] || "").trim().toUpperCase();
    const note = m[2] || "";
    if (/\bmention/i.test(note)) continue;
    if (isBaseGameTag(tag)) hasBase = true;
    else if (isPhantomLibertyTag(tag)) hasPL = true;
    else if (isOther2077MediaTag(tag)) hasOther2077 = true;
    else if (isEdgerunnersSeason2Tag(tag)) hasS2 = true;
    else if (isEdgerunnersSeason1Tag(tag)) hasS1 = true;
  }
  return { hasS1, hasBase, hasPL, hasOther2077, hasS2 };
}

/**
 * Première apparition chronologique uniquement :
 * Edgerunners Saison 1 → Jeu vidéo → Phantom Liberty → Edgerunners Saison 2.
 * Infobox uniquement : le corps de page cite {{CP|EDGE}} dans des notes,
 * anecdotes et références (ex. Padre), ce qui donnait de fausses apparitions.
 */
// eslint-disable-next-line no-unused-vars
function detectFirstAppearance(params, categoriesForPage, _wikitext = "") {
  const { hasS1, hasBase, hasPL, hasOther2077, hasS2 } = collectAppearanceFlags(appearanceBlob(params));

  if (!hasS1 && !hasBase && !hasPL && !hasOther2077 && !hasS2) {
    if (categoriesForPage.has("edgerunners")) return "Edgerunners Saison 1";
    return "Jeu vidéo";
  }
  if (hasS1) return "Edgerunners Saison 1";
  if (hasBase || (hasOther2077 && !hasPL)) return "Jeu vidéo";
  if (hasPL) return "Phantom Liberty";
  if (hasOther2077) return "Jeu vidéo";
  return "Edgerunners Saison 2";
}

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "character";
}

function extractDisplayName(params, pageTitle) {
  const title = cleanWikiText(params.title || "");
  if (title && !/^\s*$/.test(title) && !/valerie\/vincent/i.test(title)) return title;
  // V special-case
  if (/^V\b/i.test(pageTitle)) return "V";
  return pageTitle.replace(/\s*\([^)]*\)\s*$/, "").trim() || pageTitle;
}

function extractAliases(params, displayName) {
  const akaRaw = params.aka || params.aliases || "";
  if (!akaRaw) return [];
  // Split on <br> / newlines before cleaning so "Lucy<br>Luce" stays two aliases
  const chunks = stripRefs(akaRaw)
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .flatMap((line) => line.split(/\s*(?:,|;|\/)\s*/));

  const parts = [];
  for (const chunk of chunks) {
    const links = extractLinkTexts(chunk);
    if (links.length) {
      for (const x of links) parts.push(cleanWikiText(x));
    } else {
      const t = cleanWikiText(chunk);
      if (t) parts.push(t);
    }
  }

  const out = [];
  const seen = new Set();
  const norm = (s) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .trim();
  const nameN = norm(displayName);
  for (const p of parts) {
    let t = p.replace(/\([^)]*\)/g, "").trim();
    // Drop quest / gig / episode refs wrongly pulled from <ref> links
    if (/^(gig:|the heist|automatic love|epilogues?|run this town)\b/i.test(t)) continue;
    if (/\b(quest|gig:|mission)\b/i.test(t)) continue;
    // Prefer short nickname tokens; if a chunk still has many words, keep as-is only if ≤4 words
    if (t.split(/\s+/).length > 4) continue;
    if (!t || t.length > 40) continue;
    if (norm(t) === nameN) continue;
    if (seen.has(norm(t))) continue;
    seen.add(norm(t));
    out.push(t);
  }
  return out;
}

function firstImageFilename(params) {
  const raw = params.image || "";
  if (!raw) return "";
  // gallery: first File line
  const gallery = raw.match(/(?:^|\n)\s*([^\n|]+\.(?:png|jpg|jpeg|webp|gif))/i);
  if (gallery) return gallery[1].trim().replace(/^File:/i, "");
  const m = raw.match(/([^|/\n]+\.(?:png|jpg|jpeg|webp|gif))/i);
  return m ? m[1].trim().replace(/^File:/i, "") : "";
}

function ensureDefaults(char) {
  for (const k of Object.keys(FIELD_MAPPING)) {
    if (k === "aliases") {
      if (!Array.isArray(char.aliases)) char.aliases = [];
      continue;
    }
    if (char[k] === undefined) char[k] = "";
  }
}

function buildCharacter(pageTitle, params, categoryTags, wikitext = "") {
  // Skip mentioned-only lore entries and NPCs/enemies with empty appears_*
  if (!hasPlayableAppearance(params)) return null;

  const name = extractDisplayName(params, pageTitle);
  const genderRaw = params.gender || "";
  let gender = normalizeGender(genderRaw);
  // Dependent (V, etc.) → both genders as multivalue. Drop missing/unknown gender.
  if (!gender && isVariableGender(genderRaw)) gender = "Homme, Femme";
  if (!gender) return null;

  const status = normalizeStatus(params.status || "");
  const role = joinMulti(splitMulti(params.role || ""));
  const occupation = joinMulti(splitMulti(params.occupation || ""));
  const affiliation = joinMulti(splitMulti(params.affiliation || ""));
  const home = joinMulti(splitMulti(params.home || ""));
  const firstAppearance = detectFirstAppearance(params, categoryTags, wikitext);
  const aliases = extractAliases(params, name);
  const hint1 = cleanWikiText(params.voiced_by || "");

  // Skip pages that are not really characters (empty core fields)
  const useful =
    gender ||
    status ||
    role ||
    occupation ||
    affiliation ||
    home ||
    aliases.length > 0;
  if (!useful) return null;

  const idBase = slugify(name);
  const char = {
    id: idBase,
    name,
    aliases,
    gender,
    status,
    role,
    occupation,
    affiliation,
    home,
    firstAppearance,
    hint1: hint1 || "",
  };

  const imgFile = firstImageFilename(params);
  if (imgFile) char._wikiImage = imgFile;

  ensureDefaults(char);
  return char;
}

function computePrevalence(characters) {
  const keys = Object.keys(FIELD_MAPPING).filter((k) => k !== "aliases");
  const prev = {};
  const n = characters.length || 1;
  for (const k of keys) {
    let filled = 0;
    for (const c of characters) {
      const v = c[k];
      if (v === undefined || v === null || v === "") continue;
      filled++;
    }
    prev[k] = Math.round((filled / n) * 1000) / 1000;
  }
  let aliasFilled = 0;
  for (const c of characters) {
    if (Array.isArray(c.aliases) && c.aliases.length > 0) aliasFilled++;
  }
  prev.aliases = Math.round((aliasFilled / n) * 1000) / 1000;
  return prev;
}

function pruneFields(characters, fieldMapping, prevalence, minRate, noPrune) {
  if (noPrune) return { characters, fieldMapping, prevalence };
  const keep = new Set(ALWAYS_FIELD_KEYS);
  for (const [k, rate] of Object.entries(prevalence)) {
    if (rate >= minRate) keep.add(k);
  }
  // Always keep core gameplay fields if present in mapping
  for (const k of [
    "gender",
    "status",
    "role",
    "occupation",
    "affiliation",
    "home",
    "firstAppearance",
  ]) {
    if (fieldMapping[k]) keep.add(k);
  }
  const nextMapping = {};
  for (const [k, v] of Object.entries(fieldMapping)) {
    if (keep.has(k)) nextMapping[k] = v;
  }
  const nextPrev = {};
  for (const k of Object.keys(nextMapping)) {
    if (prevalence[k] !== undefined) nextPrev[k] = prevalence[k];
  }
  const nextChars = characters.map((c) => {
    const o = { id: c.id, name: c.name };
    if (Array.isArray(c.aliases)) o.aliases = c.aliases;
    for (const k of Object.keys(nextMapping)) {
      if (k === "aliases") continue;
      if (c[k] !== undefined) o[k] = c[k];
      else o[k] = "";
    }
    return o;
  });
  return { characters: nextChars, fieldMapping: nextMapping, prevalence: nextPrev };
}

function dedupeIds(characters) {
  const seen = new Map();
  for (const c of characters) {
    let id = c.id;
    if (!seen.has(id)) {
      seen.set(id, 1);
      continue;
    }
    const n = seen.get(id) + 1;
    seen.set(id, n);
    c.id = `${id}-${n}`;
  }
  return characters;
}

async function discover() {
  const report = { pages: {}, fieldCounts: {} };
  for (const title of DISCOVER_PAGES) {
    const wt = await fetchWikitext(title);
    const inner = extractInfoboxInner(wt);
    if (!inner) {
      report.pages[title] = { error: "no infobox" };
      continue;
    }
    const params = parseInfoboxParams(inner);
    report.pages[title] = Object.keys(params);
    for (const k of Object.keys(params)) {
      report.fieldCounts[k] = (report.fieldCounts[k] || 0) + 1;
    }
    await sleep(200);
  }
  fs.writeFileSync(DISCOVER_OUT, JSON.stringify(report, null, 2));
  console.log("Wrote", DISCOVER_OUT);
  console.log("Field frequency:", report.fieldCounts);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.discover) {
    await discover();
    return;
  }

  console.log("Listing categories…");
  /** @type {Map<string, Set<string>>} */
  const pageTags = new Map();
  for (const cat of CATEGORIES) {
    const tag = /edgerunners/i.test(cat) ? "edgerunners" : "2077";
    const titles = await listCategoryPages(cat);
    console.log(`  ${cat}: ${titles.length}`);
    for (const t of titles) {
      if (!pageTags.has(t)) pageTags.set(t, new Set());
      pageTags.get(t).add(tag);
    }
    await sleep(args.delay);
  }

  let titles = [...pageTags.keys()].sort((a, b) => a.localeCompare(b));
  // Skip meta / list pages
  titles = titles.filter(
    (t) =>
      !/^Characters$/i.test(t) &&
      !/\/Gallery$/i.test(t) &&
      !/\/Computers$/i.test(t) &&
      !/^List of/i.test(t),
  );

  let existing = [];
  const done = new Set();
  if (args.resume && fs.existsSync(args.outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(args.outPath, "utf8"));
      existing = Array.isArray(prev.characters) ? prev.characters : [];
      for (const c of existing) done.add(c.name);
      console.log(`Resume: ${existing.length} characters already saved`);
    } catch {
      /* ignore */
    }
  }

  if (Number.isFinite(args.limit)) titles = titles.slice(0, args.limit);

  const characters = [...existing];
  let scraped = 0;
  let skipped = 0;

  for (const title of titles) {
    if (done.has(title) || done.has(title.replace(/\s*\([^)]*\)\s*$/, "").trim())) {
      skipped++;
      continue;
    }
    try {
      const wt = await fetchWikitext(title);
      const inner = extractInfoboxInner(wt);
      if (!inner) {
        skipped++;
        await sleep(args.delay);
        continue;
      }
      const params = parseInfoboxParams(inner);
      const char = buildCharacter(title, params, pageTags.get(title) || new Set(), wt);
      if (!char) {
        skipped++;
        await sleep(args.delay);
        continue;
      }
      // Avoid dup by name
      if (characters.some((c) => c.name.toLowerCase() === char.name.toLowerCase())) {
        skipped++;
        await sleep(args.delay);
        continue;
      }
      characters.push(char);
      scraped++;
      if (scraped % 25 === 0) {
        console.log(`  … ${scraped} scraped / ${characters.length} total (last: ${char.name})`);
        if (!args.dryRun) {
          const tmp = {
            id: "cyberpunk",
            name: "Cyberpunk 2077",
            fieldMapping: FIELD_MAPPING,
            characters: dedupeIds([...characters]),
          };
          fs.writeFileSync(args.outPath, JSON.stringify(tmp, null, 2));
        }
      }
    } catch (e) {
      console.warn(`  fail ${title}:`, e.message || e);
    }
    await sleep(args.delay);
  }

  dedupeIds(characters);
  const prevalence = computePrevalence(characters);
  const pruned = pruneFields(
    characters,
    FIELD_MAPPING,
    prevalence,
    args.minRate,
    args.noPrune,
  );

  // Drop internal scrape helpers
  for (const c of pruned.characters) {
    delete c._wikiImage;
  }

  const out = {
    id: "cyberpunk",
    name: "Cyberpunk 2077",
    fieldMapping: pruned.fieldMapping,
    fieldPrevalence: pruned.prevalence,
    hintInterval: 5,
    characters: pruned.characters.sort((a, b) => a.name.localeCompare(b.name, "fr")),
  };

  console.log(
    `Done: ${out.characters.length} characters (scraped +${scraped}, skipped ${skipped})`,
  );
  console.log("Prevalence:", out.fieldPrevalence);

  if (args.dryRun) {
    console.log("Dry run — not writing", args.outPath);
    console.log("Sample:", JSON.stringify(out.characters.slice(0, 3), null, 2));
    return;
  }

  fs.writeFileSync(args.outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", args.outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
