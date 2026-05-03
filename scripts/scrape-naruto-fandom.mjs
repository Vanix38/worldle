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
 *   --backfill-status-clan : requête wiki (infobox Statut + Clan) pour chaque perso ; met à jour uniquement status/clan + fieldMapping/fieldPrevalence pour ces clés (aucun prune, autres champs inchangés).
 *   --backfill-profession : idem pour Profession uniquement.
 *   --backfill-affiliation-sub : réinfère affiliation (1er lien) et indice3 (affiliation + autres lignes + équipes, hors ~~Anime/Film seulement~~).
 *   --backfill-kekkei-indice2 : infobox Kekkei Genkai → kekkeiGenkai, Traits Uniques → indice2.
 *   Après un scrape complet : node scripts/extract-naruto-jutsu-usage.mjs --patch-naruto — remplit indice1 (jutsu wiki présents chez ≥5 persos du jeu).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { lastWikiPeriodBlock, ninjaRankLastOnly, canonicalNinjaRank } from "./naruto-ninja-rank-last.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "data", "naruto.json");
const DISCOVER_OUT = path.join(__dirname, "discovered-naruto-fields.json");
const API = "https://naruto.fandom.com/fr/api.php";
const CATEGORY = "Catégorie:Personnages";

const DISCOVER_PAGES = ["Naruto_Uzumaki", "Sasuke_Uchiwa", "Orochimaru"];

const NARUTO_ARC_ROWS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "naruto-chapitres-arcs.json"), "utf8"),
).arcs;
/** Ordre chronologique des arcs pour Comparaison ; « Inconnu » si pas de numéro de chapitre parsé. */
const NARUTO_ARC_ORDER = ["Inconnu", ...NARUTO_ARC_ROWS.map((a) => a.label)];

const NARUTO_NINJA_RANK_META = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "naruto-ninja-ranks-order.json"), "utf8"),
);

