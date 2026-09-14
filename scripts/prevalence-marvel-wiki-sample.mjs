/**
 * Prévalence des champs sur un échantillon de 20 personnages wiki
 * absents de marvel-cineverse.json, pour chaque source (universe/earth).
 * Même filtre que l'extract : hint1, species, gender, firstAppearance, hint3 obligatoires.
 *
 * Usage:
 *   node scripts/prevalence-marvel-wiki-sample.mjs [--sample 20] [--delay 250]
 *   node scripts/prevalence-marvel-wiki-sample.mjs --only-universe SSU
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveHint1, shouldUseMcuFallback } from "./marvel-wiki-actor.mjs";
import { buildAppearanceResolver, normKey as appearanceNormKey } from "./marvel-cineverse-appearance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "marvel-cineverse-wiki-prevalence-sample.json");

// Reuse constants/helpers by importing the add script is awkward (runs main).
// Inline minimal copy of WIKI_SOURCES + fetch/parse from add script via dynamic import of functions —
// instead duplicate the thin parts and shell out logic here.

const API = "https://marvel.fandom.com/api.php";
const UA = "worlddle-marvel-prevalence/1.0";

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

const FIELDS = [
  "name",
  "status",
  "aliases",
  "species",
  "gender",
  "affiliation",
  "firstAppearance",
  "hint1",
  "hint2",
  "hint3",
  "role",
  "abilities",
];

const SKIP_TITLE_RE =
  /\/(Gallery|Quotes)|Characters$/i;

function parseArgv(argv) {
  const out = { sample: 20, delay: 250, onlyUniverse: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sample") out.sample = Math.max(1, parseInt(argv[++i], 10) || 20);
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 250);
    else if (a === "--only-universe") out.onlyUniverse = String(argv[++i] || "").trim();
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function normKey(s) {
  return appearanceNormKey(s);
}

function wikiTitleBase(title) {
  return String(title || "").replace(/\s*\(Earth-[^)]+\)\s*$/i, "").trim();
}

async function categoryTitles(cmtitle, delay) {
  const titles = [];
  let cmcontinue;
  let cont;
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
    if (cont) q.continue = cont;
    const data = await apiGet(q);
    for (const m of data.query?.categorymembers ?? []) {
      if (m.ns === 0 && m.title) titles.push(m.title);
    }
    if (!data.continue?.cmcontinue) break;
    cmcontinue = data.continue.cmcontinue;
    cont = data.continue.continue;
    await sleep(delay);
  }
  return titles;
}

function extractInfoboxInner(wikitext) {
  const marker = "{{Marvel Database:Character Template";
  let pos = wikitext.indexOf(marker);
  let markerLen = marker.length;
  if (pos === -1) {
    pos = wikitext.indexOf("{{Character Template");
    markerLen = "{{Character Template".length;
    if (pos === -1) return null;
  }
  let i = pos + 2;
  let depth = 1;
  while (i < wikitext.length && depth > 0) {
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

function cleanWikiText(s) {
  if (!s) return "";
  return String(s)
    .replace(/<ref[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{m\|[^|}]+\|([^}]+)\}\}/gi, "$1")
    .replace(/'''|''/g, "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\*+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitList(raw) {
  if (!raw) return [];
  return String(raw)
    .replace(/\{\{m\|[^|}]+\|([^}]+)\}\}/gi, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .split(/\n|\*|•|;|,|\bFormerly:\b/i)
    .map((x) => cleanWikiText(x).replace(/\s*\([^)]*\)\s*$/g, "").trim())
    .filter((x) => x && x.length > 1);
}

function mapGender(raw) {
  const t = cleanWikiText(raw).toLowerCase();
  if (/\bfemale\b/.test(t)) return "Femme";
  if (/\bmale\b/.test(t)) return "Homme";
  return "";
}

function mapStatus(params) {
  if (cleanWikiText(params.Death || params.PlaceOfDeath || params.CauseOfDeath || "")) return "Décédé";
  if (cleanWikiText(params.First || "")) return "En Vie";
  return "Inconnu";
}

function mapSpecies(originRaw) {
  const raw = cleanWikiText(originRaw);
  if (!raw) return "";
  if (/human/i.test(originRaw || "") || /human/i.test(raw)) return "Humain";
  if (/mutant/i.test(raw)) return "Mutant";
  if (/symbiote/i.test(raw)) return "Symbiote";
  return raw.split(/[,;/]/)[0].trim().slice(0, 60);
}

async function buildChar(params, wikiTitle, resolveAppearance, wikitext, wikiEarth, delayMs) {
  const name = wikiTitleBase(wikiTitle) || cleanWikiText(params.Name || "");
  const aliases = [];
  const add = (v) => {
    const t = cleanWikiText(v);
    if (t && normKey(t) !== normKey(name) && !aliases.includes(t)) aliases.push(t);
  };
  add(params.CurrentAlias);
  for (const x of splitList(params.Aliases || "")) add(x);
  const appearance = resolveAppearance(params.First || "");
  const first = appearance.label || appearance.cleaned || "";
  const hint2 = appearance.year || "";
  const aff = splitList(params.Affiliation || "")[0] || "";
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
    name: name || "",
    status: mapStatus(params),
    aliases,
    species: mapSpecies(params.Origin || ""),
    gender: mapGender(params.Gender || ""),
    affiliation: aff,
    firstAppearance: first,
    hint1,
    hint2,
    hint3: first || "",
    role: "",
    abilities: [],
  };
}

function isFilled(char, field) {
  const v = char[field];
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return v != null && v !== "";
}

function buildIndex(characters) {
  const map = new Map();
  for (const c of characters) {
    const key = `${c.universe}\0${c.earth}`;
    if (!map.has(key)) map.set(key, new Set());
    const set = map.get(key);
    set.add(normKey(c.name));
    for (const a of c.aliases || []) set.add(normKey(a));
  }
  return map;
}

function alreadyHave(index, universe, earth, title) {
  const set = index.get(`${universe}\0${earth}`);
  if (!set) return false;
  return set.has(normKey(wikiTitleBase(title)));
}

async function fetchWikitext(title) {
  const data = await apiGet({
    action: "parse",
    format: "json",
    page: title,
    prop: "wikitext",
    redirects: "1",
  });
  if (data.error) return null;
  return data.parse?.wikitext?.["*"] || null;
}

async function main() {
  const opts = parseArgv(process.argv);
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "marvel-cineverse.json"), "utf8"));
  const { resolve: resolveAppearance } = buildAppearanceResolver(data.fieldMapping?.firstAppearance || {});
  const index = buildIndex(data.characters);
  const sources = WIKI_SOURCES.filter((s) => !opts.onlyUniverse || s.universe === opts.onlyUniverse);

  const results = [];
  const globalCounts = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  let globalN = 0;

  for (const src of sources) {
    const cmtitle = `Category:Earth-${src.wikiEarth}/Characters`;
    process.stderr.write(`\n${src.universe} / ${src.earth} → ${cmtitle}\n`);
    let titles = [];
    try {
      titles = await categoryTitles(cmtitle, opts.delay);
    } catch (e) {
      results.push({
        universe: src.universe,
        earth: src.earth,
        wikiEarth: src.wikiEarth,
        error: String(e.message || e),
        sampleSize: 0,
        wikiTotal: 0,
        missingApprox: 0,
        prevalence: {},
      });
      continue;
    }
    const filtered = titles.filter((t) => !SKIP_TITLE_RE.test(t) && !t.includes("/"));
    const missing = filtered.filter((t) => !alreadyHave(index, src.universe, src.earth, t));
    // Parcourir jusqu'à `sample` avec hint1 + species + gender + firstAppearance + hint3
    const maxScan = Math.min(missing.length, Math.max(opts.sample * 8, opts.sample + 40));
    process.stderr.write(
      `  wiki=${filtered.length} missing≈${missing.length} scan≤${maxScan} → cible ${opts.sample} (champs obligatoires)\n`,
    );

    const chars = [];
    const usedTitles = [];
    let scanned = 0;
    for (let i = 0; i < maxScan && chars.length < opts.sample; i++) {
      const title = missing[i];
      scanned++;
      process.stderr.write(`  [${chars.length}/${opts.sample}] scan ${scanned} ${title.slice(0, 45)}\n`);
      try {
        const wt = await fetchWikitext(title);
        await sleep(opts.delay);
        if (!wt) continue;
        const inner = extractInfoboxInner(wt);
        if (!inner) continue;
        const params = parseInfoboxParams(inner);
        const char = await buildChar(params, title, resolveAppearance, wt, src.wikiEarth, opts.delay);
        if (!String(char.hint1 || "").trim()) continue;
        if (!String(char.species || "").trim()) continue;
        if (!String(char.gender || "").trim()) continue;
        if (!String(char.firstAppearance || "").trim()) continue;
        if (!String(char.hint3 || "").trim()) continue;
        chars.push(char);
        usedTitles.push(title);
      } catch {
        // skip
      }
    }

    const prevalence = {};
    for (const f of FIELDS) {
      const filled = chars.filter((c) => isFilled(c, f)).length;
      prevalence[f] = {
        filled,
        total: chars.length,
        pct: chars.length ? Math.round((1000 * filled) / chars.length) / 10 : 0,
      };
      globalCounts[f] += filled;
    }
    globalN += chars.length;

    results.push({
      universe: src.universe,
      earth: src.earth,
      wikiEarth: src.wikiEarth,
      wikiTotal: filtered.length,
      missingApprox: missing.length,
      sampleSize: chars.length,
      sampleTitles: usedTitles,
      scannedForSample: scanned,
      prevalence,
    });
  }

  const global = {};
  for (const f of FIELDS) {
    global[f] = {
      filled: globalCounts[f],
      total: globalN,
      pct: globalN ? Math.round((1000 * globalCounts[f]) / globalN) / 10 : 0,
    };
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    samplePerWiki: opts.sample,
    sourcesAnalyzed: results.length,
    charactersSampled: globalN,
    globalPrevalence: global,
    bySource: results,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log("\n=== Prévalence globale (% champs non vides) ===");
  for (const f of FIELDS) {
    console.log(`${f.padEnd(18)} ${String(global[f].pct).padStart(5)}%  (${global[f].filled}/${global[f].total})`);
  }
  console.log("\nPar wiki:");
  for (const r of results) {
    if (r.error) {
      console.log(`${r.universe}/${r.earth}: ERREUR ${r.error}`);
      continue;
    }
    const top = FIELDS.filter((f) => r.prevalence[f]?.pct >= 50)
      .map((f) => `${f}:${r.prevalence[f].pct}%`)
      .join(", ");
    console.log(
      `${r.universe}/${r.earth} (n=${r.sampleSize}/${r.missingApprox} manquants): ${top || "peu de champs"}`,
    );
  }
  console.error("\nÉcrit:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
