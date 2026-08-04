/**
 * Ajoute les personnages manquants depuis le wiki EN (List of Canon Characters).
 * Garde seulement si ≥11 champs remplis. Race dérivée des catégories wiki.
 * difficulty = Impossible. Exclut films / non-canon.
 *
 * Anime : ajout seulement si un n° d'épisode est trouvé (sinon manga seul).
 * Manga : toujours éligible (canon), firstAppearance = Chapitre N si dispo.
 *
 * Usage:
 *   node scripts/add-one-piece-missing-from-wiki.mjs [--dry-run] [--limit N] [--delay MS]
 *   node scripts/add-one-piece-missing-from-wiki.mjs --target anime|manga|both
 *   node scripts/add-one-piece-missing-from-wiki.mjs --resume
 *   node scripts/add-one-piece-missing-from-wiki.mjs --min-fields 11
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { parsePremiereRaw, toEpisodeOnly, WIKI_ARC_TO_GAME } from "./one-piece-episode-utils.mjs";
import { parseChapterFromRaw, toChapterOnly } from "./one-piece-chapter-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ANIME_PATH = path.join(ROOT, "data", "one-piece-anime.json");
const MANGA_PATH = path.join(ROOT, "data", "one-piece-manga.json");
const CACHE_PATH = path.join(ROOT, "data", "one-piece-missing-from-wiki-cache.json");
const EN_API = "https://onepiece.fandom.com/api.php";

const DEFAULT_MIN_FIELDS = 11;

/** Wiki EN title → id local déjà présent sous un autre slug */
const TITLE_ALIASES = {
  Buggy: "baggy",
  Aladine: "aladdin",
  "Jewelry Bonney": "jewelry-bonney",
  Jinbe: "jinbe",
  Jinbei: "jinbe",
  Jimbei: "jinbe",
};

/** Catégorie wiki EN → race jeu (FR). Ordre = priorité si plusieurs. */
const RACE_FROM_CATEGORY = [
  ["Fish-Men", "Homme-Poisson"],
  ["Merfolk", "Sirène"],
  ["Mink Tribe", "Minks"],
  ["Giants", "Géant"],
  ["Dwarves", "Nain"],
  ["Longarms", "Long-Bras"],
  ["Longlegs", "Longues-Jambes"],
  ["Lunarians", "Lunarien"],
  ["Buccaneers", "Buccaneer"],
  ["Cyborgs", "Cyborg"],
  ["Sky Island Natives", "Skypieien"],
  ["Mythological Beings", "Dieu"],
  ["Animals", "Animal"],
  ["Living Weapons", "Arme vivante"],
  ["Anthropomorphic Characters", "Animal"],
  ["Humans", "Humain"],
];

/** Champs comptés pour le seuil min (hors id / difficulty). */
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

const SKIP_TITLE_RE =
  /^(List of |Category:|Template:|Portal:|User:|File:|Chapter |Episode |Chapitre |Épisode )|Characters$|Species$|Animals$|Zombies$|Galleries?$/i;

