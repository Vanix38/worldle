/**
 * Scrape naruto.fandom.com/fr — Catégorie:Personnages → data/naruto.json
 * Usage:
 *   node scripts/scrape-naruto-fandom.mjs --discover
 *   node scripts/scrape-naruto-fandom.mjs [--limit N] [--delay MS] [--out path] [--resume]
 *   Par défaut exclut la série Boruto (manga Boruto, Naruto Gaiden, début manga = seulement ch.≥700).
 *   --include-boruto : garder aussi ces personnages.
 *   Par défaut, ne garde dans fieldMapping / persos que les champs présents sur ≥ minRate des fiches (+ alias / indices).
 *   --no-prune : garder tous les champs mappés.
 *   --min-rate 0.10 : seuil de prévalence (0–1).
 *   --reprune : relit data/naruto.json (--out), réapplique seulement le pruning + fieldPrevalence (pas d’API).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "data", "naruto.json");
const DISCOVER_OUT = path.join(__dirname, "discovered-naruto-fields.json");
const API = "https://naruto.fandom.com/fr/api.php";
const CATEGORY = "Catégorie:Personnages";

const DISCOVER_PAGES = ["Naruto_Uzumaki", "Sasuke_Uchiwa", "Orochimaru"];

/** Toujours garder ces clés dans fieldMapping et sur les persos (jeu / recherche). */
const ALWAYS_FIELD_KEYS = new Set([
  "aliases",
  "sub_affiliation",
  "indice1",
  "indice2",
  "indice3",
]);

const FIELD_MAPPING = {
  gender: {
    header: "Genre",
    fonction: "Classique",
    description: "Genre indiqué sur la fiche (peut être « Variable » pour certains personnages).",
  },
  species: {
    header: "Espèce",
    fonction: "Classique",
    description: "Espèce (Humaine, etc.).",
  },
  bloodType: {
    header: "Groupe sanguin",
    fonction: "Classique",
    description: "Groupe sanguin A/B/AB/O.",
  },
  age: {
    header: "Âge (Partie II)",
    fonction: "ComparaisonChiffre",
    description: "Âge en années, privilégié à partir de la mention « Partie II » dans l’infobox ; sinon première valeur « X ans » trouvée.",
  },
  height: {
    header: "Taille (Partie II, cm)",
    fonction: "ComparaisonChiffre",
    description: "Taille en centimètres (Partie II si présent, sinon première valeur en cm).",
  },
  affiliation: {
    header: "Affiliation principale",
    fonction: "Classique",
    description: "Premier lieu ou organisation listée dans Affiliation (liens wiki nettoyés).",
  },
  sub_affiliation: {
    header: "Autres affiliations & équipes",
    fonction: "Recherche",
    description: "Affiliations secondaires et équipes (recherche uniquement).",
  },
  ninjaRank: {
    header: "Rang ninja",
    fonction: "Classique",
    description: "Rang ninja (Genin, Chûnin, Anbu, Rang S, etc.).",
  },
  chakraNatures: {
    header: "Natures du chakra",
    fonction: "Classique",
    description: "Natures listées (texte unique, tri alphabétique des éléments).",
  },
  kekkeiGenkai: {
    header: "Kekkei Genkai",
    fonction: "Classique",
    description: "Kekkei Genkai listés sur la fiche.",
  },
  classification: {
    header: "Classification",
    fonction: "Classique",
    description: "Classifications (ex. Sannin, Rang S, nukenin…).",
  },
  debutManga: {
    header: "Début manga",
    fonction: "Classique",
    description: "Référence de première apparition manga nettoyée.",
  },
  aliases: {
    header: "Alias",
    fonction: "Recherche",
    description: "Autres noms et surnoms (recherche uniquement).",
  },
  indice1: {
    header: "Indice 1",
    fonction: "Indice",
    hint: { prompt: "Classification & espèce", icon: "FaCertificate" },
    description: "Indice lié à la classification.",
  },
  indice2: {
    header: "Indice 2",
    fonction: "Indice",
    hint: { prompt: "Chakra & kekkei", icon: "FaBolt" },
    description: "Indice sur les natures de chakra et kekkei genkai.",
  },
  indice3: {
    header: "Indice 3",
    fonction: "Indice",
    hint: { prompt: "Équipes & affiliation", icon: "FaUsers" },
    description: "Indice sur équipes et affiliation.",
  },
};

