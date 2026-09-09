/**
 * Rebuild marvel-cineverse.json: keep existing characters, ADD missing IDs
 * from image stems + difficulty batches, enrich via marvel.fandom.com.
 *
 * Usage:
 *   node scripts/rebuild-marvel-cineverse.mjs
 *   node scripts/rebuild-marvel-cineverse.mjs --delay 120 --limit 50
 *   node scripts/rebuild-marvel-cineverse.mjs --resume
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractActorFromText } from "./marvel-wiki-actor.mjs";
import { buildAppearanceResolver } from "./marvel-cineverse-appearance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CINEVERSE_PATH = path.join(ROOT, "data", "marvel-cineverse.json");
const BACKUP_PATH = path.join(ROOT, "data", "marvel-cineverse.pre-rebuild.json");
const REPORT_PATH = path.join(ROOT, "data", "marvel-cineverse-rebuild-report.json");
const CACHE_PATH = path.join(ROOT, "data", "marvel-cineverse-rebuild-cache.json");
const IMAGES_DIR = path.join(ROOT, "public", "universes", "marvel-cineverse", "characters");

const API = "https://marvel.fandom.com/api.php";
const UA = "worlddle-marvel-rebuild/1.0 (local educational script)";

const UNIVERSE_BY_SLUG = {
  mcu: "MCU",
  fox_x_men: "Fox X-Men",
  fox_fantastiques: "Fox Fantastiques",
  ssu: "SSU",
  raimi_verse: "Raimi-Verse",
  webb_verse: "Webb-Verse",
  spider_verse: "Spider-Verse",
  independants: "Indépendants",
};

const UNIVERSE_SLUG_RE =
  "(mcu|fox_x_men|fox_fantastiques|ssu|raimi_verse|webb_verse|spider_verse|independants)";

const WIKI_EARTH = [
  ["MCU", 616, "199999"],
  ["MCU", 838, "838"],
  ["MCU", 828, "828"],
  ["MCU", 617, "617"],
  ["MCU", 21818, "21818"],
  ["MCU", 72124, "72124"],
  ["MCU", 82111, "82111"],
  ["MCU", 86445, "86445"],
  ["MCU", 91233, "91233"],
  ["MCU", "TRN954", "TRN954"],
  ["Fox X-Men", 10005, "10005"],
  ["Fox X-Men", 17315, "17315"],
  ["Fox X-Men", 41633, "41633"],
  ["Fox Fantastiques", 121698, "121698"],
  ["SSU", 688, "688B"],
  ["Raimi-Verse", 96283, "96283"],
  ["Webb-Verse", 120703, "120703"],
  ["Spider-Verse", 8311, "1610B"],
  ["Indépendants", 26320, "26320"],
  ["Indépendants", 701306, "701306"],
  ["Indépendants", 121347, "121347"],
  ["Indépendants", 400083, "400083"],
  ["Indépendants", 47281, "47281"],
  ["Indépendants", 58732, "58732"],
  ["Indépendants", 58460, "58460"],
];

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
  const out = { delay: 120, limit: Infinity, resume: false, batchSize: 20 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--resume") out.resume = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 120);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--batch-size") out.batchSize = Math.max(1, parseInt(argv[++i], 10) || 20);
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

function wikiEarthFor(universe, earth) {
  const hit = WIKI_EARTH.find(
    ([u, e]) => u === universe && String(e) === String(earth),
  );
  return hit ? hit[2] : String(earth);
}

function parseCharacterId(id) {
  const re = new RegExp(`^(.+)-${UNIVERSE_SLUG_RE}-(.+)$`, "i");
  const m = String(id).match(re);
  if (!m) return null;
  const nameSlug = m[1];
  const universeSlug = m[2].toLowerCase();
  let earthRaw = m[3];
  // drop duplicate suffix like -2
  const earthParts = earthRaw.split("-");
  if (earthParts.length > 1 && /^\d+$/.test(earthParts[earthParts.length - 1]) && earthParts.length === 2 && !/^\d+$|^trn/i.test(earthParts[0])) {
    // e.g. something weird — keep as-is
  }
  // earth may be "616" or "TRN954" or "616-2"
  let earth = earthRaw;
  let dup = null;
  const dupM = earthRaw.match(/^(TRN\d+|\d+)-(\d+)$/i);
  if (dupM) {
    earth = /^\d+$/.test(dupM[1]) ? Number(dupM[1]) : dupM[1];
    dup = Number(dupM[2]);
  } else if (/^\d+$/.test(earthRaw)) {
    earth = Number(earthRaw);
  }
  const universe = UNIVERSE_BY_SLUG[universeSlug];
  if (!universe) return null;
  return { nameSlug, universeSlug, universe, earth, dup };
}

function slugToDisplayName(slug) {
  return String(slug || "")
    .replace(/_/g, " ")
    .replace(/\b(young|adult)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractInfoboxInner(wikitext) {
  const markers = ["{{Marvel Database:Character Template", "{{Character Template"];
  let pos = -1;
  let markerLen = 0;
  for (const marker of markers) {
    pos = wikitext.indexOf(marker);
    if (pos !== -1) {
      markerLen = marker.length;
      break;
    }
  }
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

function wikiTitleBase(title) {
  return String(title || "")
    .replace(/\s*\(Earth-[^)]+\)\s*$/i, "")
    .trim();
}

function pickDisplayName(params, wikiTitle, fallbackName) {
  const base = wikiTitleBase(wikiTitle);
  const fromName = cleanWikiText(params.Name || "");
  if (fromName && fromName.length >= 2) return fromName.replace(/\s{2,}/g, " ").slice(0, 80);
  if (base) return base;
  return fallbackName;
}

function buildAliases(params, displayName) {
  const out = [];
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  const add = (v) => {
    const t = cleanWikiText(v);
    if (!t || t.length > 80) return;
    if (norm(t) === norm(displayName)) return;
    if (!out.some((x) => norm(x) === norm(t))) out.push(t);
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
  const skip = /^(ally of|formerly)$/i;
  const hit = list.find((x) => !skip.test(x));
  return (hit || list[0]).slice(0, 80);
}

function nameCandidates(nameSlug, batchName) {
  const out = [];
  const push = (v) => {
    const s = String(v || "").trim();
    if (!s || out.includes(s)) return;
    out.push(s);
  };
  if (batchName) push(batchName);
  const fromSlug = slugToDisplayName(nameSlug);
  push(fromSlug);
  // underscore → Title_Case for wiki
  push(fromSlug.replace(/ /g, "_").replace(/_/g, " "));
  // drop middle nickname patterns like "alonzo_lonnie_lincoln" already handled
  // try without junior suffixes collapsed
  const parts = nameSlug.split("_").filter(Boolean);
  if (parts.length >= 3) {
    // First + Last only
    push(slugToDisplayName(`${parts[0]}_${parts[parts.length - 1]}`));
  }
  return out;
}

function titleCandidates(meta, batchName) {
  const wikiEarth = wikiEarthFor(meta.universe, meta.earth);
  const names = nameCandidates(meta.nameSlug, batchName);
  const titles = [];
  for (const n of names) {
    titles.push(`${n} (Earth-${wikiEarth})`);
    // underscore form
    titles.push(`${n.replace(/ /g, "_")} (Earth-${wikiEarth})`.replace(/_/g, " "));
  }
  // unique preserve order
  return [...new Set(titles.map((t) => t.replace(/\s+/g, " ").trim()))];
}

/** Fetch many page wikitexts; returns Map<title, {wikitext, resolvedTitle, missing}> */
async function fetchWikitextBatch(titles, delayMs) {
  const map = new Map();
  if (!titles.length) return map;
  const data = await apiGet({
    action: "query",
    format: "json",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    redirects: "1",
    titles: titles.join("|"),
  });
  const redirects = new Map((data.query?.redirects || []).map((r) => [r.from, r.to]));
  const normalized = new Map((data.query?.normalized || []).map((n) => [n.from, n.to]));
  const byTitle = new Map();
  for (const page of Object.values(data.query?.pages || {})) {
    if (!page || page.missing || page.invalid) {
      if (page?.title) byTitle.set(page.title, { missing: true, wikitext: "", resolvedTitle: page.title });
      continue;
    }
    const wt = page.revisions?.[0]?.slots?.main?.["*"] || page.revisions?.[0]?.["*"] || "";
    byTitle.set(page.title, { missing: false, wikitext: wt, resolvedTitle: page.title });
  }
  for (const t of titles) {
    let cur = t;
    if (normalized.has(cur)) cur = normalized.get(cur);
    if (redirects.has(cur)) cur = redirects.get(cur);
    if (byTitle.has(cur)) map.set(t, byTitle.get(cur));
    else if (byTitle.has(t)) map.set(t, byTitle.get(t));
    else map.set(t, { missing: true, wikitext: "", resolvedTitle: t });
  }
  if (delayMs) await sleep(delayMs);
  return map;
}

