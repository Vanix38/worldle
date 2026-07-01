/**
 * Pour chaque ligne de data/one-piece-wiki-fixed.csv : fetch infobox portable du wiki FR
 * (https://onepiece.fandom.com/fr), fusionne les champs en colonnes fr_wiki_<data-source>.
 *
 * Usage:
 *   node scripts/merge-fr-wiki-infobox-to-csv.mjs [--limit N] [--delay MS] [--resume]
 *
 * --resume : ne re-fetch pas si fr_wiki_match_status === ok et fr_wiki_page_title non vide
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CSV_PATH = path.join(ROOT, "data", "one-piece-wiki-fixed.csv");
const JSON_PATH = path.join(ROOT, "data", "one-piece-anime.json");
const OVERRIDES_PATH = path.join(ROOT, "data", "one-piece-wiki-overrides.json");
const FR_API = "https://onepiece.fandom.com/fr/api.php";

const META_COLS = ["fr_wiki_page_title", "fr_wiki_image_url", "fr_wiki_match_status", "fr_wiki_match_via"];

/** Clé colonne CSV à partir du data-source infobox (espaces → _) */
function frWikiColumnKey(dataSourceKey) {
  return `fr_wiki_${String(dataSourceKey).trim().replace(/\s+/g, "_")}`;
}

