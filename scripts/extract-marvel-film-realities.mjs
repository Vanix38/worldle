/**
 * Liste les réalités Marvel « ciné » depuis marvel.fandom.com.
 * 1) API MediaWiki : membres de Category:Realities (+ option sous-catégories Earth-* Diverged).
 * 2) API parse prop=wikitext pour chaque page Earth-*.
 * 3) Si pas de modèle : parse prop=text + cheerio (infobox / corps).
 *
 * Enrichit avec le mapping (earth → univers) depuis data/marvel-cineverse.json.
 *
 * Usage:
 *   node scripts/extract-marvel-film-realities.mjs [--out path] [--delay 400] [--limit N]
 *   [--cineverse path] [--min-score 3] [--include-all-earth] [--subcats-diverged]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const API = "https://marvel.fandom.com/api.php";
const ROOT_CATEGORY = "Category:Realities";
const UA = "worlddle-extract-marvel-realities/1.0 (local script; contact: repo maintainer)";

function argVal(name, def) {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return def;
  return process.argv[i + 1];
}
function hasFlag(name) {
  return process.argv.includes(name);
}

const OUT = path.resolve(argVal("--out", path.join(ROOT, "data", "marvel-film-realities.json")));
const DELAY_MS = parseInt(argVal("--delay", "400"), 10) || 400;
const LIMIT = argVal("--limit", "") ? parseInt(argVal("--limit", "0"), 10) : 0;
const CINEVERSE_PATH = path.resolve(argVal("--cineverse", path.join(ROOT, "data", "marvel-cineverse.json")));
const MIN_SCORE = parseFloat(argVal("--min-score", "3")) || 3;
const INCLUDE_ALL_EARTH = hasFlag("--include-all-earth");
const SUBCATS_DIVERGED = hasFlag("--subcats-diverged");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiGet(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

/** Tous les membres `page` d’une catégorie (pagination cmcontinue). */
async function categoryMemberTitles(cmtitle, { cmtype = "page" } = {}) {
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
      cmtype,
    };
    if (cmcontinue) q.cmcontinue = cmcontinue;
    if (continueToken) q.continue = continueToken;
    const data = await apiGet(q);
    const batch = data.query?.categorymembers ?? [];
    for (const m of batch) {
      if (m.ns === 0 && m.title) titles.push(m.title);
    }
    if (!data.continue?.cmcontinue) break;
    cmcontinue = data.continue.cmcontinue;
    continueToken = data.continue.continue;
    await sleep(DELAY_MS);
  }
  return titles;
}

/** Sous-catégories directes. */
async function categorySubcatTitles(cmtitle) {
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
      cmtype: "subcat",
    };
    if (cmcontinue) q.cmcontinue = cmcontinue;
    if (continueToken) q.continue = continueToken;
    const data = await apiGet(q);
    const batch = data.query?.categorymembers ?? [];
    for (const m of batch) {
      if (m.title) titles.push(m.title);
    }
    if (!data.continue?.cmcontinue) break;
    cmcontinue = data.continue.cmcontinue;
    continueToken = data.continue.continue;
    await sleep(DELAY_MS);
  }
  return titles;
}

function isEarthArticleTitle(title) {
  if (!title || title.includes("/")) return false;
  return /^Earth-/i.test(title);
}

function sliceFirstTemplate(wiktext, templateStart) {
  const needle = "{{" + templateStart;
  const start = wiktext.indexOf(needle);
  if (start === -1) return null;
  let i = start + 2;
  let depth = 1;
  while (i < wiktext.length - 1 && depth > 0) {
    if (wiktext[i] === "{" && wiktext[i + 1] === "{") {
      depth++;
      i += 2;
      continue;
    }
    if (wiktext[i] === "}" && wiktext[i + 1] === "}") {
      depth--;
      i += 2;
      continue;
    }
    i++;
  }
  return wiktext.slice(start, i);
}

/** Champ multiligne du modèle Reality (jusqu’au prochain `| Clé =`). */
function extractTemplateFieldRaw(wiktext, field) {
  const re = new RegExp(
    `\\|\\s*${field}\\s*=\\s*([\\s\\S]*?)(?=\\n\\|\\s*[A-Za-z][a-zA-Z0-9 ]*\\s*=)`,
    "m",
  );
  const m = wiktext.match(re);
  if (!m) return null;
  return m[1].trim();
}

function wikiPlainSnippet(raw, maxLen) {
  if (!raw) return null;
  const t = raw
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/''+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.slice(0, maxLen || 500);
}

