/**
 * Migre / recalcule data/cyberpunk.json firstAppearance :
 * Edgerunners Saison 1 | Jeu vidéo | Phantom Liberty | Edgerunners Saison 2
 *
 *   node scripts/migrate-cyberpunk-first-appearance.mjs [--delay MS]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_JSON = path.join(ROOT, "data", "cyberpunk.json");
const API = "https://cyberpunk.fandom.com/api.php";
const UA = "worldle-cyberpunk-fa-migrate/1.1 (educational; fan quiz)";

const TITLE_OVERRIDES = {
  V: "V (character)",
  "Michiko Sanderson (née Arasaka)": "Michiko Sanderson",
  Lucy: "Lucyna Kushinada",
  "Lucyna Kushinada": "Lucyna Kushinada",
};

const FA_S1 = "Edgerunners Saison 1";
const FA_GAME = "Jeu vidéo";
const FA_PL = "Phantom Liberty";
const FA_S2 = "Edgerunners Saison 2";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  let delay = 100;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--delay") delay = Math.max(0, parseInt(argv[++i], 10) || 100);
  }
  return { delay };
}

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchWikitext(pageTitle) {
  const data = await fetchJson({
    action: "parse",
    page: pageTitle,
    prop: "wikitext",
    redirects: "1",
    format: "json",
  });
  if (data.error) return "";
  return data.parse?.wikitext?.["*"] || "";
}

function extractInfoboxInner(wikitext) {
  const marker = "{{Infobox Character";
  const pos = wikitext.indexOf(marker);
  if (pos === -1) return null;
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
  let inner = wikitext.slice(pos, i).slice(marker.length).trim();
  if (inner.endsWith("}}")) inner = inner.slice(0, -2).trim();
  return inner;
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

function appearanceBlob(params) {
  let blob = [
    params.appears_games || "",
    params.appears_other || "",
    params.appears_books || "",
    params.appearances || "",
  ].join("\n");
  blob = blob
    .replace(/\[\[Cyberpunk 2077(?:\|[^\]]+)?\]\]/gi, "{{CP|2077}}")
    .replace(/\[\[Cyberpunk: Edgerunners(?:\|[^\]]+)?\]\]/gi, "{{CP|EDGE}}");
  return blob;
}

function isEdgerunnersSeason1Tag(tag) {
  const t = String(tag || "").toUpperCase();
  if (!t || t.startsWith("EDGEII")) return false;
  return t === "EDGE" || t === "EDGE10" || t === "CEMK" || t === "EDGEMAD" || t.startsWith("EDGE");
}

function isEdgerunnersSeason2Tag(tag) {
  return String(tag || "")
    .toUpperCase()
    .startsWith("EDGEII");
}

function isBaseGameTag(tag) {
  const t = String(tag || "").toUpperCase();
  return t === "2077" || t === "2077VG" || t === "CP2077" || t === "CP2077VG";
}

function isPhantomLibertyTag(tag) {
  const t = String(tag || "").toUpperCase();
  return t === "2077PL" || t === "CP2077PL" || t === "PL" || t === "PHANTOMLIBERTY";
}

function isOther2077MediaTag(tag) {
  const t = String(tag || "").toUpperCase();
  if (!t.startsWith("2077") && !t.startsWith("CP2077")) return false;
  return !isBaseGameTag(t) && !isPhantomLibertyTag(t);
}

function collectAppearanceFlags(blob) {
  const tokens = [...String(blob || "").matchAll(/\{\{\s*CP\s*\|\s*([^}|]+?)\s*\}\}(\s*\([^)]*\))?/gi)];
  let hasS1 = false;
  let hasBase = false;
  let hasPL = false;
  let hasOther2077 = false;
  let hasS2 = false;
  for (const m of tokens) {
    const tag = (m[1] || "").trim().toUpperCase();
    const note = m[2] || "";
    if (/\bmention/i.test(note)) continue;
    if (isBaseGameTag(tag)) hasBase = true;
    else if (isPhantomLibertyTag(tag)) hasPL = true;
    else if (isOther2077MediaTag(tag)) hasOther2077 = true;
    else if (isEdgerunnersSeason2Tag(tag)) hasS2 = true;
    else if (isEdgerunnersSeason1Tag(tag)) hasS1 = true;
  }
  return { hasS1, hasBase, hasPL, hasOther2077, hasS2 };
}

/** Infobox uniquement : le corps de page cite {{CP|EDGE}} dans des notes/références (faux positifs). */
// eslint-disable-next-line no-unused-vars
function detectFirstAppearance(params, _wikitext) {
  const { hasS1, hasBase, hasPL, hasOther2077, hasS2 } = collectAppearanceFlags(appearanceBlob(params));

  if (hasS1) return FA_S1;
  if (hasBase || (hasOther2077 && !hasPL)) return FA_GAME;
  if (hasPL) return FA_PL;
  if (hasOther2077) return FA_GAME;
  if (hasS2) return FA_S2;
  return null;
}

function fallbackFromOld(value) {
  if (value === FA_S1 || value === "Edgerunners" || value === "Les deux") return FA_S1;
  if (value === FA_S2) return FA_S2;
  if (value === FA_PL) return FA_PL;
  return FA_GAME;
}

async function resolveFirstAppearance(character, delay) {
  const old = character.firstAppearance || character.source || "";
  const preferred = TITLE_OVERRIDES[character.name] || character.name;
  try {
    let wt = await fetchWikitext(preferred);
    await sleep(delay);
    if (!wt || !wt.includes("{{Infobox Character")) {
      const data = await fetchJson({
        action: "query",
        list: "search",
        srsearch: character.name,
        srlimit: "3",
        format: "json",
      });
      await sleep(delay);
      for (const hit of data.query?.search || []) {
        if (/\/Gallery$/i.test(hit.title)) continue;
        wt = await fetchWikitext(hit.title);
        await sleep(delay);
        if (wt && wt.includes("{{Infobox Character")) break;
      }
    }
    if (wt) {
      const inner = extractInfoboxInner(wt);
      const params = inner ? parseInfoboxParams(inner) : {};
      const fa = detectFirstAppearance(params, wt);
      if (fa) return fa;
    }
  } catch (e) {
    console.warn("[wiki fail]", character.name, e.message);
  }
  return fallbackFromOld(old);
}

async function main() {
  const { delay } = parseArgs(process.argv);
  const data = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));

  data.fieldMapping.firstAppearance = {
    header: "1ʳᵉ apparition",
    fonction: "Comparaison",
    columnWidth: "medium",
    order: [
      "Edgerunners Saison 1",
      "Jeu vidéo",
      "Phantom Liberty",
      "Edgerunners Saison 2",
    ],
    description:
      "Chronologie : Edgerunners Saison 1 → Jeu vidéo → Phantom Liberty → Edgerunners Saison 2. Une seule valeur : la première. Sert aussi au filtre « déjà vu ».",
  };
  delete data.fieldMapping.source;
  data.fieldPrevalence.firstAppearance = 1;
  delete data.fieldPrevalence.source;

  const counts = { [FA_S1]: 0, [FA_GAME]: 0, [FA_PL]: 0, [FA_S2]: 0 };
  const chars = data.characters;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const fa = await resolveFirstAppearance(ch, delay);
    delete ch.source;
    ch.firstAppearance = fa;
    counts[fa] = (counts[fa] || 0) + 1;
    if ((i + 1) % 50 === 0 || i + 1 === chars.length) {
      console.log(`${i + 1}/${chars.length}`, counts);
    }
  }

  fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2) + "\n");
  console.log("Done.", counts, "→", DATA_JSON);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
