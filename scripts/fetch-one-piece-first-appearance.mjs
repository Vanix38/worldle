/**
 * Récupère chapitre + épisode de première apparition (wiki EN/FR Fandom)
 * et écrit firstAppearance dans data/one-piece-anime.json.
 *
 * Usage:
 *   node scripts/fetch-one-piece-first-appearance.mjs
 *   node scripts/fetch-one-piece-first-appearance.mjs --limit 5
 *   node scripts/fetch-one-piece-first-appearance.mjs --resume
 *   node scripts/fetch-one-piece-first-appearance.mjs --apply-only   # cache/CSV seulement
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import {
  SAGAS_PATH,
  buildGroupedOrder,
  getArcEpisodes,
  parsePremiereRaw,
  toEpisodeOnly,
} from "./one-piece-episode-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "data", "one-piece-anime.json");
const CSV_PATH = path.join(ROOT, "data", "one-piece-wiki-fixed.csv");
const CACHE_PATH = path.join(ROOT, "data", "one-piece-anime-first-appearance-cache.json");
const OVERRIDES_PATH = path.join(ROOT, "data", "one-piece-wiki-overrides.json");
const EN_API = "https://onepiece.fandom.com/api.php";
const FR_API = "https://onepiece.fandom.com/fr/api.php";

const VERIFIED_PREMIERES = new Map([
  ["spandam", "Épisode 249"],
  ["hiluluk", "Épisode 85"],
  ["stella", "Épisode 610"],
  ["kozuki-oden", "Épisode 910"],
  ["otohime", "Épisode 540"],
  ["bellemere", "Épisode 32"],
  ["don-quichotte-rossinante", "Épisode 700"],
  ["baggy", "Épisode 4"],
  ["bartolomeo", "Épisode 634"],
  ["black-maria", "Épisode 982"],
  ["brogy", "Épisode 71"],
  ["cabaji", "Épisode 7"],
  ["charlotte-brulee", "Épisode 791"],
  ["crocodile", "Épisode 76"],
  ["curly-dadan", "Épisode 493"],
  ["gecko-moria", "Épisode 343"],
  ["hack", "Épisode 633"],
  ["hina", "Épisode 127"],
  ["holdem", "Épisode 901"],
  ["ideo", "Épisode 633"],
  ["inuarashi", "Épisode 756"],
  ["kaidou", "Épisode 739"],
  ["karasu", "Épisode 510"],
  ["marguerite", "Épisode 408"],
  ["morgans", "Épisode 830"],
  ["nekomamushi", "Épisode 756"],
  ["nero", "Épisode 257"],
  ["perona", "Épisode 338"],
  ["sasaki", "Épisode 982"],
  ["smoker", "Épisode 48"],
  ["stussy", "Épisode 830"],
  ["ulti", "Épisode 982"],
  ["vinsmoke-reiju", "Épisode 784"],
  ["vista", "Épisode 0"],
  ["wanze", "Épisode 257"],
  ["who-s-who", "Épisode 985"],
  ["dracule-mihawk", "Épisode 23"],
  ["kawamatsu", "Épisode 910"],
  ["pandaman", "Épisode 16"],
  ["dugong", "Épisode 96"],
]);

function parseArgs(argv) {
  const out = { limit: Infinity, delay: 350, resume: false, applyOnly: false, onlyIds: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--resume") out.resume = true;
    else if (a === "--apply-only") out.applyOnly = true;
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
    else if (a === "--ids") out.onlyIds = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  } catch {
    return {};
  }
}

function parseCsvSemicolon(path) {
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ";") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = parseLine(lines[0]);
  const rows = new Map();
  const premiereIdx = header.indexOf("final_premiere");
  const idIdx = header.indexOf("id");
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    const id = row[idIdx];
    if (!id) continue;
    rows.set(id, premiereIdx >= 0 ? row[premiereIdx]?.trim() || "" : "");
  }
  return rows;
}

async function fetchJson(api, params) {
  const u = new URL(api);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": "worldle-onepiece-first/1.0 (educational)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchPageHtml(api, title) {
  try {
    const data = await fetchJson(api, {
      action: "parse",
      page: title,
      prop: "text",
      redirects: "1",
      format: "json",
    });
    if (data.error) return null;
    const html = data.parse?.text?.["*"] || "";
    if (!html) return null;
    return { html, resolvedTitle: data.parse?.title || title };
  } catch {
    return null;
  }
}

function parseInfoboxFields(html) {
  const $ = cheerio.load(html);
  const ib = $(".portable-infobox").first();
  if (!ib.length) return null;
  const data = {};
  ib.find("[data-source]").each((_, el) => {
    const key = $(el).attr("data-source");
    if (!key || data[key] !== undefined) return;
    const val = $(el).find(".pi-data-value").first().text().replace(/\s+/g, " ").trim();
    if (val) data[key] = val;
  });
  return data;
}

function buildWikiTitleCandidates(char, override) {
  const cands = [];
  if (override) cands.push(override);
  if (char.name) cands.push(char.name);
  if (Array.isArray(char.aliases)) for (const a of char.aliases) cands.push(a);
  const seen = new Set();
  const out = [];
  for (const c of cands) {
    const t = String(c).trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t.replace(/\s+/g, "_"));
  }
  return out;
}

async function searchTitles(api, query, limit = 5) {
  try {
    const data = await fetchJson(api, {
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: String(limit),
      format: "json",
    });
    return (data.query?.search || []).map((x) => x.title);
  } catch {
    return [];
  }
}

async function fetchPremiereSources(char, override, delay) {
  const candidates = buildWikiTitleCandidates(char, override);
  let enFirst = null;
  let frFirst = null;
  const meta = {};

  for (const cand of candidates) {
    const got = await fetchPageHtml(EN_API, cand);
    await sleep(delay);
    if (!got) continue;
    const fields = parseInfoboxFields(got.html);
    if (fields?.first) {
      enFirst = fields.first;
      meta.enTitle = got.resolvedTitle;
      break;
    }
  }

  for (const cand of candidates) {
    const frPage = cand.replace(/_/g, " ");
    const got = await fetchPageHtml(FR_API, frPage);
    await sleep(delay);
    if (!got) continue;
    const fields = parseInfoboxFields(got.html);
    const fr = fields?.première || fields?.premiere;
    if (fr) {
      frFirst = fr;
      meta.frTitle = got.resolvedTitle;
      break;
    }
  }

  if (enFirst || frFirst) return { enFirst, frFirst, ...meta, via: "infobox" };

  for (const q of [char.name, ...(char.aliases || [])].filter(Boolean)) {
    for (const [api, isFr] of [
      [EN_API, false],
      [FR_API, true],
    ]) {
      const hits = await searchTitles(api, q, 5);
      await sleep(delay);
      for (const h of hits) {
        const page = isFr ? h : h.replace(/\s+/g, "_");
        const got = await fetchPageHtml(api, page);
        await sleep(delay);
        if (!got) continue;
        const fields = parseInfoboxFields(got.html);
        const en = fields?.first;
        const fr = fields?.première || fields?.premiere;
        if (en) enFirst = enFirst || en;
        if (fr) frFirst = frFirst || fr;
        if (en || fr) {
          return { enFirst, frFirst, resolvedTitle: got.resolvedTitle, via: `search:${isFr ? "fr" : "en"}` };
        }
      }
    }
  }

  return null;
}

function resolvePremiere(id, enFirst, frFirst, csvPremiere) {
  if (VERIFIED_PREMIERES.has(id)) return VERIFIED_PREMIERES.get(id);
  const fromWiki = parsePremiereRaw(frFirst) || parsePremiereRaw(enFirst);
  if (fromWiki) return fromWiki;
  const fromCsv = parsePremiereRaw(csvPremiere) || (csvPremiere && csvPremiere !== "Inconnu" ? csvPremiere : null);
  return fromCsv || null;
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

async function main() {
  const opts = parseArgs(process.argv);
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  let characters = data.characters;
  if (opts.onlyIds) {
    const set = new Set(opts.onlyIds);
    characters = characters.filter((c) => set.has(c.id));
  }
  if (Number.isFinite(opts.limit)) characters = characters.slice(0, opts.limit);

  const overrides = loadOverrides();
  const csvPremieres = fs.existsSync(CSV_PATH) ? parseCsvSemicolon(CSV_PATH) : new Map();
  const cache = opts.resume ? loadCache() : {};

  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  if (!opts.applyOnly) {
    for (const char of characters) {
      if (opts.resume && cache[char.id]?.firstAppearance) {
        skipped++;
        continue;
      }

      let enFirst = null;
      let frFirst = null;
      let meta = {};

      const wiki = await fetchPremiereSources(char, overrides[char.id], opts.delay);
      if (wiki) {
        enFirst = wiki.enFirst;
        frFirst = wiki.frFirst;
        meta = { resolvedTitle: wiki.resolvedTitle, via: wiki.via };
        fetched++;
      } else {
        failed++;
      }

      const premiere = resolvePremiere(
        char.id,
        enFirst,
        frFirst,
        csvPremieres.get(char.id),
      );

      cache[char.id] = {
        name: char.name,
        enFirst,
        frFirst,
        firstAppearance: premiere,
        ...meta,
      };

      if (characters.indexOf(char) % 10 === 9) {
        saveCache(cache);
        console.log(`… cache ${Object.keys(cache).length} entrées`);
      }
    }
    saveCache(cache);
    console.log(`Wiki: fetched=${fetched}, skipped=${skipped}, failed=${failed}`);
  }

  const fullCache = { ...loadCache(), ...cache };
  let applied = 0;
  let missing = [];

  for (const char of data.characters) {
    const entry = fullCache[char.id];
    const premiere =
      entry?.firstAppearance ||
      resolvePremiere(char.id, entry?.enFirst, entry?.frFirst, csvPremieres.get(char.id));

    if (premiere) {
      char.firstAppearance = toEpisodeOnly(premiere) || premiere;
      applied++;
    } else {
      delete char.firstAppearance;
      missing.push(char.id);
    }
  }

  const sagas = JSON.parse(fs.readFileSync(SAGAS_PATH, "utf8"));
  const flatArcs = Object.values(sagas).flat();
  const arcEpisodes = await getArcEpisodes();

  data.fieldMapping.arc.order = Object.fromEntries(
    Object.entries(sagas).map(([saga, arcs]) => [saga, arcs.filter((a) => flatArcs.includes(a))]),
  );

  data.fieldMapping.firstAppearance = {
    header: "Épisode",
    fonction: "Comparaison",
    order: buildGroupedOrder(data.characters, sagas, arcEpisodes),
    description:
      "Premier épisode anime de première apparition. La sélection anti-spoiler se fait par saga, arc ou épisode.",
  };

  const n = data.characters.length;
  data.fieldPrevalence = data.fieldPrevalence || {};
  data.fieldPrevalence.firstAppearance = applied / n;

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  console.log(`Applied firstAppearance: ${applied}/${n}`);
  if (missing.length) console.log("Sans donnée:", missing.join(", "));
  console.log("Wrote", JSON_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