function extractChapterNumber(text) {
  const m = String(text || "").match(/Chapitre\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function chapterToArcLabel(ch) {
  if (typeof ch !== "number" || Number.isNaN(ch)) return null;
  for (const row of NARUTO_ARC_ROWS) {
    if (ch >= row.from && ch <= row.to) return row.label;
  }
  return null;
}

/** Toujours garder ces clés dans fieldMapping et sur les persos (jeu / recherche). */
const ALWAYS_FIELD_KEYS = new Set(["aliases", "indice1", "indice2", "indice3", "kekkeiGenkai"]);

const FIELD_MAPPING = {
  status: {
    header: "Statut",
    fonction: "Classique",
    description:
      "Vivant ou Mort quand l’infobox le permet ; autres libellés wiki (ex. Incapacité) conservés (icône « ? » dans la grille).",
  },
  gender: {
    header: "Genre",
    fonction: "Classique",
    description: "Homme ou Femme (les mentions Masculin/Féminin du wiki sont normalisées). « Variable » conservé si la fiche l’indique.",
  },
  age: {
    header: "Âge",
    fonction: "ComparaisonChiffre",
    description: "Âge en années déduit de l’infobox (priorité à la tranche Shippuden si plusieurs valeurs).",
  },
  affiliation: {
    header: "Affiliation principale",
    fonction: "Classique",
    description: "Premier lien du champ Affiliation de l’infobox (liens wiki nettoyés).",
  },
  kekkeiGenkai: {
    header: "Kekkei genkai",
    fonction: "Multivalue",
    description:
      "Champ infobox Kekkei genkai (liens wiki, virgules). Orange si au moins une entrée est commune avec la cible.",
  },
  clan: {
    header: "Clan",
    fonction: "Classique",
    description: "Clan(s) listés dans l’infobox (liens wiki agrégés).",
  },
  ninjaRank: {
    header: "Rang ninja",
    fonction: "Comparaison",
    order: NARUTO_NINJA_RANK_META.order,
    orderLabelEquivalence: NARUTO_NINJA_RANK_META.orderLabelEquivalence,
    description:
      "Hiérarchie indicative (académie → Kage). ↑ = rang plus bas dans cette échelle ; ↓ = rang plus élevé. Réglages : data/naruto-ninja-ranks-order.json.",
  },
  profession: {
    header: "Profession",
    fonction: "Classique",
    description:
      "Métier / rôle(s) dans l’infobox : uniquement le dernier bloc chronologique (Partie II, Épilogue, Nouvelle Ère…), comme pour le rang ninja.",
  },
  chakraNatures: {
    header: "Natures du chakra",
    fonction: "Multivalue",
    description:
      "Nature(s) du chakra (liste séparée par des virgules). Orange si au moins une nature est partagée avec la cible.",
  },
  arc: {
    header: "Arc",
    fonction: "Comparaison",
    order: NARUTO_ARC_ORDER,
    description:
      "Arc du manga au premier chapitre d’apparition (ordre chronologique). ↑ = plus tôt ; ↓ = plus tard. Bornes : data/naruto-chapitres-arcs.json.",
  },
  classification: {
    header: "Classification",
    fonction: "Multivalue",
    description:
      "Classifications (virgules). Orange si au moins une entrée est commune avec la cible.",
  },
  indice1: {
    header: "Indice 1",
    fonction: "Indice",
    hint: {
      prompt: "Jutsu maîtrisés (courants)",
      icon: "FaScroll",
    },
    description:
      "Jutsu infobox : d’abord ceux maîtrisés par ≥ cinq persos du jeu ; sinon tous les jutsu liés sur la fiche (y compris rares). Vide si pas de champ Jutsu. Rempli par extract-naruto-jutsu-usage.mjs --patch-naruto.",
  },
  indice2: {
    header: "Indice 2",
    fonction: "Indice",
    hint: { prompt: "Traits uniques", icon: "FaStar" },
    description: "Champ infobox « Traits uniques » (liens), « — » si absent.",
  },
  indice3: {
    header: "Indice 3",
    fonction: "Indice",
    hint: { prompt: "Équipes & affiliation", icon: "FaUsers" },
    includeInSearch: true,
    description:
      "Affiliation principale + autres lignes Affiliation + Équipe (hors ~~Anime/Film seulement~~), en une liste virgules ; autocomplete.",
  },
  aliases: {
    header: "Alias",
    fonction: "Recherche",
    description: "Autres noms et surnoms (recherche uniquement).",
  },
};

/** Toutes les clés du FIELD_MAPPING sont présentes sur le perso ; chaîne vide si absent du wiki (aliases = tableau ; âge inchangé si absent). */
function ensureNarutoCharacterDefaults(char) {
  for (const k of Object.keys(FIELD_MAPPING)) {
    if (k === "aliases") {
      if (!Array.isArray(char.aliases)) char.aliases = [];
      continue;
    }
    if (k === "age") continue;
    if (char[k] === undefined) char[k] = "";
  }
}

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
    backfillStatusClan: false,
    backfillProfession: false,
    backfillAffiliationSub: false,
    backfillKekkeiIndice2: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--discover") out.discover = true;
    else if (a === "--backfill-status-clan") out.backfillStatusClan = true;
    else if (a === "--backfill-profession") out.backfillProfession = true;
    else if (a === "--backfill-affiliation-sub") out.backfillAffiliationSub = true;
    else if (a === "--backfill-kekkei-indice2") out.backfillKekkeiIndice2 = true;
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

/** Comme extractLinkTexts mais conserve l’ordre d’apparition (pour Profession après dernier bloc période). */
function extractLinkTextsOrdered(s) {
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
    const t = disp.replace(/''+/g, "").trim();
    if (t) texts.push(t);
  }
  return texts;
}

function professionFromInfoboxProfessionField(rawProfession) {
  const tail = lastWikiPeriodBlock(String(rawProfession ?? ""));
  const profTexts = extractLinkTextsOrdered(tail);
  return stripPartieLabels(
    profTexts.length ? profTexts.join(", ") : cleanWikiText(tail),
  );
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

function titleToId(title) {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/** Retire « Partie I / II » (avec ou sans espace avant « : », ou &nbsp;) et « (Partie I|II) » ; coupe un suffixe wiki parasite après « | ». */
function stripPartieLabels(s) {
  if (!s || typeof s !== "string") return s;
  let t = s.replace(/\u00a0/g, " ");
  t = t.replace(/\bPartie\s+I\s*(?::|&nbsp;\s*:)\s*/gi, "");
  t = t.replace(/\bPartie\s+II\s*(?::|&nbsp;\s*:)\s*/gi, "");
  t = t.replace(/\s*\(\s*Partie\s+I\s*\)\s*/gi, " ");
  t = t.replace(/\s*\(\s*Partie\s+II\s*\)\s*/gi, " ");
  const pipe = t.indexOf("|");
  if (pipe !== -1) t = t.slice(0, pipe);
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/** Découpe une valeur d’infobox en segments (sauts de ligne ou balises br). */
function splitWikiInfoboxList(raw) {
  if (!raw) return [];
  let t = stripRefs(String(raw));
  t = t.replace(/\r\n/g, "\n").replace(/<br\s*\/?>/gi, "\n");
  return t
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Segment marqué comme hors manga (anime seul / film seul). */
function isAnimeOrFilmOnlySegment(segment) {
  if (!segment || typeof segment !== "string") return false;
  const s = segment.replace(/\u00a0/g, " ");
  if (/\~\~\s*Anime\s+seulement/i.test(s)) return true;
  if (/\~\~\s*Films?\s+seulement/i.test(s)) return true;
  return false;
}

/**
 * Affiliation = premier lien du champ Affiliation.
 * extras = autres liens Affiliation + Équipe (segments ~~Anime/Film seulement~~ exclus) — sert à construire indice3 uniquement.
 */
function deriveAffiliationSubFromParams(params) {
  const rawAff = params["Affiliation"] || "";
  const segments = splitWikiInfoboxList(rawAff);
  const ordered = [];
  for (const seg of segments) {
    const excl = isAnimeOrFilmOnlySegment(seg);
    for (const txt of extractLinkTexts(seg)) {
      ordered.push({ text: txt, segmentExcluded: excl });
    }
  }
  const principalRaw = ordered[0]?.text;
  const affiliation = stripPartieLabels(
    principalRaw || cleanWikiText(rawAff),
  );

  const subParts = [];
  for (let i = 1; i < ordered.length; i++) {
    if (!ordered[i].segmentExcluded) {
      const x = stripPartieLabels(ordered[i].text);
      if (x) subParts.push(x);
    }
  }
  for (const seg of splitWikiInfoboxList(params["Équipe"] || "")) {
    if (isAnimeOrFilmOnlySegment(seg)) continue;
    for (const txt of extractLinkTexts(seg)) {
      const x = stripPartieLabels(txt);
      if (x) subParts.push(x);
    }
  }
  const extras = [...new Set(subParts)].filter((x) => x && x !== affiliation);
  return { affiliation, extras };
}

/** Genre affiché : uniquement Homme / Femme (ou Variable). */
function normalizeGenderDisplay(raw) {
  const s = String(raw || "").trim();
  if (!s) return s;
  if (/\bvariable\b/i.test(s)) return "Variable";
  const female = /\b(femme|femelle|féminin|feminin)\b/i.test(s);
  const male = /\b(homme|mâle|male|masculin)\b/i.test(s);
  if (female && !male) return "Femme";
  if (male && !female) return "Homme";
  if (female && male) {
    const fi = s.search(/\b(femme|femelle|féminin|feminin)\b/i);
    const mi = s.search(/\b(homme|mâle|male|masculin)\b/i);
    return fi >= 0 && (mi < 0 || fi < mi) ? "Femme" : "Homme";
  }
  if (/féminin|feminin|femme|femelle/i.test(s)) return "Femme";
  if (/masculin|mâle|homme/i.test(s)) return "Homme";
  return s;
}

/** Infobox « Statut » → affichage jeu (cœur / crâne / ?). */
function normalizeNarutoStatus(raw) {
  const links = extractLinkTexts(raw || "");
  const plain = stripPartieLabels(cleanWikiText(raw || ""));
  const candidate = (links.join(", ") || plain).trim();
  if (!candidate) return "";
  const ascii = candidate
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (/\b(deced|mort)\b/.test(ascii) || /\bdisparu/.test(ascii) || /\btue\b/.test(ascii)) return "Mort";
  if (/\b(vivant|alive)\b/.test(ascii) || /\ben vie\b/.test(ascii)) return "Vivant";
  return candidate;
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
  const { affiliation, extras } = deriveAffiliationSubFromParams(params);
  const chakraList = extractLinkTexts(params["Nature de Chakra"] || "").sort((a, b) => a.localeCompare(b, "fr"));
  const kekList = extractLinkTexts(params["Kekkei Genkai"] || "").sort((a, b) => a.localeCompare(b, "fr"));
  const traitsList = extractLinkTexts(params["Traits Uniques"] || "").sort((a, b) => a.localeCompare(b, "fr"));
  const classList = extractLinkTexts(params["Classification"] || "").sort((a, b) => a.localeCompare(b, "fr"));
  const gender = normalizeGenderDisplay(stripPartieLabels(cleanWikiText(params["Genre"] || "")));
  const status = normalizeNarutoStatus(params["Statut"] || "");
  const clanTexts = extractLinkTexts(params["Clan"] || "");
  const clan = stripPartieLabels(
    clanTexts.length ? clanTexts.join(", ") : cleanWikiText(params["Clan"] || ""),
  );
  const ninjaRank = canonicalNinjaRank(
    stripPartieLabels(ninjaRankLastOnly(cleanWikiText(params["Rang Ninja"] || ""))),
  );
  const debutRaw = params["Début manga"] || "";
  const chNum = extractChapterNumber(debutRaw) ?? extractChapterNumber(cleanWikiText(debutRaw));
  const arc = chapterToArcLabel(chNum) ?? "Inconnu";
  const chakraNatures = stripPartieLabels(chakraList.join(", "));
  const kekkeiGenkai = stripPartieLabels(kekList.join(", "));
  const traitsUniques = stripPartieLabels(traitsList.join(", "));
  const classification = stripPartieLabels(classList.join(", "));
  const profession = professionFromInfoboxProfessionField(params["Profession"] || "");

  const age = parseAgeBlock(params["Âge"] || "");

  const aliases = extractAliases(params["Autres noms"] || "").map((a) => stripPartieLabels(a)).filter(Boolean);

  /** Rempli ensuite par extract-naruto-jutsu-usage.mjs --patch-naruto (seuil jutsu ≥5 persos). */
  const indice1 = "—";
  const indice2 = traitsUniques || "—";
  const indice3Parts = [
    ...new Set(
      [affiliation, ...extras].map((x) => stripPartieLabels(x)).filter(Boolean),
    ),
  ];
  const indice3 = stripPartieLabels(indice3Parts.join(", ") || "—");

  const char = {
    id,
    name: stripPartieLabels(title),
    aliases,
    gender,
    status: status || "",
    clan: clan || "",
    affiliation,
    ninjaRank,
    chakraNatures,
    kekkeiGenkai,
    classification,
    profession: profession || "",
    arc,
    indice1,
    indice2,
    indice3,
  };

  if (age !== undefined) char.age = age;
  ensureNarutoCharacterDefaults(char);

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
      "status",
      "gender",
      "age",
      "affiliation",
      "clan",
      "ninjaRank",
      "classification",
      "profession",
      "chakraNatures",
      "kekkeiGenkai",
      "arc",
      "aliases",
      "indice1",
      "indice2",
      "indice3",
    ],
    wikiSourceFields: {
      Genre: "gender",
      Statut: "status",
      Clan: "clan",
      Âge: "age",
      Affiliation: "affiliation (1er lien) ; autres lignes → indice3",
      Équipe: "indice3",
      "Rang Ninja": "ninjaRank",
      "Nature de Chakra": "chakraNatures",
      "Kekkei Genkai": "kekkeiGenkai",
      "Traits Uniques": "indice2",
      Classification: "classification",
      Profession: "profession",
      "Début manga": "arc (via numéro de chapitre)",
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

async function backfillStatusClan(opts) {
  const raw = fs.readFileSync(opts.outPath, "utf8");
  const data = JSON.parse(raw);
  const characters = data.characters;
  if (!Array.isArray(characters)) {
    console.error("Invalid JSON: missing characters[]");
    process.exit(1);
  }
  console.log("Backfill Statut/Clan — carte catégorie → titres wiki…");
  const titles = await fetchCategoryTitles(Infinity, opts.delay);
  const idToTitle = new Map();
  for (const t of titles) idToTitle.set(titleToId(t), t);

  let okRows = 0;
  let noTitle = 0;
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    const title = idToTitle.get(c.id);
    if (!title) {
      noTitle++;
      continue;
    }
    try {
      const { wikitext, error } = await fetchWikitext(title);
      await sleep(opts.delay);
      if (error) {
        console.warn("[backfill]", title, error);
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      if (!inner) continue;
      const params = parseInfoboxParams(inner);
      const status = normalizeNarutoStatus(params["Statut"] || "");
      const clanTexts = extractLinkTexts(params["Clan"] || "");
      const clan = stripPartieLabels(
        clanTexts.length ? clanTexts.join(", ") : cleanWikiText(params["Clan"] || ""),
      );
      c.status = status || "";
      c.clan = clan || "";
      okRows++;
    } catch (e) {
      console.warn("[backfill]", c.id, e.message);
    }
    if ((i + 1) % 50 === 0) console.log("Backfill", i + 1, "/", characters.length);
  }
  console.log("Fiches mises à jour (statut et/ou clan):", okRows, "| sans titre wiki:", noTitle);

  const mergedFm = { ...(data.fieldMapping || {}) };
  mergedFm.status = FIELD_MAPPING.status;
  mergedFm.clan = FIELD_MAPPING.clan;

  const fmKeys = Object.keys(mergedFm);
  const fieldPrevalence = Object.fromEntries(
    Object.entries(presenceRates(characters, fmKeys)).sort((a, b) => b[1] - a[1]),
  );

  for (const c of characters) ensureNarutoCharacterDefaults(c);

  const out = {
    id: data.id || "naruto",
    name: data.name || "Naruto",
    fieldMapping: mergedFm,
    fieldPrevalence,
    characters,
  };
  fs.writeFileSync(opts.outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", opts.outPath, "(prune désactivé ; autres champs préservés)");
}

async function backfillProfession(opts) {
  const raw = fs.readFileSync(opts.outPath, "utf8");
  const data = JSON.parse(raw);
  const characters = data.characters;
  if (!Array.isArray(characters)) {
    console.error("Invalid JSON: missing characters[]");
    process.exit(1);
  }
  console.log("Backfill Profession — carte catégorie → titres wiki…");
  const titles = await fetchCategoryTitles(Infinity, opts.delay);
  const idToTitle = new Map();
  for (const t of titles) idToTitle.set(titleToId(t), t);

  let okRows = 0;
  let noTitle = 0;
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    const title = idToTitle.get(c.id);
    if (!title) {
      noTitle++;
      continue;
    }
    try {
      const { wikitext, error } = await fetchWikitext(title);
      await sleep(opts.delay);
      if (error) {
        console.warn("[backfill profession]", title, error);
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      if (!inner) continue;
      const params = parseInfoboxParams(inner);
      const profession = professionFromInfoboxProfessionField(params["Profession"] || "");
      c.profession = profession || "";
      if (profession) okRows++;
    } catch (e) {
      console.warn("[backfill profession]", c.id, e.message);
    }
    if ((i + 1) % 50 === 0) console.log("Backfill profession", i + 1, "/", characters.length);
  }
  console.log("Fiches mises à jour (profession):", okRows, "| sans titre wiki:", noTitle);

  const mergedFm = { ...(data.fieldMapping || {}) };
  mergedFm.profession = FIELD_MAPPING.profession;

  const fmKeys = Object.keys(mergedFm);
  const fieldPrevalence = Object.fromEntries(
    Object.entries(presenceRates(characters, fmKeys)).sort((a, b) => b[1] - a[1]),
  );

  for (const c of characters) ensureNarutoCharacterDefaults(c);

  const out = {
    id: data.id || "naruto",
    name: data.name || "Naruto",
    fieldMapping: mergedFm,
    fieldPrevalence,
    characters,
  };
  fs.writeFileSync(opts.outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", opts.outPath, "(prune désactivé ; autres champs préservés)");
}

async function backfillAffiliationSub(opts) {
  const raw = fs.readFileSync(opts.outPath, "utf8");
  const data = JSON.parse(raw);
  const characters = data.characters;
  if (!Array.isArray(characters)) {
    console.error("Invalid JSON: missing characters[]");
    process.exit(1);
  }
  console.log("Backfill affiliation + indice3 — carte catégorie → titres wiki…");
  const titles = await fetchCategoryTitles(Infinity, opts.delay);
  const idToTitle = new Map();
  for (const t of titles) idToTitle.set(titleToId(t), t);

  let okRows = 0;
  let noTitle = 0;
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    const title = idToTitle.get(c.id);
    if (!title) {
      noTitle++;
      continue;
    }
    try {
      const { wikitext, error } = await fetchWikitext(title);
      await sleep(opts.delay);
      if (error) {
        console.warn("[backfill affiliation]", title, error);
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      if (!inner) continue;
      const params = parseInfoboxParams(inner);
      const { affiliation, extras } = deriveAffiliationSubFromParams(params);
      c.affiliation = affiliation;
      delete c.sub_affiliation;
      const indice3Parts = [
        ...new Set(
          [affiliation, ...extras].map((x) => stripPartieLabels(x)).filter(Boolean),
        ),
      ];
      c.indice3 = stripPartieLabels(indice3Parts.join(", ") || "—");
      okRows++;
    } catch (e) {
      console.warn("[backfill affiliation]", c.id, e.message);
    }
    if ((i + 1) % 50 === 0) console.log("Backfill affiliation", i + 1, "/", characters.length);
  }
  console.log("Fiches mises à jour (affiliation + indice3):", okRows, "| sans titre wiki:", noTitle);

  const mergedFm = { ...(data.fieldMapping || {}) };
  mergedFm.affiliation = FIELD_MAPPING.affiliation;
  mergedFm.indice3 = FIELD_MAPPING.indice3;
  delete mergedFm.sub_affiliation;

  const fmKeys = Object.keys(mergedFm);
  const fieldPrevalence = Object.fromEntries(
    Object.entries(presenceRates(characters, fmKeys)).sort((a, b) => b[1] - a[1]),
  );

  for (const c of characters) ensureNarutoCharacterDefaults(c);

  const out = {
    id: data.id || "naruto",
    name: data.name || "Naruto",
    fieldMapping: mergedFm,
    fieldPrevalence,
    characters,
  };
  fs.writeFileSync(opts.outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", opts.outPath, "(prune désactivé ; autres champs préservés)");
}

async function backfillKekkeiIndice2(opts) {
  const raw = fs.readFileSync(opts.outPath, "utf8");
  const data = JSON.parse(raw);
  const characters = data.characters;
  if (!Array.isArray(characters)) {
    console.error("Invalid JSON: missing characters[]");
    process.exit(1);
  }
  console.log("Backfill Kekkei genkai + Traits Uniques (indice2) — carte catégorie → titres wiki…");
  const titles = await fetchCategoryTitles(Infinity, opts.delay);
  const idToTitle = new Map();
  for (const t of titles) idToTitle.set(titleToId(t), t);

  let okKekkei = 0;
  let okTraits = 0;
  let noTitle = 0;
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    const title = idToTitle.get(c.id);
    if (!title) {
      noTitle++;
      continue;
    }
    try {
      const { wikitext, error } = await fetchWikitext(title);
      await sleep(opts.delay);
      if (error) {
        console.warn("[backfill kekkei / traits]", title, error);
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      if (!inner) continue;
      const params = parseInfoboxParams(inner);
      const kekList = extractLinkTexts(params["Kekkei Genkai"] || "").sort((a, b) => a.localeCompare(b, "fr"));
      const kekkeiGenkai = stripPartieLabels(kekList.join(", "));
      const traitsList = extractLinkTexts(params["Traits Uniques"] || "").sort((a, b) => a.localeCompare(b, "fr"));
      const traitsUniques = stripPartieLabels(traitsList.join(", "));
      c.kekkeiGenkai = kekkeiGenkai || "";
      c.indice2 = traitsUniques || "—";
      if (kekkeiGenkai) okKekkei++;
      if (traitsUniques) okTraits++;
    } catch (e) {
      console.warn("[backfill kekkei / traits]", c.id, e.message);
    }
    if ((i + 1) % 50 === 0) console.log("Backfill kekkei / traits", i + 1, "/", characters.length);
  }
  console.log(
    "Persos avec kekkei renseigné:",
    okKekkei,
    "| avec traits uniques (indice2):",
    okTraits,
    "| sans titre wiki:",
    noTitle,
  );

  const mergedFm = { ...(data.fieldMapping || {}) };
  mergedFm.kekkeiGenkai = FIELD_MAPPING.kekkeiGenkai;
  mergedFm.indice2 = FIELD_MAPPING.indice2;

  const fmKeys = Object.keys(mergedFm);
  const fieldPrevalence = Object.fromEntries(
    Object.entries(presenceRates(characters, fmKeys)).sort((a, b) => b[1] - a[1]),
  );

  for (const c of characters) ensureNarutoCharacterDefaults(c);

  const out = {
    id: data.id || "naruto",
    name: data.name || "Naruto",
    fieldMapping: mergedFm,
    fieldPrevalence,
    characters,
  };
  fs.writeFileSync(opts.outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", opts.outPath, "(prune désactivé ; autres champs préservés)");
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
  for (const [k, v] of Object.entries(data.fieldMapping || {})) {
    if (!(k in fullFm)) fullFm[k] = v;
  }

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
} else if (opts.backfillStatusClan) {
  backfillStatusClan(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (opts.backfillProfession) {
  backfillProfession(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (opts.backfillAffiliationSub) {
  backfillAffiliationSub(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (opts.backfillKekkeiIndice2) {
  backfillKekkeiIndice2(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  scrape(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