function parseArgv(argv) {
  const out = {
    dryRun: false,
    delay: 350,
    limit: Infinity,
    target: "both",
    resume: false,
    minFields: DEFAULT_MIN_FIELDS,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--resume") out.resume = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--min-fields") out.minFields = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_MIN_FIELDS);
    else if (a === "--target") {
      const t = String(argv[++i] || "both").toLowerCase();
      out.target = ["anime", "manga", "both"].includes(t) ? t : "both";
    }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(params) {
  const u = new URL(EN_API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, {
    headers: { "User-Agent": "worldle-onepiece-missing/1.0 (educational)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

export function titleToId(title) {
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

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return { done: {}, added: [] };
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return { done: {}, added: [] };
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
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
    for (const m of data.query?.categorymembers || []) {
      if (m.title) titles.push(m.title);
    }
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
    for (const m of data.query?.categorymembers || []) {
      if (m.title) titles.push(m.title);
    }
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
  const links = (data.parse?.links || [])
    .filter((l) => l.ns === 0)
    .map((l) => l["*"])
    .filter((t) => t && !SKIP_TITLE_RE.test(t) && !/^List of /i.test(t));
  return [...new Set(links)];
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
  for (const [wikiTitle, localId] of Object.entries(TITLE_ALIASES)) {
    keys.add(titleToId(wikiTitle));
    if (byId.has(localId)) keys.add(titleToId(wikiTitle));
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

function hasMovieCategory(categories) {
  return categories.some((c) => /^Movie \d+ Characters$/i.test(c) || /^Movie Characters$/i.test(c));
}

function hasNonCanonCategory(categories) {
  return categories.some((c) => /non-canon/i.test(c));
}

function genderFromCategories(categories) {
  if (categories.some((c) => /^Female Characters$/i.test(c))) return "Féminin";
  if (categories.some((c) => /^Male Characters$/i.test(c))) return "Masculin";
  return "Indéterminé";
}

/** Première race non-générique selon priorité RACE_FROM_CATEGORY. */
function raceFromCategories(categories) {
  const set = new Set(categories.map((c) => c.trim()));
  for (const [wikiCat, race] of RACE_FROM_CATEGORY) {
    if (set.has(wikiCat)) return race;
  }
  return "";
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
  const berry = t.match(/(\d+)\s*(?:beli|berries|฿|beli)?/i);
  if (berry) return parseInt(berry[1], 10);
  const m = t.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
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
  const part = t.split(/;|\n/)[0].replace(/\s*\([^)]*former[^)]*\)/gi, "").trim();
  return part.split(",")[0].trim();
}

function guessArcFromDebut(firstRaw) {
  const t = String(firstRaw || "");
  for (const [wikiArc, gameArc] of Object.entries(WIKI_ARC_TO_GAME)) {
    const short = wikiArc.replace(/ Arc$/i, "");
    if (new RegExp(short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(t)) return gameArc;
  }
  return "Inconnu";
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

function countFilledFields(char) {
  let n = 0;
  for (const key of COUNT_FIELDS) {
    if (isFilled(key, char[key])) n++;
  }
  return n;
}

function buildStub({ wikiTitle, resolvedTitle, fields, categories }) {
  const name = cleanText(fields?.name || resolvedTitle || wikiTitle).replace(/\s*\[\s*v\s*·\s*e\s*\]\s*$/i, "");
  const id = TITLE_ALIASES[wikiTitle] || TITLE_ALIASES[resolvedTitle] || titleToId(resolvedTitle || wikiTitle);
  const firstRaw = fields?.first || fields?.debut || "";
  const affiliation = firstAffiliation(fields?.affiliation);
  const origin = cleanText(fields?.origin || fields?.birthplace || "").split(";")[0].trim();
  const age = parseAge(fields?.age);
  const size = parseHeightCm(fields?.height);
  const bounty = parseBounty(fields?.bounty);
  const devilFruitType = parseDevilFruitType(fields?.dfname || fields?.devilfruit || fields?.fruit || "");
  const gender = genderFromCategories(categories);
  const race = raceFromCategories(categories);
  const arc = guessArcFromDebut(firstRaw);

  const aliases = [];
  const jname = cleanText(fields?.jname || "");
  const rname = cleanText(fields?.rname || fields?.romanji || "");
  if (rname && titleToId(rname) !== id) aliases.push(rname);

  return {
    id,
    name: name || resolvedTitle || wikiTitle,
    aliases,
    affiliation,
    sub_affiliation: [],
    age,
    arc,
    bounty,
    devilFruitType,
    gender,
    haki: [],
    origin,
    size,
    race,
    hint1: affiliation || name,
    hint2: jname || devilFruitType || affiliation || name,
    hint3: origin || arc || "",
    firstAppearance: "",
    difficulty: "Impossible",
    _firstRaw: firstRaw,
  };
}

function applyAppearances(char, target) {
  const firstRaw = char._firstRaw || "";
  delete char._firstRaw;
  if (target === "anime") {
    const ep = toEpisodeOnly(parsePremiereRaw(firstRaw) || firstRaw);
    char.firstAppearance = ep || "";
    return Boolean(ep);
  }
  if (target === "manga") {
    const ch = toChapterOnly(parseChapterFromRaw(firstRaw) || firstRaw);
    char.firstAppearance = ch || "";
    return true;
  }
  return true;
}

function hasFieldValue(v) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function buildFieldPrevalence(characters, fieldMapping = {}) {
  const keys = new Set([
    ...Object.keys(fieldMapping || {}),
    ...characters.flatMap((c) => Object.keys(c).filter((k) => !k.startsWith("_"))),
  ]);
  keys.delete("id");
  keys.delete("name");
  keys.delete("aliases");
  const n = Math.max(1, characters.length);
  const rates = {};
  for (const key of keys) {
    let count = 0;
    for (const c of characters) if (hasFieldValue(c[key])) count++;
    rates[key] = count / n;
  }
  return Object.fromEntries(Object.entries(rates).sort((a, b) => b[1] - a[1]));
}

function sortChars(characters) {
  return [...characters].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

async function main() {
  const opts = parseArgv(process.argv);
  const animeData = JSON.parse(fs.readFileSync(ANIME_PATH, "utf8"));
  const mangaData = JSON.parse(fs.readFileSync(MANGA_PATH, "utf8"));
  const animeIndex = buildExistingIndex(animeData.characters);
  const mangaIndex = buildExistingIndex(mangaData.characters);

  console.log("Anime:", animeData.characters.length, "| Manga:", mangaData.characters.length);
  console.log("Seuil min champs:", opts.minFields);

  console.log("Fetch liste canon…");
  const canonTitles = await fetchCanonTitles();
  console.log("Canon titres:", canonTitles.length);
  await sleep(opts.delay);

  console.log("Fetch exclusions (films / non-canon)…");
  const excluded = await fetchExclusionTitles(opts.delay);
  console.log("Exclus:", excluded.size);

  const cache = loadCache();
  const candidates = [];
  for (const title of canonTitles) {
    if (excluded.has(title)) continue;
    if (SKIP_TITLE_RE.test(title)) continue;
    const inAnime = resolveLocalId(title, animeIndex);
    const inManga = resolveLocalId(title, mangaIndex);
    const needAnime = (opts.target === "anime" || opts.target === "both") && !inAnime;
    const needManga = (opts.target === "manga" || opts.target === "both") && !inManga;
    if (!needAnime && !needManga) continue;
    if (opts.resume && (cache.done[title] === "skip" || cache.done[title] === "skip-fields")) continue;
    if (opts.resume && cache.done[title] === "added") continue;
    candidates.push({ title, needAnime, needManga });
  }

  console.log("Manquants à traiter:", candidates.length);
  const toFetch = candidates.slice(0, opts.limit);
  if (opts.limit < Infinity) console.log("Limit:", toFetch.length);

  const addedAnime = [];
  const addedManga = [];
  let skipped = 0;
  let skippedFields = 0;
  let failed = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const { title, needAnime, needManga } = toFetch[i];
    try {
      const page = await fetchPageHtml(title);
      await sleep(opts.delay);
      if (!page) {
        failed++;
        cache.done[title] = "fail";
        console.warn("[fail]", title);
        continue;
      }

      const cats = page.categories || [];
      if (hasMovieCategory(cats) || hasNonCanonCategory(cats)) {
        skipped++;
        cache.done[title] = "skip";
        console.warn("[skip-cat]", page.resolvedTitle);
        continue;
      }
      if (cats.some((c) => /Multiple Characters/i.test(c))) {
        skipped++;
        cache.done[title] = "skip";
        console.warn("[skip-multi]", page.resolvedTitle);
        continue;
      }

      const fields = parseInfobox(page.html) || {};
      const firstRaw = fields.first || fields.debut || "";
      if (isMovieOnlyDebut(firstRaw)) {
        skipped++;
        cache.done[title] = "skip";
        console.warn("[skip-movie-debut]", page.resolvedTitle, firstRaw.slice(0, 80));
        continue;
      }

      const stub = buildStub({
        wikiTitle: title,
        resolvedTitle: page.resolvedTitle,
        fields,
        categories: cats,
      });

      let didAdd = false;

      if (needManga && (opts.target === "manga" || opts.target === "both")) {
        if (!mangaIndex.byId.has(stub.id) && !resolveLocalId(title, mangaIndex)) {
          const mangaChar = { ...stub, aliases: [...stub.aliases] };
          applyAppearances(mangaChar, "manga");
          const filled = countFilledFields(mangaChar);
          if (filled < opts.minFields) {
            skippedFields++;
            console.warn(`[skip-fields ${filled}<${opts.minFields}]`, mangaChar.id, mangaChar.race || "-");
          } else {
            addedManga.push(mangaChar);
            mangaIndex.byId.set(mangaChar.id, mangaChar);
            mangaIndex.keys.add(mangaChar.id);
            didAdd = true;
          }
        }
      }

      if (needAnime && (opts.target === "anime" || opts.target === "both")) {
        if (!animeIndex.byId.has(stub.id) && !resolveLocalId(title, animeIndex)) {
          const animeChar = { ...stub, aliases: [...stub.aliases] };
          const hasEp = applyAppearances(animeChar, "anime");
          if (!hasEp) {
            console.warn("[skip-anime-no-ep]", stub.id);
          } else {
            const filled = countFilledFields(animeChar);
            if (filled < opts.minFields) {
              skippedFields++;
              console.warn(`[skip-fields-anime ${filled}<${opts.minFields}]`, animeChar.id);
            } else {
              addedAnime.push(animeChar);
              animeIndex.byId.set(animeChar.id, animeChar);
              animeIndex.keys.add(animeChar.id);
              didAdd = true;
            }
          }
        }
      }

      cache.done[title] = didAdd ? "added" : "skip-fields";
      if (didAdd) cache.added.push({ title, id: stub.id, race: stub.race });

      if ((i + 1) % 25 === 0 || i === toFetch.length - 1) {
        console.log(
          `Progress ${i + 1}/${toFetch.length} | +anime ${addedAnime.length} +manga ${addedManga.length} skip ${skipped} skip-fields ${skippedFields} fail ${failed}`,
        );
        if (!opts.dryRun) saveCache(cache);
      }
    } catch (e) {
      failed++;
      cache.done[title] = "fail";
      console.warn("[err]", title, e.message);
      await sleep(opts.delay * 2);
    }
  }

  console.log(
    `\nRésumé: +anime ${addedAnime.length} +manga ${addedManga.length} | skip ${skipped} | skip-fields ${skippedFields} | fail ${failed}`,
  );
  console.log("Exemples ids:", [...addedManga, ...addedAnime].slice(0, 12).map((c) => `${c.id}(${c.race})`).join(", "));

  if (opts.dryRun) {
    console.log("Dry-run — aucune écriture JSON.");
    return;
  }

  saveCache(cache);

  if (addedManga.length && (opts.target === "manga" || opts.target === "both")) {
    mangaData.characters = sortChars([...mangaData.characters, ...addedManga]);
    mangaData.fieldPrevalence = buildFieldPrevalence(mangaData.characters, mangaData.fieldMapping);
    fs.writeFileSync(MANGA_PATH, `${JSON.stringify(mangaData, null, 2)}\n`, "utf8");
    console.log("Wrote", MANGA_PATH, "→", mangaData.characters.length);
  }

  if (addedAnime.length && (opts.target === "anime" || opts.target === "both")) {
    animeData.characters = sortChars([...animeData.characters, ...addedAnime]);
    animeData.fieldPrevalence = buildFieldPrevalence(animeData.characters, animeData.fieldMapping);
    fs.writeFileSync(ANIME_PATH, `${JSON.stringify(animeData, null, 2)}\n`, "utf8");
    console.log("Wrote", ANIME_PATH, "→", animeData.characters.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
