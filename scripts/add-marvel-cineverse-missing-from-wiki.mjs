/**
 * Ajoute les personnages manquants depuis marvel.fandom.com
 * (Category:Earth-XXX/Characters) pour chaque couple (universe, earth) du cineverse.
 *
 * Remplit le maximum de champs depuis l’infobox Character Template.
 * Obligatoires : hint1, species, gender, firstAppearance, hint3 — sinon ignoré.
 * Autres champs absents → chaînes / tableaux vides. difficulty = Impossible.
 *
 * Usage:
 *   node scripts/add-marvel-cineverse-missing-from-wiki.mjs [--dry-run] [--delay MS] [--limit N]
 *   node scripts/add-marvel-cineverse-missing-from-wiki.mjs --resume
 *   node scripts/add-marvel-cineverse-missing-from-wiki.mjs --only-universe MCU
 *   node scripts/add-marvel-cineverse-missing-from-wiki.mjs --only-earth 688
 *   node scripts/add-marvel-cineverse-missing-from-wiki.mjs --list-only
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveHint1, shouldUseMcuFallback } from "./marvel-wiki-actor.mjs";
import { buildAppearanceResolver, normKey as appearanceNormKey } from "./marvel-cineverse-appearance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CINEVERSE_PATH = path.join(ROOT, "data", "marvel-cineverse.json");
const CACHE_PATH = path.join(ROOT, "data", "marvel-cineverse-missing-from-wiki-cache.json");
const REPORT_PATH = path.join(ROOT, "data", "marvel-cineverse-missing-from-wiki-report.json");

const API = "https://marvel.fandom.com/api.php";
const UA = "worlddle-marvel-missing/1.0 (local educational script)";

/**
 * universe + earth (jeu) → slug Earth wiki pour Category:Earth-{slug}/Characters.
 * MCU principal : jeu 616 ↔ wiki 199999.
 * Spider-Verse animé : jeu 8311 ↔ wiki 1610B.
 */
const WIKI_SOURCES = [
  { universe: "MCU", earth: 616, wikiEarth: "199999" },
  { universe: "MCU", earth: 838, wikiEarth: "838" },
  { universe: "MCU", earth: 828, wikiEarth: "828" },
  { universe: "MCU", earth: 617, wikiEarth: "617" },
  { universe: "MCU", earth: 21818, wikiEarth: "21818" },
  { universe: "MCU", earth: 72124, wikiEarth: "72124" },
  { universe: "MCU", earth: 82111, wikiEarth: "82111" },
  { universe: "MCU", earth: 86445, wikiEarth: "86445" },
  { universe: "MCU", earth: 91233, wikiEarth: "91233" },
  { universe: "MCU", earth: "TRN954", wikiEarth: "TRN954" },
  { universe: "Fox X-Men", earth: 10005, wikiEarth: "10005" },
  { universe: "Fox X-Men", earth: 17315, wikiEarth: "17315" },
  { universe: "Fox X-Men", earth: 41633, wikiEarth: "41633" },
  { universe: "Fox Fantastiques", earth: 121698, wikiEarth: "121698" },
  { universe: "SSU", earth: 688, wikiEarth: "688B" },
  { universe: "Raimi-Verse", earth: 96283, wikiEarth: "96283" },
  { universe: "Webb-Verse", earth: 120703, wikiEarth: "120703" },
  { universe: "Spider-Verse", earth: 8311, wikiEarth: "1610B" },
  // Earth-1610 = Ultimate comics (pas le film) — exclus volontairement
  { universe: "Indépendants", earth: 26320, wikiEarth: "26320" },
  { universe: "Indépendants", earth: 701306, wikiEarth: "701306" },
  { universe: "Indépendants", earth: 121347, wikiEarth: "121347" },
  { universe: "Indépendants", earth: 400083, wikiEarth: "400083" },
  { universe: "Indépendants", earth: 47281, wikiEarth: "47281" },
  { universe: "Indépendants", earth: 58732, wikiEarth: "58732" },
  { universe: "Indépendants", earth: 58460, wikiEarth: "58460" },
];

const SKIP_TITLE_RE =
  /\/(Gallery|Quotes|Gallery\/|Vol |Category:|File:|User:|Template:)|Characters$/i;

