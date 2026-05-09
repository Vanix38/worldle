/**
 * Scrape onepiece.fandom.com (EN) — portable-infobox de chaque perso de data/one-piece.json → CSV.
 *
 *   --discover                 : extrait les fiches de 3 persos (Luffy/Zoro/Nami) → discovered-one-piece-fields.json
 *   (par défaut)               : pour chaque perso de data/one-piece.json, fetch HTML rendu, parse portable-infobox → CSV
 *
 * Options :
 *   --limit N        : limiter à N persos (debug)
 *   --delay MS       : délai inter-requêtes (def 350)
 *   --in PATH        : data/one-piece.json par défaut
 *   --out PATH       : data/one-piece-wiki.csv par défaut
 *   --resume         : si CSV existe, ne re-fetch pas les ids déjà présents
 *   --names a,b,c    : forcer un sous-ensemble par id local (debug rapide)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_IN = path.join(ROOT, "data", "one-piece.json");
const DEFAULT_OUT = path.join(ROOT, "data", "one-piece-wiki.csv");
const DEFAULT_OVERRIDES = path.join(ROOT, "data", "one-piece-wiki-overrides.json");
const DISCOVER_OUT = path.join(__dirname, "discovered-one-piece-fields.json");
const API = "https://onepiece.fandom.com/api.php";

const DISCOVER_PAGES = ["Monkey_D._Luffy", "Roronoa_Zoro", "Nami"];

function parseArgs(argv) {
  const out = {
    discover: false,
    limit: Infinity,
    delay: 350,
    inPath: DEFAULT_IN,
    outPath: DEFAULT_OUT,
    overridesPath: DEFAULT_OVERRIDES,
    resume: false,
    onlyIds: null,
    noSearchFallback: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--discover") out.discover = true;
    else if (a === "--resume") out.resume = true;
    else if (a === "--no-search-fallback") out.noSearchFallback = true;
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
    else if (a === "--in") out.inPath = argv[++i] || DEFAULT_IN;
    else if (a === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
    else if (a === "--overrides") out.overridesPath = argv[++i] || DEFAULT_OVERRIDES;
    else if (a === "--names") out.onlyIds = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

function loadOverrides(p) {
  if (!p || !fs.existsSync(p)) return {};
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const out = {};
    for (const [k, v] of Object.entries(j)) {
      if (k.startsWith("_")) continue;
      out[k] = String(v ?? "");
    }
    return out;
  } catch {
    return {};
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": "worldle-onepiece-scraper/1.0 (educational)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

async function fetchPageHtml(title) {
  try {
    const data = await fetchJson({
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

async function searchTitles(query, limit = 5) {
  try {
    const data = await fetchJson({
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

/** Nettoyage : retire [n] (refs), "[ v · e ]" (vue/édition), ‎\u200e, espaces multiples. */
function cleanValue(s) {
  if (!s) return "";
  let t = String(s);
  t = t.replace(/\[\s*v\s*·\s*e\s*\]/gi, "");
  t = t.replace(/\[\d+\]/g, "");
  t = t.replace(/\u200e/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function parseInfobox(html) {
  const $ = cheerio.load(html);
  const ib = $(".portable-infobox").first();
  if (!ib.length) return null;
  const data = {};
  ib.find("[data-source]").each((_, el) => {
    const key = $(el).attr("data-source");
    if (!key) return;
    if (data[key] !== undefined) return;
    const valNode = $(el).find(".pi-data-value").first();
    const targetNode = valNode.length ? valNode : $(el);
    const text = cleanValue(targetNode.text());
    if (text) data[key] = text;
  });
  let imageUrl = "";
  const imgEl = ib.find("figure.pi-image img").first();
  if (imgEl.length) {
    const src = imgEl.attr("src") || imgEl.attr("data-src") || "";
    imageUrl = String(src).split("?")[0] || "";
  }
  if (data.image) delete data.image;
  if (data.name) data.name = cleanValue(data.name).replace(/\s*\[\s*v\s*·\s*e\s*\]\s*$/i, "").trim();
  return { data, imageUrl };
}

function loadCharacters(inPath) {
  const raw = fs.readFileSync(inPath, "utf8");
  const j = JSON.parse(raw);
  if (!Array.isArray(j.characters)) throw new Error("Invalid input JSON: missing characters[]");
  return j.characters;
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

async function fetchInfoboxForChar(char, opts, override) {
  const candidates = buildWikiTitleCandidates(char, override);
  for (const cand of candidates) {
    const got = await fetchPageHtml(cand);
    await sleep(opts.delay);
    if (!got) continue;
    const ib = parseInfobox(got.html);
    if (!ib) continue;
    return { ...ib, resolvedTitle: got.resolvedTitle, triedTitle: cand, via: "candidate" };
  }
  if (opts.noSearchFallback) return null;
  const queries = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])].filter(Boolean);
  const tried = new Set(candidates.map((c) => c.toLowerCase()));
  for (const q of queries) {
    const hits = await searchTitles(q, 5);
    await sleep(opts.delay);
    for (const h of hits) {
      const key = h.replace(/\s+/g, "_");
      if (tried.has(key.toLowerCase())) continue;
      tried.add(key.toLowerCase());
      const got = await fetchPageHtml(key);
      await sleep(opts.delay);
      if (!got) continue;
      const ib = parseInfobox(got.html);
      if (!ib) continue;
      return { ...ib, resolvedTitle: got.resolvedTitle, triedTitle: key, via: `search:${q}` };
    }
  }
  return null;
}