function parseArgs(argv) {
  let limit = Infinity;
  let delay = 400;
  let resume = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--delay") delay = Math.max(0, parseInt(argv[++i], 10) || 400);
    else if (a === "--resume") resume = true;
  }
  return { limit, delay, resume };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(params) {
  const u = new URL(FR_API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": "worldle-onepiece-fr-merge/1.0 (educational)" } });
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

function loadOverrides(p) {
  if (!fs.existsSync(p)) return {};
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

function loadCharactersById(inPath) {
  const j = JSON.parse(fs.readFileSync(inPath, "utf8"));
  const map = new Map();
  for (const c of j.characters || []) map.set(c.id, c);
  return map;
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

async function fetchInfoboxForChar(char, delay, override, noSearchFallback = false) {
  const candidates = buildWikiTitleCandidates(char, override);
  for (const cand of candidates) {
    const got = await fetchPageHtml(cand);
    await sleep(delay);
    if (!got) continue;
    const ib = parseInfobox(got.html);
    if (!ib) continue;
    return { ...ib, resolvedTitle: got.resolvedTitle, triedTitle: cand, via: "candidate" };
  }
  if (noSearchFallback) return null;
  const queries = [char.name, ...(Array.isArray(char.aliases) ? char.aliases : [])].filter(Boolean);
  const tried = new Set(candidates.map((c) => c.toLowerCase()));
  for (const q of queries) {
    const hits = await searchTitles(q, 5);
    await sleep(delay);
    for (const h of hits) {
      const key = h.replace(/\s+/g, "_");
      if (tried.has(key.toLowerCase())) continue;
      tried.add(key.toLowerCase());
      const got = await fetchPageHtml(key);
      await sleep(delay);
      if (!got) continue;
      const ib = parseInfobox(got.html);
      if (!ib) continue;
      return { ...ib, resolvedTitle: got.resolvedTitle, triedTitle: key, via: `search:${q}` };
    }
  }
  return null;
}

function parseLine(line) {
  const o = [];
  let c = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const x = line[i];
    if (q) {
      if (x === '"' && line[i + 1] === '"') {
        c += '"';
        i++;
      } else if (x === '"') q = false;
      else c += x;
    } else {
      if (x === '"') q = true;
      else if (x === ";") {
        o.push(c);
        c = "";
      } else c += x;
    }
  }
  o.push(c);
  return o;
}

function csvEscapeField(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[,;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function stripFrWikiColumns(headers) {
  return headers.filter((h) => !h.startsWith("fr_wiki_"));
}

function rowHasFrResume(rowObj) {
  return rowObj.fr_wiki_match_status === "ok" && String(rowObj.fr_wiki_page_title ?? "").trim() !== "";
}

function collectUnionDataKeys(rows) {
  const u = new Set();
  for (const row of rows) {
    for (const h of Object.keys(row)) {
      if (h.startsWith("fr_wiki_") && !META_COLS.includes(h)) u.add(h.slice("fr_wiki_".length));
    }
  }
  return u;
}

async function main() {
  const opts = parseArgs(process.argv);
  const charMap = loadCharactersById(JSON_PATH);
  const overrides = loadOverrides(OVERRIDES_PATH);

  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
  const baseHeaders = stripFrWikiColumns(headers);

  const rows = [];
  for (let L = 1; L < lines.length; L++) {
    const cells = parseLine(lines[L]);
    const rowObj = {};
    headers.forEach((h, i) => {
      rowObj[h] = cells[i] ?? "";
    });
    rows.push(rowObj);
  }

  let unionDataKeys = collectUnionDataKeys(rows);

  const maxFetch = opts.limit === Infinity ? rows.length : Math.min(opts.limit, rows.length);

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const id = row.id;
    const char = charMap.get(id);

    const out = {};
    for (const h of baseHeaders) out[h] = row[h] ?? "";

    const shouldFetch = idx < maxFetch;

    if (shouldFetch && opts.resume && rowHasFrResume(row)) {
      for (const h of Object.keys(row)) {
        if (h.startsWith("fr_wiki_")) out[h] = row[h] ?? "";
      }
      rows[idx] = out;
      continue;
    }

    if (!shouldFetch) {
      for (const h of Object.keys(row)) {
        if (h.startsWith("fr_wiki_")) out[h] = row[h] ?? "";
      }
      rows[idx] = out;
      continue;
    }

    if (!char) {
      out.fr_wiki_page_title = "";
      out.fr_wiki_image_url = "";
      out.fr_wiki_match_status = "skip-no-json";
      out.fr_wiki_match_via = "";
      rows[idx] = out;
      continue;
    }

    const ov = overrides[id];
    if (ov === "") {
      out.fr_wiki_page_title = "";
      out.fr_wiki_image_url = "";
      out.fr_wiki_match_status = "skipped-override-empty";
      out.fr_wiki_match_via = "";
      rows[idx] = out;
      continue;
    }

    try {
      const got = await fetchInfoboxForChar(char, opts.delay, ov || null);
      if (!got) {
        out.fr_wiki_page_title = "";
        out.fr_wiki_image_url = "";
        out.fr_wiki_match_status = "not-found";
        out.fr_wiki_match_via = buildWikiTitleCandidates(char, ov || null).join(" | ");
      } else {
        out.fr_wiki_page_title = got.resolvedTitle || "";
        out.fr_wiki_image_url = got.imageUrl || "";
        out.fr_wiki_match_status = "ok";
        out.fr_wiki_match_via = `${got.via}:${got.triedTitle}`;
        for (const [k, v] of Object.entries(got.data)) {
          const col = frWikiColumnKey(k);
          unionDataKeys.add(col.slice("fr_wiki_".length));
          out[col] = v;
        }
      }
    } catch (e) {
      out.fr_wiki_page_title = "";
      out.fr_wiki_image_url = "";
      out.fr_wiki_match_status = `error:${e.message?.slice(0, 80) || "?"}`;
      out.fr_wiki_match_via = "";
    }

    rows[idx] = out;

    if ((idx + 1) % 25 === 0) console.log(`Progress ${idx + 1}/${rows.length}`);
  }

  unionDataKeys = collectUnionDataKeys(rows);
  for (const row of rows) {
    for (const slug of unionDataKeys) {
      const col = `fr_wiki_${slug}`;
      if (row[col] === undefined) row[col] = "";
    }
    for (const m of META_COLS) {
      if (row[m] === undefined) row[m] = "";
    }
  }

  const frDataColsSorted = [...unionDataKeys].sort((a, b) => a.localeCompare(b, "en")).map((k) => `fr_wiki_${k}`);
  const newHeaders = [...baseHeaders, ...META_COLS, ...frDataColsSorted];

  const outLines = [newHeaders.map((h) => csvEscapeField(h)).join(";")];
  for (const row of rows) {
    outLines.push(newHeaders.map((h) => csvEscapeField(row[h] ?? "")).join(";"));
  }
  fs.writeFileSync(CSV_PATH, outLines.join("\n") + "\n", "utf8");

  const ok = rows.filter((r) => r.fr_wiki_match_status === "ok").length;
  console.log("Wrote", CSV_PATH, "| rows:", rows.length, "| fr ok:", ok, "| fr_wiki data cols:", frDataColsSorted.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