const SPECIES_MAP = [
  [/homo\s*sapiens|humans?\b/i, "Humain"],
  [/artificial\s*mutant|\bmutants?\b/i, "Mutant"],
  [/inhumans?/i, "Inhumain"],
  [/asgardians?/i, "Asgardian"],
  [/skrulls?/i, "Skrull"],
  [/kree\b/i, "Kree"],
  [/eternals?/i, "Eternal"],
  [/deviants?/i, "Deviant"],
  [/vampires?/i, "Vampire"],
  [/symbiotes?/i, "Symbiote"],
  [/androids?|synthezoids?|robots?/i, "Artificiel"],
  [/frost\s*giants?/i, "Frost Giant"],
  [/dark\s*elves?/i, "Dark Elf"],
  [/celestials?/i, "Céleste"],
  [/demons?/i, "Démon"],
];

function parseArgv(argv) {
  const out = {
    dryRun: false,
    resume: false,
    listOnly: false,
    delay: 350,
    limit: Infinity,
    onlyUniverse: null,
    onlyEarth: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--resume") out.resume = true;
    else if (a === "--list-only") out.listOnly = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--only-universe") out.onlyUniverse = String(argv[++i] || "").trim();
    else if (a === "--only-earth") {
      const raw = String(argv[++i] || "").trim();
      out.onlyEarth = /^\d+$/.test(raw) ? Number(raw) : raw;
    }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

function toSlug(value, separator = "-") {
  let s = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator);
  if (separator) {
    const esc = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`${esc}+`, "g"), separator);
    s = s.replace(new RegExp(`^${esc}|${esc}$`, "g"), "");
  }
  return s;
}