async function discover(opts) {
  const perPage = {};
  const union = new Set();
  for (const page of DISCOVER_PAGES) {
    const got = await fetchPageHtml(page);
    await sleep(opts.delay);
    if (!got) {
      console.warn("[discover] no html for", page);
      continue;
    }
    const ib = parseInfobox(got.html);
    if (!ib) {
      console.warn("[discover] no infobox for", page);
      continue;
    }
    perPage[page] = {
      resolvedTitle: got.resolvedTitle,
      imageUrl: ib.imageUrl,
      keys: Object.keys(ib.data),
      sample: ib.data,
    };
    Object.keys(ib.data).forEach((k) => union.add(k));
  }
  const payload = {
    samplePages: DISCOVER_PAGES,
    unionKeysSorted: [...union].sort((a, b) => a.localeCompare(b, "en")),
    keysPerPage: perPage,
  };
  fs.writeFileSync(DISCOVER_OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log("Wrote", DISCOVER_OUT, "| union keys:", payload.unionKeysSorted.length);
  for (const p of DISCOVER_PAGES) {
    const e = perPage[p];
    if (!e) continue;
    console.log(`\n=== ${p} → ${e.resolvedTitle} ===`);
    console.log("image:", e.imageUrl);
    for (const k of e.keys) console.log(" ", k, "=", e.sample[k].slice(0, 220));
  }
}

function csvEscape(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(outPath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function loadResumeRows(outPath) {
  if (!fs.existsSync(outPath)) return { rows: [], idsDone: new Set() };
  const raw = fs.readFileSync(outPath, "utf8").split(/\r?\n/);
  if (!raw.length || !raw[0]) return { rows: [], idsDone: new Set() };
  const headers = parseCsvLine(raw[0]);
  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    if (!raw[i]) continue;
    const vals = parseCsvLine(raw[i]);
    const o = {};
    headers.forEach((h, idx) => (o[h] = vals[idx] ?? ""));
    rows.push(o);
  }
  return { rows, idsDone: new Set(rows.map((r) => r.id).filter(Boolean)) };
}

const FIXED_COLS = [
  "id",
  "local_name",
  "wiki_resolved_title",
  "wiki_match_status",
  "wiki_match_via",
  "wiki_tried_title",
  "wiki_image_url",
];

function flushCsv(outPath, rows, wikiKeysUnion) {
  const wikiCols = [...wikiKeysUnion].filter((k) => !FIXED_COLS.includes(k)).sort((a, b) => a.localeCompare(b, "en"));
  const headers = [...FIXED_COLS, ...wikiCols];
  writeCsv(outPath, headers, rows);
}

async function buildCsv(opts) {
  let characters = loadCharacters(opts.inPath);
  if (opts.onlyIds) {
    const set = new Set(opts.onlyIds);
    characters = characters.filter((c) => set.has(c.id));
  }
  const subset = Number.isFinite(opts.limit) ? characters.slice(0, opts.limit) : characters;

  const overrides = loadOverrides(opts.overridesPath);
  console.log("Overrides:", Object.keys(overrides).length, "ids");

  let resume = { rows: [], idsDone: new Set() };
  if (opts.resume) {
    resume = loadResumeRows(opts.outPath);
    console.log("Resume:", resume.idsDone.size, "rows already in CSV");
  }

  const wikiKeysUnion = new Set();
  const collected = [];
  for (const r of resume.rows) {
    collected.push(r);
    for (const k of Object.keys(r)) wikiKeysUnion.add(k);
  }

  let ok = 0;
  let fail = 0;
  for (let idx = 0; idx < subset.length; idx++) {
    const c = subset[idx];
    if (resume.idsDone.has(c.id)) continue;
    try {
      const ov = overrides[c.id];
      if (ov === "") {
        fail++;
        console.warn("[skip-override-empty]", c.id, "-", c.name);
        collected.push({
          id: c.id,
          local_name: c.name,
          wiki_resolved_title: "",
          wiki_match_status: "skipped-override",
          wiki_match_via: "override:empty",
          wiki_tried_title: "",
          wiki_image_url: "",
        });
        continue;
      }
      const got = await fetchInfoboxForChar(c, opts, ov || null);
      if (!got) {
        fail++;
        console.warn("[no-infobox]", c.id, "-", c.name);
        collected.push({
          id: c.id,
          local_name: c.name,
          wiki_resolved_title: "",
          wiki_match_status: "not-found",
          wiki_match_via: "",
          wiki_tried_title: buildWikiTitleCandidates(c, ov || null).join(" | "),
          wiki_image_url: "",
        });
        continue;
      }
      const row = {
        id: c.id,
        local_name: c.name,
        wiki_resolved_title: got.resolvedTitle,
        wiki_match_status: "ok",
        wiki_match_via: got.via || "",
        wiki_tried_title: got.triedTitle,
        wiki_image_url: got.imageUrl || "",
      };
      for (const [k, v] of Object.entries(got.data)) {
        const key = `wiki_${k}`;
        wikiKeysUnion.add(key);
        row[key] = v;
      }
      collected.push(row);
      ok++;
    } catch (e) {
      fail++;
      console.warn("[err]", c.id, e.message);
      await sleep(opts.delay * 2);
    }
    if ((idx + 1) % 25 === 0) {
      console.log(`Progress ${idx + 1}/${subset.length} ok=${ok} fail=${fail}`);
      flushCsv(opts.outPath, collected, wikiKeysUnion);
    }
  }
  flushCsv(opts.outPath, collected, wikiKeysUnion);
  console.log("Wrote", opts.outPath, "| rows:", collected.length, "| ok:", ok, "| fail:", fail);
}

const opts = parseArgs(process.argv);
if (opts.discover) {
  discover(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  buildCsv(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
