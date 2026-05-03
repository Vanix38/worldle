/**
 * Retire les persos dont la fiche wiki FR n’a pas de début manga « Naruto » ch. 1–700
 * (films, jeux, anime-only, Boruto…). Supprime aussi les images correspondantes.
 *
 * Usage: node scripts/prune-naruto-non-manga-media.mjs [--dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "naruto.json");
const CHAR_DIR = path.join(ROOT, "public", "universes", "naruto", "characters");

const API = "https://naruto.fandom.com/fr/api.php";

function extractChapterNumber(text) {
  const m = String(text || "").match(/Chapitre\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
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

/** Aligné sur scripts/scrape-naruto-fandom.mjs */
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

function classicNarutoMangaChapter(params) {
  if (isBorutoFranchiseCharacter(params)) return null;
  const dm = params["Début manga"] || "";
  let ch = extractChapterNumber(dm) ?? extractChapterNumber(cleanWikiText(dm));
  if (ch !== null && ch >= 1 && ch <= 700) return ch;
  return null;
}

function shouldKeepMangaCanon(params) {
  return classicNarutoMangaChapter(params) !== null;
}

async function fetchWikitext(title) {
  const url = new URL(API);
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");
  const r = await fetch(url, {
    headers: { "User-Agent": "worldle-naruto-prune/1.0 (educational)" },
  });
  if (!r.ok) return { error: `HTTP ${r.status}`, wikitext: "" };
  const j = await r.json();
  if (j.error) return { error: j.error.info || JSON.stringify(j.error), wikitext: "" };
  const wt = j.parse?.wikitext?.["*"];
  return { error: null, wikitext: typeof wt === "string" ? wt : "" };
}

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

function unlinkImage(id) {
  for (const ext of [".webp", ".png", ".jpg", ".jpeg", ".gif"]) {
    const p = path.join(CHAR_DIR, `${id}${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const opts = parseArgs(process.argv);
  const raw = fs.readFileSync(DATA, "utf8");
  const data = JSON.parse(raw);
  const chars = data.characters || [];

  const remove = [];
  const failed = [];

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const title = c.name;
    const { error, wikitext } = await fetchWikitext(title);
    await sleep(350);

    if (error || !wikitext) {
      failed.push({ id: c.id, name: title, error: error || "empty wikitext" });
      continue;
    }

    const inner = extractInfoboxInner(wikitext);
    if (!inner) {
      remove.push({ id: c.id, name: title, reason: "pas d’infobox Personnage" });
      continue;
    }

    const params = parseInfoboxParams(inner);
    if (!shouldKeepMangaCanon(params)) {
      remove.push({
        id: c.id,
        name: title,
        reason: "pas de début manga Naruto ch.1–700 (ou Boruto / hors manga)",
      });
    }
  }

  console.log(
    `À retirer: ${remove.length}${opts.dryRun ? " (dry-run)" : ""}`,
    remove.map((x) => x.id).join(", ") || "(aucun)",
  );
  if (failed.length) {
    console.warn(
      "Échecs API / titre (conservés):",
      failed.map((f) => `${f.id}:${f.error}`).join("; "),
    );
  }

  if (opts.dryRun) process.exit(0);

  const removeIds = new Set(remove.map((x) => x.id));
  data.characters = chars.filter((c) => !removeIds.has(c.id));

  fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + "\n");

  for (const id of removeIds) unlinkImage(id);

  console.log(`Écrit ${DATA}, images supprimées pour ${removeIds.size} id(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
