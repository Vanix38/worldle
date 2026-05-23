/**
 * Fusionne connu, aussiConnuSousLeNom, surnom et romaji → aliases (tableau).
 * Les champs sources ne sont plus conservés dans le JSON.
 *
 * Usage:
 *   node scripts/build-hxh-aliases.mjs [--out path]
 *   node scripts/build-hxh-aliases.mjs --from-wiki [--delay MS]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.join(__dirname, "..", "data", "hunterxhunter.json");
const API = "https://hunterxhunter.fandom.com/fr/api.php";
const INFOBOX_MARKERS = ["{{Infobox char", "{{Infobox_char"];

const WIKI_ALIAS_KEYS = new Set(["connu", "aussi connu sous le nom", "surnom", "romaji"]);

export const ALIAS_SOURCE_KEYS = ["connu", "aussiConnuSousLeNom", "surnom", "romaji"];

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
  "voix jap": "voixJap",
  "voix fr": "voixFr",
  connu: "connu",
  surnom: "surnom",
  romaji: "romaji",
};

function parseArgv(argv) {
  const out = { outPath: DEFAULT_OUT, fromWiki: false, delay: 350 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--from-wiki") out.fromWiki = true;
    else if (argv[i] === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
    else if (argv[i] === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeWikiKey(wikiKey) {
  return wikiKey
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/_/g, " ");
}

function wikiKeyToJsonKey(wikiKey) {
  const norm = normalizeWikiKey(wikiKey);
  if (WIKI_KEY_TO_JSON[norm]) return WIKI_KEY_TO_JSON[norm];
  const parts = norm.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "field";
  return parts
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join("");
}

export function splitAliasTokens(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(/\s*\/\s*|\s*,\s*|\s+et\s+|\s+ou\s+|\s*;\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildAliasesFromCharacter(char) {
  const seen = new Set();
  const out = [];
  const nameNorm = (char.name || "").trim().toLowerCase();

  const push = (token) => {
    const t = token.replace(/\s+/g, " ").trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (nameNorm && key === nameNorm) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const field of ALIAS_SOURCE_KEYS) {
    for (const tok of splitAliasTokens(char[field])) push(tok);
  }

  return out.sort((a, b) => a.localeCompare(b, "fr"));
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
    let inner = wikitext.slice(pos, i).slice(marker.length).trim();
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
    if (!key || key.includes("\n") || key.includes("<")) {
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

function cleanWikiText(s) {
  if (!s) return "";
  let t = s.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  for (let n = 0; n < 40; n++) {
    const m = t.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (!m) break;
    let disp = (m[2] ?? m[1]).trim();
    t = t.replace(m[0], disp.replace(/''+/g, "").trim());
  }
  t = t.replace(/\{\{[^{}]+\}\}/g, "");
  return t.replace(/\n+/g, " / ").replace(/\s+/g, " ").trim();
}

function fieldValueFromRaw(raw) {
  if (!raw || !String(raw).trim()) return "";
  return cleanWikiText(raw);
}

function wikiPageFromCharacter(c) {
  return c.id
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("_");
}

async function fetchAliasSourcesFromWiki(pageTitle) {
  const u = new URL(API);
  u.searchParams.set("action", "parse");
  u.searchParams.set("page", pageTitle);
  u.searchParams.set("prop", "wikitext");
  u.searchParams.set("format", "json");
  u.searchParams.set("redirects", "1");
  const res = await fetch(u, { headers: { "User-Agent": "worldle-hxh-aliases/1.0" } });
  if (!res.ok) return {};
  const data = await res.json();
  const wt = data.parse?.wikitext?.["*"] || "";
  const inner = extractInfoboxInner(wt);
  if (!inner) return {};
  const canon = canonicalizeParams(parseInfoboxParams(inner));
  const sources = {};
  for (const [wikiKey, raw] of Object.entries(canon)) {
    if (!WIKI_ALIAS_KEYS.has(wikiKey)) continue;
    const jsonKey = wikiKeyToJsonKey(wikiKey);
    const val = fieldValueFromRaw(raw);
    if (val) sources[jsonKey] = val;
  }
  return sources;
}

async function main() {
  const opts = parseArgv(process.argv);
  const data = JSON.parse(fs.readFileSync(opts.outPath, "utf8"));
  let withAliases = 0;
  let i = 0;

  for (const c of data.characters) {
    i++;
    const sources = opts.fromWiki
      ? await fetchAliasSourcesFromWiki(wikiPageFromCharacter(c))
      : Object.fromEntries(ALIAS_SOURCE_KEYS.filter((k) => c[k]).map((k) => [k, c[k]]));

    if (opts.fromWiki) await sleep(opts.delay);

    const aliases = buildAliasesFromCharacter({ name: c.name, ...sources });
    if (aliases.length > 0) {
      c.aliases = aliases;
      withAliases++;
    } else {
      delete c.aliases;
    }

    for (const k of ALIAS_SOURCE_KEYS) delete c[k];

    if (opts.fromWiki && i % 40 === 0) console.log("Progress", i, "/", data.characters.length);
  }

  for (const k of ALIAS_SOURCE_KEYS) {
    delete data.fieldMapping?.[k];
    delete data.fieldPrevalence?.[k];
  }

  data.fieldMapping = data.fieldMapping || {};
  data.fieldMapping.aliases = {
    header: "Alias",
    fonction: "Recherche",
    description:
      "Fusion de connu, aussi connu sous le nom, surnom et romaji (recherche / autocomplete uniquement).",
  };

  fs.writeFileSync(opts.outPath, JSON.stringify(data, null, 2), "utf8");
  console.log("Wrote", opts.outPath);
  console.log("Personnages avec aliases:", withAliases, "/", data.characters.length);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