function parseArgs(argv) {
  const out = {
    discover: false,
    limit: Infinity,
    delay: 350,
    outPath: DEFAULT_OUT,
    resume: false,
    dryRun: false,
    excludeBoruto: true,
    noPrune: false,
    minRate: 0.1,
    reprune: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--discover") out.discover = true;
    else if (a === "--resume") out.resume = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--reprune") out.reprune = true;
    else if (a === "--no-prune") out.noPrune = true;
    else if (a === "--include-boruto") out.excludeBoruto = false;
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
    else if (a === "--min-rate") out.minRate = Math.max(0, parseFloat(argv[++i]) || 0.1);
    else if (a === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": "worldle-naruto-scraper/1.0 (educational)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

function extractInfoboxInner(wikitext) {
  const marker = "{{Infobox/Personnage";
  const pos = wikitext.indexOf(marker);
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
  const full = wikitext.slice(pos, i);
  let inner = full.slice(marker.length).trim();
  if (inner.endsWith("}}")) inner = inner.slice(0, -2).trim();
  return inner;
}

/** Parse |Key = value with nested {{ }}; value ends at newline + | at depth 0 */
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

function stripRefs(s) {
  return s
    .replace(/<ref\s+[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\s*\/>/gi, "")
    .replace(/<ref[^>]*>/gi, "");
}

function cleanWikiText(s) {
  if (!s) return "";
  let t = stripRefs(s);
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  for (let n = 0; n < 30; n++) {
    const m = t.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (!m) break;
    let disp = (m[2] ?? m[1]).trim();
    if (disp.startsWith("link=")) disp = disp.slice(5).trim();
    disp = disp.replace(/''+/g, "").trim();
    t = t.replace(m[0], disp);
  }
  t = t.replace(/\{\{Traduction\|([^|{}[\]]+)(?:\|[^}]*)?\}\}/g, "$1");
  t = t.replace(/\{\{Traduction\|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => (b ?? a).trim());
  let prev;
  do {
    prev = t;
    t = t.replace(/\{\{[^{}]+\}\}/g, "");
  } while (t !== prev);
  t = t.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/~~[^~]*~~/g, "").trim();
  return t;
}

function extractLinkTexts(s) {
  if (!s) return [];
  const texts = [];
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let m;
  while ((m = re.exec(s))) {
    const raw = m[1].trim();
    let disp = (m[2] ?? m[1]).trim();
    if (disp.startsWith("link=")) disp = disp.slice(5).trim();
    if (/^Fichier:/i.test(raw) || /^File:/i.test(raw)) continue;
    if (/\.(svg|png|jpg|jpeg|gif|webp)$/i.test(disp)) continue;
    if (/symbole\.svg/i.test(raw)) continue;
    if (/wikipedia:/i.test(raw)) continue;
    if (/^\d+px$/i.test(disp)) continue;
    texts.push(disp.replace(/''+/g, "").trim());
  }
  return [...new Set(texts.filter(Boolean))];
}

function extractAliases(raw) {
  if (!raw) return [];
  const set = new Set(extractLinkTexts(raw));
  const trPlain = /\{\{Traduction\|([^|[{}]+)\|/g;
  let m;
  while ((m = trPlain.exec(raw))) {
    const a = m[1].trim();
    if (a) set.add(a);
  }
  const trLink = /\{\{Traduction\|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\|/g;
  while ((m = trLink.exec(raw))) {
    set.add((m[2] ?? m[1]).trim());
  }
  return [...set];
}

function parseAgeBlock(s) {
  if (!s) return undefined;
  const plain = stripRefs(s).replace(/<br\s*\/?>/gi, "\n");
  const mII = plain.match(/Partie\s+II\s*[^:]*:\s*(\d+)/i);
  if (mII) return parseInt(mII[1], 10);
  const mG = plain.match(/Gaiden\s*[^:]*:\s*(\d+)/i);
  if (mG) return parseInt(mG[1], 10);
  const mAny = plain.match(/(\d+)\s*~\s*(\d+)\s*ans/i);
  if (mAny) return parseInt(mAny[2], 10);
  const mOne = plain.match(/(\d+)\s*ans/i);
  return mOne ? parseInt(mOne[1], 10) : undefined;
}

function parseHeightBlock(s) {
  if (!s) return undefined;
  const plain = stripRefs(s).replace(/<br\s*\/?>/gi, "\n");
  const mII = plain.match(/Partie\s+II\s*[^:]*:\s*([\d.,]+)\s*cm/i);
  if (mII) return parseFloat(mII[1].replace(",", "."));
  const mG = plain.match(/Gaiden\s*[^:]*:\s*([\d.,]+)\s*cm/i);
  if (mG) return parseFloat(mG[1].replace(",", "."));
  const mAny = plain.match(/([\d.,]+)\s*cm/i);
  return mAny ? parseFloat(mAny[1].replace(",", ".")) : undefined;
}

function titleToId(title) {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/** Personnages centrés sur Boruto / épilogue next-gen — hors scope « Naruto classique + Shippuden ». */
function isBorutoFranchiseCharacter(params) {
  const dm = params["Début manga"] || "";
  const da = params["Début anime"] || "";
  if (/''Boruto''/i.test(dm)) return true;
  if (/Naruto\s+Gaiden/i.test(dm) || /''Naruto Gaiden''/i.test(dm)) return true;
  if (/700\s*\+\s*1/i.test(dm)) return true;
  const nums = [];
  const re = /''Naruto''\s*Chapitre\s+(\d+)/gi;
  let m;
  while ((m = re.exec(dm))) nums.push(parseInt(m[1], 10));
  if (nums.length >= 1 && nums.every((n) => n >= 700)) return true;
  if (!dm.trim() && /''Boruto''/i.test(da)) return true;
  return false;
}

function buildCharacter(title, params) {
  const id = titleToId(title);
  const affTexts = extractLinkTexts(params["Affiliation"] || "");
  const teams = extractLinkTexts(params["Équipe"] || "");
  const chakraList = extractLinkTexts(params["Nature de Chakra"] || "").sort((a, b) => a.localeCompare(b, "fr"));
  const kekList = extractLinkTexts(params["Kekkei Genkai"] || "").sort((a, b) => a.localeCompare(b, "fr"));
  const classList = extractLinkTexts(params["Classification"] || "").sort((a, b) => a.localeCompare(b, "fr"));

  const affiliation = affTexts[0] || cleanWikiText(params["Affiliation"] || "");
  const subUnique = [...new Set([...affTexts.slice(1), ...teams])];

  const gender = cleanWikiText(params["Genre"] || "");
  const species = cleanWikiText(params["Espèce"] || "");
  const bloodType = cleanWikiText(params["Groupe Sanguin"] || "");
  const ninjaRank = cleanWikiText(params["Rang Ninja"] || "");
  const debutManga = cleanWikiText(params["Début manga"] || "");
  const chakraNatures = chakraList.join(", ");
  const kekkeiGenkai = kekList.join(", ");
  const classification = classList.join(", ");

  const age = parseAgeBlock(params["Âge"] || "");
  const height = parseHeightBlock(params["Taille"] || "");

  const aliases = extractAliases(params["Autres noms"] || "");

  const indice1 = classification || species || ninjaRank || "—";
  const indice2 = chakraNatures || kekkeiGenkai || "—";
  const indice3 = (teams.length ? teams.join(", ") : "") || affiliation || "—";

  const char = {
    id,
    name: title,
    aliases,
    gender,
    species,
    bloodType,
    affiliation,
    sub_affiliation: subUnique,
    ninjaRank,
    chakraNatures,
    kekkeiGenkai,
    classification,
    debutManga,
    age,
    height,
    indice1,
    indice2,
    indice3,
  };

  if (age === undefined) delete char.age;
  if (height === undefined) delete char.height;

  return char;
}

async function discover() {
  const perPage = {};
  const union = new Set();
  for (const page of DISCOVER_PAGES) {
    const data = await fetchJson({
      action: "parse",
      page,
      prop: "wikitext",
      format: "json",
    });
    const wt = data.parse?.wikitext?.["*"] || "";
    const inner = extractInfoboxInner(wt);
    const keys = inner ? Object.keys(parseInfoboxParams(inner)) : [];
    perPage[page] = keys;
    keys.forEach((k) => union.add(k));
    await sleep(400);
  }
  const payload = {
    samplePages: DISCOVER_PAGES,
    unionKeysSorted: [...union].sort((a, b) => a.localeCompare(b, "fr")),
    keysPerPage: perPage,
    mappedJsonKeys: [
      "gender",
      "species",
      "bloodType",
      "age",
      "height",
      "affiliation",
      "sub_affiliation",
      "ninjaRank",
      "chakraNatures",
      "kekkeiGenkai",
      "classification",
      "debutManga",
      "aliases",
      "indice1",
      "indice2",
      "indice3",
    ],
    wikiSourceFields: {
      Genre: "gender",
      Espèce: "species",
      "Groupe Sanguin": "bloodType",
      Âge: "age",
      Taille: "height",
      Affiliation: "affiliation",
      Équipe: "sub_affiliation (avec autres affiliations)",
      "Rang Ninja": "ninjaRank",
      "Nature de Chakra": "chakraNatures",
      "Kekkei Genkai": "kekkeiGenkai",
      Classification: "classification",
      "Début manga": "debutManga",
      "Autres noms": "aliases",
    },
  };
  fs.writeFileSync(DISCOVER_OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log("Wrote", DISCOVER_OUT, "union keys:", payload.unionKeysSorted.length);
}

async function fetchCategoryTitles(limit, delay) {
  const titles = [];
  let cmcontinue = undefined;
  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: CATEGORY,
      cmlimit: "500",
      cmnamespace: "0",
      format: "json",
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const data = await fetchJson(params);
    const batch = data.query?.categorymembers || [];
    for (const m of batch) {
      if (m.ns === 0 && m.title) titles.push(m.title);
      if (titles.length >= limit) return titles.slice(0, limit);
    }
    cmcontinue = data.continue?.cmcontinue;
    await sleep(delay);
  } while (cmcontinue);
  return titles.slice(0, limit);
}

async function fetchWikitext(title) {
  const data = await fetchJson({
    action: "parse",
    page: title,
    prop: "wikitext",
    redirects: "1",
    format: "json",
  });
  if (data.error) return { error: data.error.info || JSON.stringify(data.error), wikitext: "" };
  const wt = data.parse?.wikitext?.["*"] || "";
  const resolved = data.parse?.title || title;
  return { wikitext: wt, resolvedTitle: resolved };
}

function charGameFieldPresent(char, key) {
  const v = char[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (Array.isArray(v)) return v.length > 0;
  const s = String(v).trim();
  return s !== "";
}

function presenceRates(characters, keys) {
  const n = characters.length || 1;
  const rates = {};
  for (const key of keys) {
    let c = 0;
    for (const ch of characters) {
      if (charGameFieldPresent(ch, key)) c++;
    }
    rates[key] = c / n;
  }
  return rates;
}

function pruneByPrevalence(characters, fieldMapping, minRate) {
  const fmKeys = Object.keys(fieldMapping);
  const rates = presenceRates(characters, fmKeys);
  const byFreq = [...fmKeys].sort((a, b) => rates[b] - rates[a]);
  const keep = new Set(ALWAYS_FIELD_KEYS);
  for (const k of byFreq) {
    if (rates[k] >= minRate) keep.add(k);
  }
  const newFm = {};
  for (const k of byFreq) {
    if (keep.has(k)) newFm[k] = fieldMapping[k];
  }
  const newChars = characters.map((ch) => {
    const o = { id: ch.id, name: ch.name };
    for (const k of keep) {
      if (ch[k] !== undefined) o[k] = ch[k];
    }
    if (keep.has("aliases") && !Array.isArray(o.aliases)) o.aliases = [];
    if (keep.has("sub_affiliation") && !Array.isArray(o.sub_affiliation)) o.sub_affiliation = [];
    return o;
  });
  const keepKeys = new Set(Object.keys(newFm));
  const fieldPrevalence = Object.fromEntries(
    [...Object.entries(rates)].filter(([k]) => keepKeys.has(k)).sort((a, b) => b[1] - a[1]),
  );
  return { characters: newChars, fieldMapping: newFm, fieldPrevalence };
}

function loadExisting(outPath) {
  try {
    const raw = fs.readFileSync(outPath, "utf8");
    const j = JSON.parse(raw);
    const chars = Array.isArray(j.characters) ? j.characters : [];
    const ids = new Set(chars.map((c) => c.id));
    return { characters: chars, ids };
  } catch {
    return { characters: [], ids: new Set() };
  }
}

async function scrape(opts) {
  const titles = await fetchCategoryTitles(opts.limit, opts.delay);
  console.log("Category titles:", titles.length);

  let characters = [];
  const ids = new Set();
  if (opts.resume && fs.existsSync(opts.outPath)) {
    const ex = loadExisting(opts.outPath);
    characters = ex.characters;
    ex.ids.forEach((id) => ids.add(id));
    console.log("Resume: loaded", characters.length, "existing");
  }

  let ok = 0;
  let skipped = 0;
  let fail = 0;
  let borutoSkipped = 0;

  if (opts.excludeBoruto) console.log("Excluding Boruto-era debuts (use --include-boruto to keep them)");

  for (let idx = 0; idx < titles.length; idx++) {
    const title = titles[idx];
    const id = titleToId(title);
    if (ids.has(id)) {
      skipped++;
      continue;
    }
    try {
      const { wikitext, resolvedTitle, error } = await fetchWikitext(title);
      await sleep(opts.delay);
      if (error) {
        fail++;
        console.warn("[skip]", title, error);
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      if (!inner) {
        fail++;
        console.warn("[no infobox]", title);
        continue;
      }
      const params = parseInfoboxParams(inner);
      if (opts.excludeBoruto && isBorutoFranchiseCharacter(params)) {
        borutoSkipped++;
        continue;
      }
      const char = buildCharacter(resolvedTitle, params);
      if (ids.has(char.id)) {
        skipped++;
        continue;
      }
      characters.push(char);
      ids.add(char.id);
      ok++;
      if ((idx + 1) % 50 === 0) console.log("Progress", idx + 1, "/", titles.length, "ok", ok);
    } catch (e) {
      fail++;
      console.warn("[err]", title, e.message);
      await sleep(opts.delay * 2);
    }
  }

  characters.sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const nChar = characters.length;

  let fieldMappingOut = FIELD_MAPPING;
  let charactersOut = characters;
  /** @type {Record<string, number>|undefined} */
  let fieldPrevalence;

  if (!opts.noPrune && nChar > 0) {
    const pr = pruneByPrevalence(characters, FIELD_MAPPING, opts.minRate);
    charactersOut = pr.characters;
    fieldMappingOut = pr.fieldMapping;
    fieldPrevalence = pr.fieldPrevalence;
    console.log(
      "Pruned columns: kept",
      Object.keys(fieldMappingOut).length,
      "/",
      Object.keys(FIELD_MAPPING).length,
      "(minRate",
      opts.minRate,
      ")",
    );
  } else if (nChar > 0) {
    fieldPrevalence = Object.fromEntries(
      Object.entries(presenceRates(characters, Object.keys(FIELD_MAPPING))).sort((a, b) => b[1] - a[1]),
    );
  }

  const universe = {
    id: "naruto",
    name: "Naruto",
    fieldMapping: fieldMappingOut,
    ...(fieldPrevalence && { fieldPrevalence }),
    characters: charactersOut,
  };

  if (opts.dryRun) {
    console.log(
      "Dry run: would write",
      characters.length,
      "characters (skipped",
      skipped,
      "borutoExcluded",
      borutoSkipped,
      "fail",
      fail,
      ")",
    );
    return;
  }

  fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
  fs.writeFileSync(opts.outPath, JSON.stringify(universe, null, 2), "utf8");
  console.log(
    "Wrote",
    opts.outPath,
    "characters:",
    characters.length,
    "skipped:",
    skipped,
    "borutoExcluded:",
    borutoSkipped,
    "fail:",
    fail,
  );
}

function repruneOnly(opts) {
  const raw = fs.readFileSync(opts.outPath, "utf8");
  const data = JSON.parse(raw);
  const characters = data.characters;
  if (!Array.isArray(characters)) {
    console.error("Invalid JSON: missing characters[]");
    process.exit(1);
  }
  const fmKeysFull = Object.keys(FIELD_MAPPING);
  const fullFm = { ...FIELD_MAPPING };

  let fieldMappingOut = fullFm;
  let charactersOut = characters;
  let fieldPrevalence;

  if (!opts.noPrune && characters.length > 0) {
    const pr = pruneByPrevalence(characters, fullFm, opts.minRate);
    charactersOut = pr.characters;
    fieldMappingOut = pr.fieldMapping;
    fieldPrevalence = pr.fieldPrevalence;
    console.log("Reprune: kept", Object.keys(fieldMappingOut).length, "/", fmKeysFull.length, "columns");
  } else if (characters.length > 0) {
    fieldPrevalence = Object.fromEntries(
      Object.entries(presenceRates(characters, fmKeysFull)).sort((a, b) => b[1] - a[1]),
    );
  }

  const out = {
    id: data.id || "naruto",
    name: data.name || "Naruto",
    fieldMapping: fieldMappingOut,
    ...(fieldPrevalence && { fieldPrevalence }),
    characters: charactersOut,
  };
  fs.writeFileSync(opts.outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", opts.outPath, "characters:", charactersOut.length);
}

const opts = parseArgs(process.argv);
if (opts.discover) {
  discover().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (opts.reprune) {
  try {
    repruneOnly(opts);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
} else {
  scrape(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