function parseRealityTemplateFields(wiktext) {
  const block =
    sliceFirstTemplate(wiktext, "Marvel Database:Reality Template") ||
    sliceFirstTemplate(wiktext, "Reality Template");
  if (!block) return null;
  const inner = block.replace(/^\{\{[^|\n]+/, "").replace(/\}\}\s*$/, "");
  const pairs = {};
  const parts = inner.split(/\n\|/);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key) pairs[key] = val;
  }
  return pairs;
}

const FILM_HINTS = [
  { re: /\(film\)/gi, w: 3, label: "(film)" },
  { re: /\bfilm series\b/i, w: 3, label: "film series" },
  { re: /\blive-action\b/i, w: 2, label: "live-action" },
  { re: /Marvel Cinematic Universe|MCU\b/i, w: 3, label: "MCU" },
  { re: /\{\{ml\|[^}]*film/i, w: 2, label: "{{ml|…film" },
  { re: /Sony Pictures|Columbia Pictures|20th Century Fox|Marvel Studios|New Line Cinema/i, w: 2, label: "studio" },
  { re: /Cinematic Universe/i, w: 2, label: "Cinematic Universe" },
  {
    re: /Into the Spider-Verse|Across the Spider-Verse|Spider-Man:\s*Into|Spider-Verse.*\(film\)/i,
    w: 2,
    label: "Spider-Verse film",
  },
];

const NON_FILM_HINTS = [
  { re: /\(novel\)|\(novelization\)/i, w: -1, label: "novel" },
];

function filmScoreFromText(text) {
  if (!text) return { score: 0, reasons: [] };
  let score = 0;
  const reasons = [];
  for (const h of FILM_HINTS) {
    const n = (text.match(h.re) || []).length;
    if (n > 0) {
      score += h.w * Math.min(n, 3);
      reasons.push(`${h.label}×${n}`);
    }
  }
  for (const h of NON_FILM_HINTS) {
    if (h.re.test(text)) {
      score += h.w;
      reasons.push(h.label);
    }
  }
  const titleField = text.match(/\|\s*Title\s*=\s*([^\n|]+)/i);
  if (titleField && /film/i.test(titleField[1])) {
    score += 2;
    reasons.push("Title=film");
  }
  return { score, reasons };
}

function normalizeEarthKey(earthNumberRaw, pageTitle) {
  if (earthNumberRaw != null && String(earthNumberRaw).trim() !== "") {
    const s = String(earthNumberRaw).trim();
    if (/^TRN\d+/i.test(s)) return s.toUpperCase();
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) return n;
    return s;
  }
  const m = pageTitle.match(/^Earth-(.+)$/i);
  if (!m) return null;
  const rest = m[1].trim();
  if (/^TRN\d+$/i.test(rest)) return rest.toUpperCase();
  const n = parseInt(rest, 10);
  if (!Number.isNaN(n)) return n;
  return rest;
}

async function fetchWikitext(title) {
  const data = await apiGet({
    action: "parse",
    format: "json",
    page: title,
    prop: "wikitext",
  });
  const w = data.parse?.wikitext?.["*"];
  return typeof w === "string" ? w : "";
}

async function fetchHtml(title) {
  const data = await apiGet({
    action: "parse",
    format: "json",
    page: title,
    prop: "text",
  });
  return data.parse?.text?.["*"] ?? "";
}

function scrapeInfoboxFallback(html) {
  const $ = cheerio.load(html);
  const aside = $("aside.portable-infobox").first();
  if (!aside.length) return { text: $("div.mw-parser-output").text().slice(0, 8000) };
  const lines = [];
  aside.find(".pi-data").each((_, el) => {
    const label = $(el).find(".pi-data-label").text().trim();
    const val = $(el).find(".pi-data-value").text().trim();
    if (label) lines.push(`${label}: ${val}`);
  });
  return { text: lines.join("\n"), infobox: true };
}

function buildCineverseEarthMap(json) {
  const map = new Map();
  for (const c of json.characters || []) {
    const e = c.earth;
    const u = c.univers;
    if (e == null || u == null) continue;
    if (!map.has(e)) map.set(e, new Set());
    map.get(e).add(u);
  }
  const out = {};
  for (const [k, set] of map) {
    out[String(k)] = [...set].sort();
  }
  return out;
}

