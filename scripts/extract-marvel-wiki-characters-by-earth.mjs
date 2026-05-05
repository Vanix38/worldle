/**
 * Liste les fiches personnages du wiki par Terre (catégorie Category:Earth-XXX/Characters).
 * S’appuie sur les couples (univers, earth) présents dans data/marvel-cineverse.json,
 * en excluant earth 616 et 10005 par défaut.
 *
 * Usage:
 *   node scripts/extract-marvel-wiki-characters-by-earth.mjs [--out path] [--delay 350]
 *   [--cineverse path] [--include 616] [--include 10005]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const API = "https://marvel.fandom.com/api.php";
const UA = "worlddle-extract-wiki-characters/1.0 (local script)";

function argVal(name, def) {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return def;
  return process.argv[i + 1];
}
function hasFlag(name) {
  return process.argv.includes(name);
}

const OUT = path.resolve(argVal("--out", path.join(ROOT, "data", "marvel-wiki-characters-by-earth.json")));
const DELAY_MS = parseInt(argVal("--delay", "350"), 10) || 350;
const CINEVERSE_PATH = path.resolve(argVal("--cineverse", path.join(ROOT, "data", "marvel-cineverse.json")));

const EXCLUDED = new Set([616, 10005]);
if (hasFlag("--include-616")) EXCLUDED.delete(616);
if (hasFlag("--include-10005")) EXCLUDED.delete(10005);

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

/** Titres de pages (ns 0) dans une catégorie, pagination complète. */
async function categoryPageTitles(cmtitle) {
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
      cmtype: "page",
    };
    if (cmcontinue) q.cmcontinue = cmcontinue;
    if (continueToken) q.continue = continueToken;
    const data = await apiGet(q);
    for (const m of data.query?.categorymembers ?? []) {
      if (m.ns === 0 && m.title && !m.title.startsWith("User:")) titles.push(m.title);
    }
    if (!data.continue?.cmcontinue) break;
    cmcontinue = data.continue.cmcontinue;
    continueToken = data.continue.continue;
    await sleep(DELAY_MS);
  }
  return titles;
}

function wikiCategorySlugForEarth(earth) {
  if (earth === "TRN954" || (typeof earth === "string" && /^TRN\d+$/i.test(earth))) {
    return `Earth-${String(earth).replace(/^earth-/i, "").toUpperCase()}`;
  }
  if (typeof earth === "number" && Number.isFinite(earth)) return `Earth-${earth}`;
  return `Earth-${earth}`;
}

function mainSyncCollect() {
  const raw = JSON.parse(fs.readFileSync(CINEVERSE_PATH, "utf8"));
  /** @type {Map<string, { univers: string, earth: string|number, gameCharacters: { id: string, name: string }[] }>} */
  const byKey = new Map();
  for (const c of raw.characters ?? []) {
    const e = c.earth;
    if (EXCLUDED.has(e)) continue;
    const u = c.univers;
    if (e == null || !u) continue;
    const key = `${u}\0${e}`;
    if (!byKey.has(key)) {
      byKey.set(key, { univers: u, earth: e, gameCharacters: [] });
    }
    byKey.get(key).gameCharacters.push({ id: c.id, name: c.name });
  }
  return [...byKey.values()].sort((a, b) =>
    a.univers.localeCompare(b.univers) || String(a.earth).localeCompare(String(b.earth), undefined, { numeric: true }),
  );
}

async function main() {
  const groups = mainSyncCollect();
  const excludedList = [...EXCLUDED].sort((a, b) => a - b);
  const results = [];

  let i = 0;
  for (const g of groups) {
    i++;
    const slug = wikiCategorySlugForEarth(g.earth);
    const cmtitle = `Category:${slug}/Characters`;
    process.stderr.write(`\r${i}/${groups.length} ${cmtitle}…                    `);

    let characters = [];
    let error = null;
    try {
      characters = await categoryPageTitles(cmtitle);
      await sleep(DELAY_MS);
    } catch (e) {
      error = String(e.message || e);
    }

    results.push({
      univers: g.univers,
      earth: g.earth,
      wikiCategory: cmtitle,
      wikiCharacterCount: characters.length,
      wikiCharacters: characters.sort((a, b) => a.localeCompare(b)),
      gameCharacterCount: g.gameCharacters.length,
      gameCharacters: g.gameCharacters,
      error,
    });
  }
  process.stderr.write("\n");

  const payload = {
    source: API,
    generatedAt: new Date().toISOString(),
    excludedEarths: excludedList,
    cineversePath: CINEVERSE_PATH,
    earthGroups: results,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  const totalWiki = results.reduce((s, r) => s + r.wikiCharacterCount, 0);
  console.error("Écrit:", OUT, "—", results.length, "groupes,", totalWiki, "fiches wiki au total");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
