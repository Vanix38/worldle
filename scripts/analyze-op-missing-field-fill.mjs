/**
 * Distribution du nombre de champs remplis pour les persos qui seraient ajoutés
 * par add-one-piece-missing-from-wiki.mjs (sans écrire le JSON).
 *
 *   node scripts/analyze-op-missing-field-fill.mjs [--limit N] [--delay MS] [--concurrency N]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { parsePremiereRaw, toEpisodeOnly } from "./one-piece-episode-utils.mjs";
import { parseChapterFromRaw, toChapterOnly } from "./one-piece-chapter-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ANIME_PATH = path.join(ROOT, "data", "one-piece-anime.json");
const MANGA_PATH = path.join(ROOT, "data", "one-piece-manga.json");
const OUT_PATH = path.join(ROOT, "data", "one-piece-missing-field-fill-report.json");
const EN_API = "https://onepiece.fandom.com/api.php";

const TITLE_ALIASES = {
  Buggy: "baggy",
  Aladine: "aladdin",
  "Jewelry Bonney": "jewelry-bonney",
  Jinbe: "jinbe",
  Jinbei: "jinbe",
  Jimbei: "jinbe",
};

const SKIP_TITLE_RE =
  /^(List of |Category:|Template:|Portal:|User:|File:)|Characters$|Species$|Animals$|Zombies$|Galleries?$/i;

/** Champs jouables comptés (hors id / difficulty toujours posés). */
const COUNT_FIELDS = [
  "name",
  "aliases",
  "affiliation",
  "sub_affiliation",
  "age",
  "arc",
  "bounty",
  "devilFruitType",
  "gender",
  "haki",
  "origin",
  "size",
  "race",
  "hint1",
  "hint2",
  "hint3",
  "firstAppearance",
];

