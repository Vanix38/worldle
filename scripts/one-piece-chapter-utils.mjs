/**
 * Utilitaires chapitres One Piece manga (anti-spoiler + firstAppearance).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { WIKI_ARC_TO_GAME } from "./one-piece-episode-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
export const SAGAS_PATH = path.join(ROOT, "data", "one-piece-anime-sagas.json");
export const ARC_CHAPTERS_CACHE = path.join(ROOT, "data", "one-piece-manga-arc-chapters.json");

export function chapterLabel(n) {
  return `Chapitre ${n}`;
}

export function chapterFromLabel(label) {
  const m = String(label).match(/(?:Chapitre|Chapter)\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : Infinity;
}

export function toChapterOnly(label) {
  if (!label) return null;
  const m = String(label).match(/(?:Chapitre|Chapter)\s*(\d+)/i);
  return m ? chapterLabel(parseInt(m[1], 10)) : null;
}

export function parseChapterFromRaw(raw) {
  const text = String(raw ?? "")
    .replace(/\[\d+\]/g, "")
    .replace(/\u200e/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const combined = text.match(
    /(?:chapter|chapitre)\s*(\d+)[^0-9]{0,48}(?:episode|épisode)\s*(\d+)/i,
  );
  if (combined) return chapterLabel(parseInt(combined[1], 10));
  const chOnly = text.match(/(?:chapter|chapitre)\s*(\d+)/i);
  if (chOnly) return chapterLabel(parseInt(chOnly[1], 10));
  return null;
}

/** Parse "Chapters: 56 (375-430)" */
export function parseChapterNumbersFromWikiText(text) {
  const m = String(text).match(/Chapters?:\s*\d+\s*\(([^)]+)\)/i);
  if (!m) return [];
  const chapters = new Set();
  for (const part of m[1].split(/,\s*|\s+and\s+/i)) {
    const trimmed = part.trim();
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = parseInt(range[1], 10);
      const to = parseInt(range[2], 10);
      for (let n = from; n <= to; n++) chapters.add(n);
    } else if (/^\d+$/.test(trimmed)) {
      chapters.add(parseInt(trimmed, 10));
    }
  }
  return [...chapters].sort((a, b) => a - b);
}

function cleanArcTitle(raw) {
  return raw.replace(/\[\]$/, "").trim();
}