async function searchWikiTitle(name, wikiEarth, delayMs) {
  try {
    const data = await apiGet({
      action: "query",
      format: "json",
      list: "search",
      srsearch: `${name} Earth-${wikiEarth}`,
      srlimit: "5",
    });
    if (delayMs) await sleep(delayMs);
    const hits = data.query?.search || [];
    const earthRe = new RegExp(`\\(Earth-${wikiEarth}\\)$`, "i");
    const exact = hits.find((h) => earthRe.test(h.title));
    if (exact) return exact.title;
    const any = hits.find((h) => /Earth-/i.test(h.title));
    return any?.title || null;
  } catch {
    return null;
  }
}

function loadCache(resume) {
  if (!resume || !fs.existsSync(CACHE_PATH)) {
    return { byId: {}, searchTried: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return { byId: {}, searchTried: {} };
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

function collectMissing(existingIds) {
  const imageStems = fs
    .readdirSync(IMAGES_DIR)
    .map((f) => path.parse(f).name)
    .filter(Boolean);
  const batchById = new Map();
  const difficultyById = new Map(); // id -> {difficulty, batch}
  for (let i = 1; i <= 48; i++) {
    const p = path.join(ROOT, "data", `marvel-impossible-diff-batch-${i}.json`);
    if (!fs.existsSync(p)) continue;
    const arr = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const row of arr) {
      if (!row?.id) continue;
      if (!batchById.has(row.id)) batchById.set(row.id, row);
      if (row.changed === true && row.difficulty) {
        difficultyById.set(row.id, { difficulty: row.difficulty, batch: i });
      }
    }
  }
  const missing = new Set();
  const sources = {};
  for (const stem of imageStems) {
    if (!existingIds.has(stem)) {
      missing.add(stem);
      sources[stem] = sources[stem] || [];
      sources[stem].push("image");
    }
  }
  for (const id of batchById.keys()) {
    if (!existingIds.has(id)) {
      missing.add(id);
      sources[id] = sources[id] || [];
      sources[id].push("batch");
    }
  }
  return {
    missingIds: [...missing].sort(),
    batchById,
    difficultyById,
    sources,
    imageStemCount: imageStems.length,
    batchUniqueIds: batchById.size,
  };
}

function buildStub(id, meta, batchRow, difficulty) {
  const name = batchRow?.name || slugToDisplayName(meta?.nameSlug || id);
  return {
    id,
    name,
    status: "Inconnu",
    aliases: [],
    species: "",
    gender: "",
    affiliation: "",
    firstAppearance: "",
    hint1: "",
    hint2: "",
    hint3: "",
    role: "",
    abilities: [],
    earth: meta?.earth ?? "",
    universe: meta?.universe ?? "",
    difficulty: difficulty || batchRow?.difficulty || "Impossible",
  };
}

function characterFromWiki(params, { wikiTitle, universe, earth, resolveAppearance, wikitext, fallbackName, difficulty }) {
  const name = pickDisplayName(params, wikiTitle, fallbackName);
  const aliases = buildAliases(params, name);
  const appearance = resolveAppearance(params.First || "");
  const firstAppearance = appearance.label || appearance.cleaned || "";
  const hint2 = appearance.year || "";
  const hint1 =
    extractActorFromText([params.Notes, params.Trivia].filter(Boolean).join("\n")) ||
    extractActorFromText(wikitext) ||
    "";

  return {
    id: "",
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
    difficulty: difficulty || "Impossible",
  };
}

async function main() {
  const opts = parseArgv(process.argv);
  const startedAt = new Date().toISOString();

  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(CINEVERSE_PATH, BACKUP_PATH);
    console.error("Backup créé:", BACKUP_PATH);
  } else {
    console.error("Backup déjà présent:", BACKUP_PATH);
  }

  const data = JSON.parse(fs.readFileSync(CINEVERSE_PATH, "utf8"));
  const existingIds = new Set(data.characters.map((c) => c.id));
  const beforeCount = data.characters.length;
  const { resolve: resolveAppearance } = buildAppearanceResolver(
    data.fieldMapping?.firstAppearance || {},
  );

  const inventory = collectMissing(existingIds);
  let todo = inventory.missingIds;
  if (opts.limit < Infinity) todo = todo.slice(0, opts.limit);

  console.error(
    `Existants: ${beforeCount} | manquants union: ${inventory.missingIds.length} | à traiter: ${todo.length}`,
  );

  const cache = loadCache(opts.resume);
  const added = [];
  const failures = [];
  const sourcesUsed = { wiki: 0, stub: 0, cache: 0 };

  // Phase 1: resolve wiki titles for each id (candidates + optional search)
  const idMeta = new Map();
  for (const id of todo) {
    if (cache.byId[id]?.character) continue;
    const meta = parseCharacterId(id);
    if (!meta) {
      failures.push({ id, error: "unparseable-id" });
      continue;
    }
    const batchRow = inventory.batchById.get(id);
    const diff = inventory.difficultyById.get(id)?.difficulty || batchRow?.difficulty || "Impossible";
    idMeta.set(id, { meta, batchRow, difficulty: diff, titles: titleCandidates(meta, batchRow?.name) });
  }

  // Phase 2: batch-fetch candidate titles
  const pendingIds = [...idMeta.keys()].filter((id) => !cache.byId[id]?.character);
  console.error("Fetch wiki pour", pendingIds.length, "IDs…");

  // Collect unique titles in waves: try first candidate for all, then second, etc.
  const resolved = new Map(); // id -> {title, wikitext}

  const maxCand = Math.max(0, ...pendingIds.map((id) => idMeta.get(id).titles.length));
  for (let candIdx = 0; candIdx < Math.min(maxCand, 4); candIdx++) {
    const need = pendingIds.filter((id) => !resolved.has(id));
    if (!need.length) break;
    const pairs = [];
    for (const id of need) {
      const t = idMeta.get(id).titles[candIdx];
      if (t) pairs.push({ id, title: t });
    }
    // group by title uniqueness then batch API
    for (let i = 0; i < pairs.length; i += opts.batchSize) {
      const chunk = pairs.slice(i, i + opts.batchSize);
      const titles = [...new Set(chunk.map((p) => p.title))];
      process.stderr.write(
        `\r  cand#${candIdx + 1} batch ${Math.floor(i / opts.batchSize) + 1}/${Math.ceil(pairs.length / opts.batchSize)} (${titles.length} titles)…   `,
      );
      let map;
      try {
        map = await fetchWikitextBatch(titles, opts.delay);
      } catch (e) {
        console.error("\nFetch error:", e.message || e);
        await sleep(opts.delay * 3);
        try {
          map = await fetchWikitextBatch(titles, opts.delay);
        } catch (e2) {
          for (const p of chunk) {
            failures.push({ id: p.id, error: String(e2.message || e2), title: p.title });
          }
          continue;
        }
      }
      for (const p of chunk) {
        if (resolved.has(p.id)) continue;
        const hit = map.get(p.title);
        if (hit && !hit.missing && hit.wikitext && extractInfoboxInner(hit.wikitext)) {
          resolved.set(p.id, { title: hit.resolvedTitle || p.title, wikitext: hit.wikitext, via: p.title });
        }
      }
    }
  }
  process.stderr.write("\n");

  // Phase 3: search fallback for unresolved
  const unresolved = pendingIds.filter((id) => !resolved.has(id));
  console.error("Search fallback:", unresolved.length);
  let searchN = 0;
  for (const id of unresolved) {
    if (cache.searchTried[id]) continue;
    const { meta, batchRow } = idMeta.get(id);
    const wikiEarth = wikiEarthFor(meta.universe, meta.earth);
    const names = nameCandidates(meta.nameSlug, batchRow?.name).slice(0, 2);
    let found = null;
    for (const n of names) {
      found = await searchWikiTitle(n, wikiEarth, opts.delay);
      if (found) break;
    }
    cache.searchTried[id] = found || "none";
    searchN++;
    if (searchN % 25 === 0) {
      process.stderr.write(`\r  search ${searchN}/${unresolved.length}…`);
      saveCache(cache);
    }
    if (!found) continue;
    try {
      const map = await fetchWikitextBatch([found], opts.delay);
      const hit = map.get(found);
      if (hit && !hit.missing && hit.wikitext && extractInfoboxInner(hit.wikitext)) {
        resolved.set(id, { title: hit.resolvedTitle || found, wikitext: hit.wikitext, via: `search:${found}` });
      }
    } catch (e) {
      failures.push({ id, error: String(e.message || e), title: found });
    }
  }
  process.stderr.write("\n");

  // Phase 4: build characters
  for (const id of todo) {
    if (cache.byId[id]?.character) {
      const ch = cache.byId[id].character;
      if (!existingIds.has(id)) {
        added.push(ch);
        existingIds.add(id);
        sourcesUsed.cache++;
      }
      continue;
    }
    const info = idMeta.get(id);
    if (!info) {
      // unparseable — stub minimal
      const stub = buildStub(id, null, inventory.batchById.get(id), inventory.difficultyById.get(id)?.difficulty);
      added.push(stub);
      existingIds.add(id);
      cache.byId[id] = { character: stub, source: "stub-unparseable" };
      sourcesUsed.stub++;
      continue;
    }
    const wiki = resolved.get(id);
    if (wiki) {
      const inner = extractInfoboxInner(wiki.wikitext);
      const params = parseInfoboxParams(inner);
      const char = characterFromWiki(params, {
        wikiTitle: wiki.title,
        universe: info.meta.universe,
        earth: info.meta.earth,
        resolveAppearance,
        wikitext: wiki.wikitext,
        fallbackName: info.batchRow?.name || slugToDisplayName(info.meta.nameSlug),
        difficulty: info.difficulty,
      });
      char.id = id;
      added.push(char);
      existingIds.add(id);
      cache.byId[id] = { character: char, source: "wiki", via: wiki.via };
      sourcesUsed.wiki++;
    } else {
      const stub = buildStub(id, info.meta, info.batchRow, info.difficulty);
      added.push(stub);
      existingIds.add(id);
      cache.byId[id] = { character: stub, source: "stub" };
      sourcesUsed.stub++;
      failures.push({ id, error: "wiki-not-found", stub: true });
    }
  }

  // Merge added into data
  for (const ch of added) {
    if (!data.characters.some((c) => c.id === ch.id)) {
      data.characters.push(ch);
    }
  }

  // Re-apply ALL difficulty merges from batches 1–48 (changed===true, higher batch wins)
  let difficultyUpdates = 0;
  const byId = new Map(data.characters.map((c) => [c.id, c]));
  for (const [id, { difficulty }] of inventory.difficultyById) {
    const ch = byId.get(id);
    if (ch && ch.difficulty !== difficulty) {
      ch.difficulty = difficulty;
      difficultyUpdates++;
    } else if (ch && ch.difficulty === difficulty) {
      // already set
    }
  }

  // Sort by existing order then new alphabetical? Keep existing order, append new sorted
  // (already appended)

  fs.writeFileSync(CINEVERSE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  saveCache(cache);

  const afterCount = data.characters.length;
  const stillMissing = inventory.missingIds.filter((id) => !byId.has(id) && !data.characters.some((c) => c.id === id));
  // refresh
  const finalIds = new Set(data.characters.map((c) => c.id));
  const stillMissingFinal = inventory.missingIds.filter((id) => !finalIds.has(id));

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    beforeCount,
    afterCount,
    targetCount: 2130,
    recoveredCount: afterCount - beforeCount,
    missingInventoryCount: inventory.missingIds.length,
    stillMissingCount: stillMissingFinal.length,
    stillMissingSample: stillMissingFinal.slice(0, 50),
    sourcesUsed,
    wikiResolved: resolved.size,
    difficultyUpdates,
    difficultyChangedIds: inventory.difficultyById.size,
    imageStemCount: inventory.imageStemCount,
    batchUniqueIds: inventory.batchUniqueIds,
    failures: failures.slice(0, 500),
    failureCount: failures.length,
    sourceBreakdown: {
      imageOnly: inventory.missingIds.filter((id) => (inventory.sources[id] || []).includes("image") && !(inventory.sources[id] || []).includes("batch")).length,
      batchOnly: inventory.missingIds.filter((id) => (inventory.sources[id] || []).includes("batch") && !(inventory.sources[id] || []).includes("image")).length,
      both: inventory.missingIds.filter((id) => (inventory.sources[id] || []).includes("image") && (inventory.sources[id] || []).includes("batch")).length,
    },
    backupPath: "data/marvel-cineverse.pre-rebuild.json",
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error("Écrit:", CINEVERSE_PATH, "total", afterCount);
  console.error("Rapport:", REPORT_PATH);
  console.error(
    `Récupérés: ${report.recoveredCount} | wiki: ${sourcesUsed.wiki} | stubs: ${sourcesUsed.stub} | cache: ${sourcesUsed.cache} | difficulty updates: ${difficultyUpdates}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