async function main() {
  console.error("API: liste", ROOT_CATEGORY);
  const rootPages = await categoryMemberTitles(ROOT_CATEGORY, { cmtype: "page" });
  let titles = [...rootPages];

  if (SUBCATS_DIVERGED) {
    console.error("API: sous-catégories…");
    const subcats = await categorySubcatTitles(ROOT_CATEGORY);
    const diverged = subcats.filter((t) => /Category:Earth-\d+ Diverged Realities/i.test(t));
    console.error("  →", diverged.length, "Earth-* Diverged Realities");
    for (const st of diverged) {
      const ps = await categoryMemberTitles(st, { cmtype: "page" });
      titles.push(...ps);
      await sleep(DELAY_MS);
    }
  }

  titles = [...new Set(titles)].filter(isEarthArticleTitle);
  titles.sort((a, b) => a.localeCompare(b));
  if (LIMIT > 0) titles = titles.slice(0, LIMIT);

  let cineverseMap = {};
  if (fs.existsSync(CINEVERSE_PATH)) {
    const raw = JSON.parse(fs.readFileSync(CINEVERSE_PATH, "utf8"));
    cineverseMap = buildCineverseEarthMap(raw);
  }

  console.error("Pages Earth-*:", titles.length, "(traitement)");

  const realities = [];
  let i = 0;
  for (const title of titles) {
    i++;
    process.stderr.write(`\r  ${i}/${titles.length} ${title.slice(0, 50)}…   `);

    let wiktext = "";
    try {
      wiktext = await fetchWikitext(title);
    } catch (e) {
      realities.push({
        pageTitle: title,
        error: String(e.message || e),
      });
      await sleep(DELAY_MS);
      continue;
    }
    await sleep(DELAY_MS);

    let fields = parseRealityTemplateFields(wiktext);
    let textForScore = wiktext;
    let source = "wikitext";

    if (!fields || Object.keys(fields).length < 2) {
      try {
        const html = await fetchHtml(title);
        const fb = scrapeInfoboxFallback(html);
        textForScore = fb.text + "\n" + wiktext.slice(0, 4000);
        source = fb.infobox ? "html-infobox+wikitext" : "html-body+wikitext";
        await sleep(DELAY_MS);
      } catch {
        source = "wikitext-partial";
      }
    }

    const earthKey = normalizeEarthKey(fields?.EarthNumber, title);
    const displayTitle = fields?.Title || null;
    const overviewRaw =
      fields?.Overview ||
      extractTemplateFieldRaw(wiktext, "Overview") ||
      extractTemplateFieldRaw(wiktext, "History");
    const overview = overviewRaw ? wikiPlainSnippet(overviewRaw, 500) : null;
    const firstCanon = fields?.First || extractTemplateFieldRaw(wiktext, "First");
    const firstCanonShort = firstCanon ? wikiPlainSnippet(firstCanon, 200) : null;
    const aliases = fields?.Aliases || null;
    const { score, reasons } = filmScoreFromText(
      [wiktext, overview, displayTitle, aliases, textForScore].filter(Boolean).join("\n"),
    );

    const mappedUnivers = earthKey != null ? cineverseMap[String(earthKey)] : undefined;
    const inCineverseData = mappedUnivers != null;

    const entry = {
      pageTitle: title,
      earthKey,
      displayTitle,
      firstCanon: firstCanonShort,
      overview,
      filmScore: score,
      filmReasons: reasons,
      mappedUnivers: mappedUnivers ?? null,
      inCineverseData,
      parseSource: source,
    };

    if (INCLUDE_ALL_EARTH || score >= MIN_SCORE) {
      realities.push(entry);
    }
  }
  process.stderr.write("\n");

  const filmRealities = realities.filter((r) => !r.error && (INCLUDE_ALL_EARTH || r.filmScore >= MIN_SCORE));

  const payload = {
    source: "https://marvel.fandom.com/wiki/Category:Realities",
    api: API,
    generatedAt: new Date().toISOString(),
    options: {
      minScore: MIN_SCORE,
      includeAllEarth: INCLUDE_ALL_EARTH,
      subcatsDiverged: SUBCATS_DIVERGED,
      cineversePath: CINEVERSE_PATH,
    },
    cineverseEarthToUnivers: cineverseMap,
    counts: {
      categoryEarthPages: titles.length,
      kept: filmRealities.length,
      errors: realities.filter((r) => r.error).length,
    },
    realities: filmRealities.sort((a, b) => String(a.earthKey).localeCompare(String(b.earthKey), undefined, { numeric: true })),
    errors: realities.filter((r) => r.error),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.error("Écrit:", OUT, "—", payload.counts.kept, "réalités ciné (score≥" + MIN_SCORE + ")");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