function stripParentheses(value) {
  return String(value ?? "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

function wikiTitleBase(title) {
  return String(title || "")
    .replace(/\s*\(Earth-[^)]+\)\s*$/i, "")
    .trim();
}

function normKey(s) {
  return appearanceNormKey(s);
}

function makeId(name, universe, earth, seenIds) {
  const nameSlug = toSlug(stripParentheses(name), "_");
  const univers = toSlug(universe, "_");
  const earthSlug = toSlug(earth, "-").replace(/^(terre|earth)-?/, "") || toSlug(earth, "-");
  let base = `${nameSlug}-${univers}-${earthSlug}`;
  if (!seenIds.has(base)) return base;
  let n = 2;
  while (seenIds.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

async function categoryPageTitles(cmtitle, delayMs) {
  const titles = [];
  let cmcontinue;
  let continueToken;
  for (;;) {
    const q = {
      action: "query",
      format: "json",
      list: "categorymembers",
      cmtitle,
      cmlimit: "500",
      cmtype: "page",
    };
    if (cmcontinue) q.cmcontinue = cmcontinue;
    if (continueToken) q.continue = continueToken;
    const data = await apiGet(q);
    for (const m of data.query?.categorymembers ?? []) {
      if (m.ns === 0 && m.title && !m.title.startsWith("User:")) titles.push(m.title);
    }
    if (!data.continue?.cmcontinue) break;
    cmcontinue = data.continue.cmcontinue;
    continueToken = data.continue.continue;
    await sleep(delayMs);
  }
  return titles;
}

function extractInfoboxInner(wikitext) {
  const marker = "{{Marvel Database:Character Template";
  const pos = wikitext.indexOf(marker);
  if (pos === -1) {
    const alt = wikitext.indexOf("{{Character Template");
    if (alt === -1) return null;
    return extractFromMarker(wikitext, alt, "{{Character Template".length);
  }
  return extractFromMarker(wikitext, pos, marker.length);
}

function extractFromMarker(wikitext, pos, markerLen) {
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
  let inner = wikitext.slice(pos + markerLen, i).trim();
  if (inner.endsWith("}}")) inner = inner.slice(0, -2).trim();
  return inner.replace(/<gallery>[\s\S]*?<\/gallery>/gi, "\n");
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

function cleanWikiText(s) {
  if (!s) return "";
  return String(s)
    .replace(/<ref[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{m\|[^|}]+\|([^}]+)\}\}/gi, "$1")
    .replace(/\{\{r\|[^}]+\}\}/gi, "")
    .replace(/\{\{cite[^}]*\}\}/gi, "")
    .replace(/'''|''/g, "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\*+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitWikiList(raw) {
  if (!raw) return [];
  const text = String(raw)
    .replace(/\{\{m\|[^|}]+\|([^}]+)\}\}/gi, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
  return text
    .split(/\n|\*|•|;|,|\bFormerly:\b|\bAlly of:\b/i)
    .map((x) => cleanWikiText(x))
    .map((x) => x.replace(/\s*\([^)]*\)\s*$/g, "").trim())
    .filter((x) => x && x.length > 1 && !/^(formerly|ally of|yes|no)$/i.test(x));
}

function mapGender(raw) {
  const t = cleanWikiText(raw).toLowerCase();
  if (!t) return "";
  if (/\bfemale\b|\bwoman\b/.test(t)) return "Femme";
  if (/\bmale\b|\bman\b/.test(t)) return "Homme";
  return "";
}

function mapStatus(params) {
  const death = cleanWikiText(params.Death || params.PlaceOfDeath || params.CauseOfDeath || "");
  if (death) return "Décédé";
  if (cleanWikiText(params.First || "")) return "En Vie";
  return "Inconnu";
}

function mapSpecies(originRaw) {
  const raw = cleanWikiText(originRaw);
  if (!raw) return "";
  for (const [re, label] of SPECIES_MAP) {
    if (re.test(raw) || re.test(originRaw || "")) return label;
  }
  const first = raw.split(/[,;/]/)[0].trim();
  return first.slice(0, 60);
}

function pickDisplayName(params, wikiTitle) {
  const base = wikiTitleBase(wikiTitle);
  const fromName = cleanWikiText(params.Name || "");
  if (!fromName) return base;
  // Prefer page title when Name is overly short / nickname-only
  if (fromName.length < 3 || (base.length > fromName.length + 2 && !normKey(base).includes(normKey(fromName)))) {
    return base;
  }
  return fromName.replace(/\s{2,}/g, " ").slice(0, 80);
}

function buildAliases(params, displayName) {
  const out = [];
  const add = (v) => {
    const t = cleanWikiText(v);
    if (!t || t.length > 80) return;
    if (normKey(t) === normKey(displayName)) return;
    if (!out.some((x) => normKey(x) === normKey(t))) out.push(t);
  };
  add(params.CurrentAlias);
  for (const x of splitWikiList(params.Aliases || "")) add(x);
  for (const x of splitWikiList(params.Codenames || "")) add(x);
  for (const x of splitWikiList(params.Nicknames || "")) add(x);
  return out.slice(0, 8);
}

function pickAffiliation(raw) {
  const list = splitWikiList(raw);
  if (!list.length) return "";
  // Prefer first non-generic org
  const skip = /^(ally of|formerly)$/i;
  const hit = list.find((x) => !skip.test(x));
  return (hit || list[0]).slice(0, 80);
}

async function fetchWikitext(title) {
  const data = await apiGet({
    action: "parse",
    format: "json",
    page: title,
    prop: "wikitext",
    redirects: "1",
  });
  if (data.error) return { error: data.error.info || "parse error", wikitext: "", resolvedTitle: title };
  return {
    error: null,
    wikitext: data.parse?.wikitext?.["*"] || "",
    resolvedTitle: data.parse?.title || title,
  };
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return { done: {}, addedIds: [], skipped: {} };
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return { done: {}, addedIds: [], skipped: {} };
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

function buildExistingIndex(characters) {
  /** @type {Map<string, Set<string>>} */
  const byUniverseEarth = new Map();
  const ids = new Set();
  for (const c of characters) {
    ids.add(c.id);
    const key = `${c.universe}\0${c.earth}`;
    if (!byUniverseEarth.has(key)) byUniverseEarth.set(key, new Set());
    const set = byUniverseEarth.get(key);
    set.add(normKey(c.name));
    for (const a of c.aliases || []) set.add(normKey(a));
  }
  return { byUniverseEarth, ids };
}

function alreadyHave(index, universe, earth, wikiTitle, displayName, aliases) {
  const set = index.byUniverseEarth.get(`${universe}\0${earth}`);
  if (!set) return false;
  const candidates = [wikiTitleBase(wikiTitle), displayName, ...(aliases || [])];
  return candidates.some((n) => n && set.has(normKey(n)));
}

async function characterFromWiki(params, { wikiTitle, universe, earth, resolveAppearance, wikiEarth, wikitext, delayMs }) {
  const name = pickDisplayName(params, wikiTitle);
  const aliases = buildAliases(params, name);
  const appearance = resolveAppearance(params.First || "");
  const firstAppearance = appearance.label || appearance.cleaned || "";
  const hint2 = appearance.year || "";
  const hint1 = await resolveHint1({
    params,
    wikitext,
    wikiTitle,
    displayName: name,
    currentAlias: cleanWikiText(params.CurrentAlias || ""),
    useMcuFallback: shouldUseMcuFallback(wikiEarth),
    delayMs,
    sleep,
  });

  return {
    id: "", // filled later
    name,
    status: mapStatus(params),
    aliases,
    species: mapSpecies(params.Origin || ""),
    gender: mapGender(params.Gender || ""),
    affiliation: pickAffiliation(params.Affiliation || ""),
    firstAppearance,
    hint1,
    hint2,
    hint3: firstAppearance || "",
    role: "",
    abilities: [],
    earth,
    universe,
    difficulty: "Impossible",
    _wikiTitle: wikiTitle,
  };
}

function selectSources(opts) {
  return WIKI_SOURCES.filter((s) => {
    if (opts.onlyUniverse && s.universe !== opts.onlyUniverse) return false;
    if (opts.onlyEarth != null && String(s.earth) !== String(opts.onlyEarth)) return false;
    return true;
  });
}

async function main() {
  const opts = parseArgv(process.argv);
  const data = JSON.parse(fs.readFileSync(CINEVERSE_PATH, "utf8"));
  const { resolve: resolveAppearance } = buildAppearanceResolver(data.fieldMapping?.firstAppearance || {});
  const index = buildExistingIndex(data.characters);
  const cache = opts.resume ? loadCache() : { done: {}, addedIds: [], skipped: {} };
  const sources = selectSources(opts);

  console.error("Sources wiki:", sources.length);
  console.error("Personnages existants:", data.characters.length);

  const planned = [];
  for (const src of sources) {
    const cmtitle = `Category:Earth-${src.wikiEarth}/Characters`;
    process.stderr.write(`Liste ${cmtitle}…\n`);
    let titles = [];
    try {
      titles = await categoryPageTitles(cmtitle, opts.delay);
    } catch (e) {
      console.error("Erreur catégorie", cmtitle, e.message || e);
      continue;
    }
    const filtered = titles.filter((t) => !SKIP_TITLE_RE.test(t) && !t.includes("/"));
    let missing = 0;
    for (const title of filtered) {
      const cacheKey = `${src.universe}|${src.earth}|${title}`;
      if (cache.done[cacheKey] === "exists" || cache.done[cacheKey] === "added") continue;
      if (alreadyHave(index, src.universe, src.earth, title, wikiTitleBase(title), [])) {
        cache.done[cacheKey] = "exists";
        continue;
      }
      planned.push({ ...src, wikiTitle: title, cacheKey });
      missing++;
    }
    console.error(`  ${filtered.length} fiches, ~${missing} manquants (hors cache)`);
    await sleep(opts.delay);
  }

  console.error("À traiter:", planned.length, opts.limit < Infinity ? `(limit ${opts.limit})` : "");

  if (opts.listOnly) {
    fs.writeFileSync(
      REPORT_PATH,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), plannedCount: planned.length, planned: planned.slice(0, 5000) }, null, 2)}\n`,
      "utf8",
    );
    console.error("Rapport:", REPORT_PATH);
    saveCache(cache);
    return;
  }

  const toProcess = planned.slice(0, opts.limit);
  const added = [];
  let fetched = 0;
  let failed = 0;
  let skippedNoHint1 = 0;
  let skippedNoSpecies = 0;
  let skippedNoGender = 0;
  let skippedNoFirstAppearance = 0;
  let skippedNoHint3 = 0;

  for (const item of toProcess) {
    fetched++;
    process.stderr.write(`\r[${fetched}/${toProcess.length}] ${item.wikiTitle.slice(0, 60)}…          `);
    try {
      const { error, wikitext, resolvedTitle } = await fetchWikitext(item.wikiTitle);
      await sleep(opts.delay);
      if (error || !wikitext) {
        failed++;
        cache.skipped[item.cacheKey] = error || "empty";
        cache.done[item.cacheKey] = "skip";
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      if (!inner) {
        failed++;
        cache.skipped[item.cacheKey] = "no-infobox";
        cache.done[item.cacheKey] = "skip";
        continue;
      }
      const params = parseInfoboxParams(inner);
      const char = await characterFromWiki(params, {
        wikiTitle: resolvedTitle || item.wikiTitle,
        universe: item.universe,
        earth: item.earth,
        resolveAppearance,
        wikiEarth: item.wikiEarth,
        wikitext,
        delayMs: opts.delay,
      });

      if (!String(char.hint1 || "").trim()) {
        skippedNoHint1++;
        cache.skipped[item.cacheKey] = "no-hint1";
        cache.done[item.cacheKey] = "skip-no-hint1";
        continue;
      }
      if (!String(char.species || "").trim()) {
        skippedNoSpecies++;
        cache.skipped[item.cacheKey] = "no-species";
        cache.done[item.cacheKey] = "skip-no-species";
        continue;
      }
      if (!String(char.gender || "").trim()) {
        skippedNoGender++;
        cache.skipped[item.cacheKey] = "no-gender";
        cache.done[item.cacheKey] = "skip-no-gender";
        continue;
      }
      if (!String(char.firstAppearance || "").trim()) {
        skippedNoFirstAppearance++;
        cache.skipped[item.cacheKey] = "no-firstAppearance";
        cache.done[item.cacheKey] = "skip-no-firstAppearance";
        continue;
      }
      if (!String(char.hint3 || "").trim()) {
        skippedNoHint3++;
        cache.skipped[item.cacheKey] = "no-hint3";
        cache.done[item.cacheKey] = "skip-no-hint3";
        continue;
      }

      if (alreadyHave(index, item.universe, item.earth, item.wikiTitle, char.name, char.aliases)) {
        cache.done[item.cacheKey] = "exists";
        continue;
      }

      char.id = makeId(char.name, item.universe, item.earth, index.ids);
      index.ids.add(char.id);
      const setKey = `${item.universe}\0${item.earth}`;
      if (!index.byUniverseEarth.has(setKey)) index.byUniverseEarth.set(setKey, new Set());
      const set = index.byUniverseEarth.get(setKey);
      set.add(normKey(char.name));
      for (const a of char.aliases) set.add(normKey(a));

      const { _wikiTitle, ...clean } = char;
      added.push({ ...clean, _wikiTitle });
      cache.done[item.cacheKey] = "added";
      cache.addedIds.push(clean.id);

      if (!opts.dryRun && added.length % 25 === 0) {
        saveCache(cache);
      }
    } catch (e) {
      failed++;
      cache.skipped[item.cacheKey] = String(e.message || e);
      cache.done[item.cacheKey] = "skip";
    }
  }
  process.stderr.write("\n");

  console.error(
    `Ajoutés: ${added.length} | sans hint1: ${skippedNoHint1} | sans species: ${skippedNoSpecies} | sans gender: ${skippedNoGender} | sans firstAppearance: ${skippedNoFirstAppearance} | sans hint3: ${skippedNoHint3} | échecs: ${failed}`,
  );

  if (!opts.dryRun && added.length) {
    for (const c of added) {
      const { _wikiTitle, ...rest } = c;
      data.characters.push(rest);
    }
    fs.writeFileSync(CINEVERSE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.error("Écrit:", CINEVERSE_PATH, "— total", data.characters.length);
  } else if (opts.dryRun) {
    console.error("Dry-run: JSON non modifié");
  }

  saveCache(cache);
  fs.writeFileSync(
    REPORT_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun: opts.dryRun,
        added: added.length,
        skippedNoHint1,
        skippedNoSpecies,
        skippedNoGender,
        skippedNoFirstAppearance,
        skippedNoHint3,
        failed,
        sample: added.slice(0, 20),
        totalCharacters: data.characters.length + (opts.dryRun ? added.length : 0),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.error("Rapport:", REPORT_PATH);
  console.error("Cache:", CACHE_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