function parseArgv(argv) {
  const out = { delay: 120, limit: Infinity, concurrency: 6 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 120);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--concurrency") out.concurrency = Math.max(1, parseInt(argv[++i], 10) || 6);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(params) {
  const u = new URL(EN_API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, {
    headers: { "User-Agent": "worldle-onepiece-fill-analysis/1.0 (educational)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function titleToId(title) {
  return String(title)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function cleanText(s) {
  if (!s) return "";
  return String(s)
    .replace(/\[\s*v\s*·\s*e\s*\]/gi, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\u200e/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isFilled(key, v) {
  if (v == null) return false;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return false;
    if (key === "arc" && t === "Inconnu") return false;
    if (key === "gender" && t === "Indéterminé") return false;
    return true;
  }
  if (typeof v === "number") return v > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

async function fetchCategoryPages(cmtitle) {
  const titles = [];
  let cmcontinue;
  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle,
      cmlimit: "500",
      cmtype: "page",
      cmnamespace: "0",
      format: "json",
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const data = await fetchJson(params);
    for (const m of data.query?.categorymembers || []) if (m.title) titles.push(m.title);
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return titles;
}

async function fetchCategorySubcats(cmtitle) {
  const titles = [];
  let cmcontinue;
  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle,
      cmlimit: "500",
      cmtype: "subcat",
      format: "json",
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const data = await fetchJson(params);
    for (const m of data.query?.categorymembers || []) if (m.title) titles.push(m.title);
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return titles;
}

async function fetchCanonTitles() {
  const data = await fetchJson({
    action: "parse",
    page: "List_of_Canon_Characters",
    prop: "links",
    format: "json",
  });
  return [
    ...new Set(
      (data.parse?.links || [])
        .filter((l) => l.ns === 0)
        .map((l) => l["*"])
        .filter((t) => t && !SKIP_TITLE_RE.test(t) && !/^List of /i.test(t)),
    ),
  ];
}

async function fetchExclusionTitles(delay) {
  const excluded = new Set();
  for (const cat of [
    "Category:Non-Canon_Male_Characters",
    "Category:Non-Canon_Female_Characters",
    "Category:Non-Canon_Newkama",
  ]) {
    for (const t of await fetchCategoryPages(cat)) excluded.add(t);
    await sleep(delay);
  }
  const movieSubs = await fetchCategorySubcats("Category:Movie_Characters");
  await sleep(delay);
  for (const sub of movieSubs) {
    for (const t of await fetchCategoryPages(sub)) excluded.add(t);
    await sleep(delay);
  }
  try {
    const data = await fetchJson({
      action: "parse",
      page: "List_of_Non-Canon_Characters",
      prop: "links",
      format: "json",
    });
    for (const l of data.parse?.links || []) {
      if (l.ns === 0 && l["*"] && !/^List of /i.test(l["*"])) excluded.add(l["*"]);
    }
  } catch {
    /* ignore */
  }
  return excluded;
}

function buildExistingIndex(characters) {
  const byId = new Map();
  const keys = new Set();
  for (const c of characters) {
    byId.set(c.id, c);
    keys.add(c.id);
    keys.add(titleToId(c.name));
    for (const a of c.aliases || []) keys.add(titleToId(a));
  }
  return { byId, keys };
}

function resolveLocalId(wikiTitle, index) {
  if (TITLE_ALIASES[wikiTitle] && index.byId.has(TITLE_ALIASES[wikiTitle])) {
    return TITLE_ALIASES[wikiTitle];
  }
  const id = titleToId(wikiTitle);
  if (index.byId.has(id)) return id;
  if (index.keys.has(id)) {
    for (const c of index.byId.values()) {
      if (c.id === id || titleToId(c.name) === id) return c.id;
      if ((c.aliases || []).some((a) => titleToId(a) === id)) return c.id;
    }
  }
  return null;
}

async function fetchPageHtml(title) {
  try {
    const data = await fetchJson({
      action: "parse",
      page: title,
      prop: "text|categories",
      redirects: "1",
      format: "json",
    });
    if (data.error) return null;
    return {
      html: data.parse?.text?.["*"] || "",
      resolvedTitle: data.parse?.title || title,
      categories: (data.parse?.categories || []).map((c) =>
        String(c["*"] || c.category || "").replace(/_/g, " "),
      ),
    };
  } catch {
    return null;
  }
}

function parseInfobox(html) {
  const $ = cheerio.load(html);
  const ib = $(".portable-infobox").first();
  if (!ib.length) return null;
  const data = {};
  ib.find("[data-source]").each((_, el) => {
    const key = $(el).attr("data-source");
    if (!key || data[key] !== undefined) return;
    const valNode = $(el).find(".pi-data-value").first();
    const text = cleanText(valNode.length ? valNode.text() : $(el).text());
    if (text) data[key] = text;
  });
  return data;
}

function isMovieOnlyDebut(firstRaw) {
  const t = String(firstRaw || "");
  const hasChapter = /(?:chapter|chapitre)\s*\d+/i.test(t);
  const hasMovie = /\b(?:movie|film)\s*\d*\b/i.test(t);
  return hasMovie && !hasChapter;
}

function genderFromCategories(categories) {
  if (categories.some((c) => /^Female Characters$/i.test(c))) return "Féminin";
  if (categories.some((c) => /^Male Characters$/i.test(c))) return "Masculin";
  return "Indéterminé";
}

function parseAge(raw) {
  const m = String(raw || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function parseHeightCm(raw) {
  const t = String(raw || "");
  const cm = t.match(/(\d+(?:[.,]\d+)?)\s*cm/i);
  if (cm) return Math.round(parseFloat(cm[1].replace(",", ".")));
  const m = t.match(/(\d+)\s*m(?:eters?)?\s*(\d+)/i);
  if (m) return parseInt(m[1], 10) * 100 + parseInt(m[2], 10);
  return 0;
}

function parseBounty(raw) {
  const t = String(raw || "").replace(/,/g, "").replace(/\s/g, "");
  const berry = t.match(/(\d+)/);
  return berry ? parseInt(berry[1], 10) : 0;
}

function parseDevilFruitType(raw) {
  const t = String(raw || "");
  if (/mythical\s*zoan|zoan\s*mythique/i.test(t)) return "Zoan Mythique";
  if (/ancient\s*zoan|zoan\s*antique/i.test(t)) return "Zoan Antique";
  if (/\blogia\b/i.test(t)) return "Logia";
  if (/\bzoan\b/i.test(t)) return "Zoan";
  if (/\bparamecia\b/i.test(t)) return "Paramecia";
  if (/\bsmile\b/i.test(t)) return "SMILE";
  return "";
}

function firstAffiliation(raw) {
  const t = cleanText(raw);
  if (!t) return "";
  return t
    .split(/;|\n/)[0]
    .replace(/\s*\([^)]*former[^)]*\)/gi, "")
    .trim()
    .split(",")[0]
    .trim();
}

function buildStub({ wikiTitle, resolvedTitle, fields, categories }) {
  const name = cleanText(fields?.name || resolvedTitle || wikiTitle);
  const id = TITLE_ALIASES[wikiTitle] || TITLE_ALIASES[resolvedTitle] || titleToId(resolvedTitle || wikiTitle);
  const firstRaw = fields?.first || fields?.debut || "";
  const affiliation = firstAffiliation(fields?.affiliation);
  const origin = cleanText(fields?.origin || fields?.birthplace || "").split(";")[0].trim();
  const age = parseAge(fields?.age);
  const size = parseHeightCm(fields?.height);
  const bounty = parseBounty(fields?.bounty);
  const devilFruitType = parseDevilFruitType(fields?.dfname || fields?.devilfruit || fields?.fruit || "");
  const gender = genderFromCategories(categories);
  const aliases = [];
  const rname = cleanText(fields?.rname || "");
  if (rname && titleToId(rname) !== id) aliases.push(rname);

  const chapter = toChapterOnly(parseChapterFromRaw(firstRaw) || firstRaw) || "";
  const episode = toEpisodeOnly(parsePremiereRaw(firstRaw) || firstRaw) || "";

  return {
    id,
    name: name || resolvedTitle || wikiTitle,
    aliases,
    affiliation,
    sub_affiliation: [],
    age,
    arc: "Inconnu",
    bounty,
    devilFruitType,
    gender,
    haki: [],
    origin,
    size,
    race: "",
    hint1: affiliation || name,
    hint2: cleanText(fields?.jname || "") || devilFruitType || affiliation || name,
    hint3: origin || "",
    firstAppearance: chapter || episode || "",
    _firstRaw: firstRaw,
  };
}

function countFilled(char) {
  let n = 0;
  const filled = [];
  for (const key of COUNT_FIELDS) {
    if (isFilled(key, char[key])) {
      n++;
      filled.push(key);
    }
  }
  return { n, filled };
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const opts = parseArgv(process.argv);
  const animeData = JSON.parse(fs.readFileSync(ANIME_PATH, "utf8"));
  const mangaData = JSON.parse(fs.readFileSync(MANGA_PATH, "utf8"));
  const animeIndex = buildExistingIndex(animeData.characters);
  const mangaIndex = buildExistingIndex(mangaData.characters);

  console.log("Fetch liste canon + exclusions…");
  const canonTitles = await fetchCanonTitles();
  await sleep(opts.delay);
  const excluded = await fetchExclusionTitles(opts.delay);

  const candidates = [];
  for (const title of canonTitles) {
    if (excluded.has(title) || SKIP_TITLE_RE.test(title)) continue;
    const inAnime = resolveLocalId(title, animeIndex);
    const inManga = resolveLocalId(title, mangaIndex);
    if (inAnime && inManga) continue;
    candidates.push(title);
  }

  const toFetch = candidates.slice(0, opts.limit);
  console.log(`Candidats manquants: ${candidates.length} | à analyser: ${toFetch.length}`);
  console.log(`Concurrency ${opts.concurrency}, delay ${opts.delay}ms`);

  const hist = {};
  const fieldFreq = Object.fromEntries(COUNT_FIELDS.map((k) => [k, 0]));
  let added = 0;
  let skipped = 0;
  let failed = 0;
  const samplesByCount = {};

  await mapPool(toFetch, opts.concurrency, async (title, i) => {
    try {
      const page = await fetchPageHtml(title);
      await sleep(opts.delay);
      if (!page) {
        failed++;
        return;
      }
      const cats = page.categories || [];
      if (
        cats.some((c) => /^Movie \d+ Characters$/i.test(c) || /non-canon/i.test(c) || /Multiple Characters/i.test(c))
      ) {
        skipped++;
        return;
      }
      const fields = parseInfobox(page.html) || {};
      const firstRaw = fields.first || fields.debut || "";
      if (isMovieOnlyDebut(firstRaw)) {
        skipped++;
        return;
      }
      const stub = buildStub({
        wikiTitle: title,
        resolvedTitle: page.resolvedTitle,
        fields,
        categories: cats,
      });
      const { n, filled } = countFilled(stub);
      added++;
      hist[n] = (hist[n] || 0) + 1;
      for (const f of filled) fieldFreq[f]++;
      if (!samplesByCount[n]) samplesByCount[n] = [];
      if (samplesByCount[n].length < 5) samplesByCount[n].push(stub.id);

      if ((i + 1) % 50 === 0 || i === toFetch.length - 1) {
        console.log(`Progress ${i + 1}/${toFetch.length} | ok ${added} skip ${skipped} fail ${failed}`);
      }
    } catch (e) {
      failed++;
      console.warn("[err]", title, e.message);
    }
  });

  const maxFields = COUNT_FIELDS.length;
  console.log("\n=== Répartition (champs remplis / perso ajoutable) ===");
  console.log(`Champs comptés (${maxFields}): ${COUNT_FIELDS.join(", ")}`);
  console.log(`Persos analysés OK: ${added} | skip: ${skipped} | fail: ${failed}\n`);

  for (let n = 0; n <= maxFields; n++) {
    const count = hist[n] || 0;
    if (count === 0) continue;
    const pct = ((count / Math.max(1, added)) * 100).toFixed(1);
    const samples = (samplesByCount[n] || []).join(", ");
    console.log(`${n} champ${n > 1 ? "s" : ""} rempli${n > 1 ? "s" : ""} : ${count} personnages (${pct}%)` + (samples ? `  ex: ${samples}` : ""));
  }

  console.log("\n=== Fréquence par champ ===");
  for (const [k, v] of Object.entries(fieldFreq).sort((a, b) => b[1] - a[1])) {
    const pct = ((v / Math.max(1, added)) * 100).toFixed(1);
    console.log(`${k.padEnd(18)} ${String(v).padStart(5)}  ${pct}%`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    candidatesTotal: candidates.length,
    analyzed: toFetch.length,
    added,
    skipped,
    failed,
    countFields: COUNT_FIELDS,
    histogram: hist,
    fieldFrequency: fieldFreq,
    samplesByCount,
  };
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log("\nWrote", OUT_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