export async function fetchWikiStoryArcsHtml() {
  const res = await fetch(
    "https://onepiece.fandom.com/api.php?action=parse&page=Story_Arcs&prop=text&format=json",
    { headers: { "User-Agent": "worldle-onepiece-chapters/1.0 (educational)" } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.parse?.text?.["*"] || "";
}

export function parseArcChaptersFromStoryArcsHtml(html) {
  const $ = cheerio.load(html);
  const byGameArc = {};

  $("h4").each((_, h4) => {
    const rawTitle = cleanArcTitle($(h4).text().replace(/\s+/g, " ").trim());
    if (!/ Arc$/.test(rawTitle)) return;

    const gameArc = WIKI_ARC_TO_GAME[rawTitle];
    if (!gameArc) return;

    let ul = $(h4).next();
    while (ul.length && ul[0].tagName !== "ul") ul = ul.next();
    if (!ul.length) return;

    const chs = parseChapterNumbersFromWikiText(ul.text());
    if (!chs.length) return;

    if (!byGameArc[gameArc]) byGameArc[gameArc] = new Set();
    for (const n of chs) byGameArc[gameArc].add(n);
  });

  const out = {};
  for (const [arc, set] of Object.entries(byGameArc)) {
    out[arc] = [...set].sort((a, b) => a - b);
  }
  return out;
}

export function loadArcChapters() {
  if (!fs.existsSync(ARC_CHAPTERS_CACHE)) return null;
  try {
    return JSON.parse(fs.readFileSync(ARC_CHAPTERS_CACHE, "utf8"));
  } catch {
    return null;
  }
}

export function saveArcChapters(data) {
  fs.writeFileSync(ARC_CHAPTERS_CACHE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function getArcChapters({ refresh = false } = {}) {
  if (!refresh) {
    const cached = loadArcChapters();
    if (cached) return cached;
  }
  const html = await fetchWikiStoryArcsHtml();
  const parsed = parseArcChaptersFromStoryArcsHtml(html);
  saveArcChapters(parsed);
  return parsed;
}

export function buildExclusiveArcChapters(sagas, arcChapters) {
  const assigned = new Set();
  const byArc = {};

  for (const arcs of Object.values(sagas)) {
    for (const arc of arcs) {
      const nums = (arcChapters[arc] || [])
        .filter((n) => !assigned.has(n))
        .sort((a, b) => a - b);
      for (const n of nums) assigned.add(n);
      if (nums.length) byArc[arc] = nums;
    }
  }

  return { byArc, assigned };
}

export function findArcContainingChapter(chNum, sagas, arcChapters) {
  for (const arcs of Object.values(sagas)) {
    for (const arc of arcs) {
      if ((arcChapters[arc] || []).includes(chNum)) return arc;
    }
  }
  return null;
}

export function assignOrphanChapter(chNum, sagas, byArc) {
  const arcsInOrder = Object.values(sagas).flat();
  for (let i = 0; i < arcsInOrder.length; i++) {
    const nums = byArc[arcsInOrder[i]];
    if (!nums?.length) continue;
    const max = nums[nums.length - 1];
    const nextArc = arcsInOrder.slice(i + 1).find((a) => byArc[a]?.length);
    const nextMin = nextArc ? byArc[nextArc][0] : Infinity;
    if (chNum > max && chNum < nextMin) return nextArc ?? arcsInOrder[i];
  }
  const withNums = arcsInOrder.filter((a) => byArc[a]?.length);
  const last = withNums[withNums.length - 1];
  const first = withNums[0];
  if (last && chNum > byArc[last][byArc[last].length - 1]) return last;
  if (first && chNum < byArc[first][0]) return first;
  return null;
}

export function buildGroupedOrder(characters, sagas, arcChapters) {
  const { byArc, assigned } = buildExclusiveArcChapters(sagas, arcChapters);

  const extra = new Set();
  for (const c of characters) {
    const chNum = chapterFromLabel(c.firstAppearance);
    if (!Number.isFinite(chNum) || chNum === Infinity || assigned.has(chNum)) continue;
    extra.add(chNum);
  }

  for (const chNum of [...extra].sort((a, b) => a - b)) {
    if (assigned.has(chNum)) continue;

    let arc =
      findArcContainingChapter(chNum, sagas, arcChapters) ??
      assignOrphanChapter(chNum, sagas, byArc);

    if (!arc) continue;

    if (!byArc[arc]) byArc[arc] = [];
    byArc[arc].push(chNum);
    assigned.add(chNum);
  }

  for (const arc of Object.keys(byArc)) {
    byArc[arc].sort((a, b) => a - b);
  }

  const order = {};
  for (const [saga, arcs] of Object.entries(sagas)) {
    const sagaBlock = {};
    for (const arc of arcs) {
      const nums = byArc[arc];
      if (nums?.length) sagaBlock[arc] = nums.map(chapterLabel);
    }
    if (Object.keys(sagaBlock).length > 0) order[saga] = sagaBlock;
  }
  return order;
}

export function validateChapterOrder(order) {
  const flat = [];
  for (const saga of Object.values(order)) {
    for (const chs of Object.values(saga)) flat.push(...chs);
  }
  const nums = flat.map(chapterFromLabel);
  const issues = [];
  const seen = new Set();
  for (let i = 0; i < flat.length; i++) {
    if (seen.has(flat[i])) issues.push(`doublon: ${flat[i]}`);
    seen.add(flat[i]);
    if (i > 0 && nums[i] < nums[i - 1]) {
      issues.push(`ordre: ${flat[i - 1]} → ${flat[i]}`);
    }
  }
  return { flat, issues };
}
