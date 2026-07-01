/**
 * Utilitaires épisodes One Piece (anti-spoiler + firstAppearance).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
export const SAGAS_PATH = path.join(ROOT, "data", "one-piece-anime-sagas.json");
export const ARC_EPISODES_CACHE = path.join(ROOT, "data", "one-piece-anime-arc-episodes.json");

/** Wiki EN arc title → libellé arc dans one-piece-anime.json */
export const WIKI_ARC_TO_GAME = {
  "Romance Dawn Arc": "Romance Dawn",
  "Orange Town Arc": "Orange Town",
  "Syrup Village Arc": "Syrup Village",
  "Baratie Arc": "Baratie",
  "Arlong Park Arc": "Arlong Park",
  "Loguetown Arc": "Logue Town",
  "Reverse Mountain Arc": "Reverse Mountain",
  "Whisky Peak Arc": "Whisky Peak",
  "Little Garden Arc": "Little Garden",
  "Drum Island Arc": "Drum Island",
  "Arabasta Arc": "Alabasta",
  "Jaya Arc": "Jaya",
  "Skypiea Arc": "Skypiea",
  "Long Ring Long Land Arc": "Long Ring Long Land",
  "Water 7 Arc": "Water Seven",
  "Enies Lobby Arc": "Enies Lobby",
  "Post-Enies Lobby Arc": "Enies Lobby",
  "Thriller Bark Arc": "Thriller Bark",
  "Sabaody Archipelago Arc": "Archipel Sabaody",
  "Amazon Lily Arc": "Amazon Lily",
  "Impel Down Arc": "Impel Down",
  "Marineford Arc": "Marineford",
  "Post-War Arc": "Marineford",
  "Return to Sabaody Arc": "Fishman Island",
  "Fish-Man Island Arc": "Fishman Island",
  "Punk Hazard Arc": "Punk Hazard",
  "Dressrosa Arc": "Dressrosa",
  "Zou Arc": "Zou",
  "Whole Cake Island Arc": "Whole Cake",
  "Levely Arc": "Whole Cake",
  "Wano Country Arc": "Wano Kuni",
  "Egghead Arc": "Egghead",
};

export function episodeLabel(n) {
  return `Épisode ${n}`;
}

export function episodeFromLabel(label) {
  const m = String(label).match(/(?:Épisode|Episode)\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : Infinity;
}

/** "Chapitre 5 ; Épisode 2" ou "Épisode 2" → "Épisode 2" */
export function toEpisodeOnly(label) {
  if (!label) return null;
  const m = String(label).match(/(?:Épisode|Episode)\s*(\d+)/i);
  return m ? episodeLabel(parseInt(m[1], 10)) : null;
}

export function parsePremiereRaw(raw) {
  const text = String(raw ?? "")
    .replace(/\[\d+\]/g, "")
    .replace(/\u200e/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const combined = text.match(
    /(?:chapter|chapitre)\s*(\d+)[^0-9]{0,48}(?:episode|épisode)\s*(\d+)/i,
  );
  if (combined) return episodeLabel(parseInt(combined[2], 10));
  const epOnly = text.match(/(?:episode|épisode)\s*(\d+)/i);
  if (epOnly) return episodeLabel(parseInt(epOnly[1], 10));
  return null;
}

/** Parse "Episodes: 46 (264-290, 293-302 and 304-312)" */
export function parseEpisodeNumbersFromWikiText(text) {
  const m = String(text).match(/Episodes?:\s*\d+\s*\(([^)]+)\)/i);
  if (!m) return [];
  const episodes = new Set();
  for (const part of m[1].split(/,\s*|\s+and\s+/i)) {
    const trimmed = part.trim();
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = parseInt(range[1], 10);
      const to = parseInt(range[2], 10);
      for (let n = from; n <= to; n++) episodes.add(n);
    } else if (/^\d+$/.test(trimmed)) {
      episodes.add(parseInt(trimmed, 10));
    }
  }
  return [...episodes].sort((a, b) => a - b);
}

function cleanArcTitle(raw) {
  return raw.replace(/\[\]$/, "").trim();
}

export async function fetchWikiStoryArcsHtml() {
  const res = await fetch(
    "https://onepiece.fandom.com/api.php?action=parse&page=Story_Arcs&prop=text&format=json",
    { headers: { "User-Agent": "worldle-onepiece-episodes/1.0 (educational)" } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.parse?.text?.["*"] || "";
}

export function parseArcEpisodesFromStoryArcsHtml(html) {
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

    const eps = parseEpisodeNumbersFromWikiText(ul.text());
    if (!eps.length) return;

    if (!byGameArc[gameArc]) byGameArc[gameArc] = new Set();
    for (const n of eps) byGameArc[gameArc].add(n);
  });

  const out = {};
  for (const [arc, set] of Object.entries(byGameArc)) {
    out[arc] = [...set].sort((a, b) => a - b);
  }
  return out;
}

export function loadArcEpisodes() {
  if (!fs.existsSync(ARC_EPISODES_CACHE)) return null;
  try {
    return JSON.parse(fs.readFileSync(ARC_EPISODES_CACHE, "utf8"));
  } catch {
    return null;
  }
}

export function saveArcEpisodes(data) {
  fs.writeFileSync(ARC_EPISODES_CACHE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function getArcEpisodes({ refresh = false } = {}) {
  if (!refresh) {
    const cached = loadArcEpisodes();
    if (cached) return cached;
  }
  const html = await fetchWikiStoryArcsHtml();
  const parsed = parseArcEpisodesFromStoryArcsHtml(html);
  saveArcEpisodes(parsed);
  return parsed;
}

export function buildExclusiveArcEpisodes(sagas, arcEpisodes) {
  const assigned = new Set();
  const byArc = {};

  for (const arcs of Object.values(sagas)) {
    for (const arc of arcs) {
      const nums = (arcEpisodes[arc] || [])
        .filter((n) => !assigned.has(n))
        .sort((a, b) => a - b);
      for (const n of nums) assigned.add(n);
      if (nums.length) byArc[arc] = nums;
    }
  }

  return { byArc, assigned };
}

/** Arc wiki contenant cet épisode (ordre saga → arc). */
export function findArcContainingEpisode(epNum, sagas, arcEpisodes) {
  for (const arcs of Object.values(sagas)) {
    for (const arc of arcs) {
      if ((arcEpisodes[arc] || []).includes(epNum)) return arc;
    }
  }
  return null;
}

/**
 * Épisode absent des listes wiki : place dans l'arc du créneau chronologique
 * (entre le max de l'arc précédent et le min du suivant).
 */
export function assignOrphanEpisode(epNum, sagas, byArc) {
  const arcsInOrder = Object.values(sagas).flat();
  for (let i = 0; i < arcsInOrder.length; i++) {
    const nums = byArc[arcsInOrder[i]];
    if (!nums?.length) continue;
    const max = nums[nums.length - 1];
    const nextArc = arcsInOrder.slice(i + 1).find((a) => byArc[a]?.length);
    const nextMin = nextArc ? byArc[nextArc][0] : Infinity;
    if (epNum > max && epNum < nextMin) return nextArc ?? arcsInOrder[i];
  }
  const withNums = arcsInOrder.filter((a) => byArc[a]?.length);
  const last = withNums[withNums.length - 1];
  const first = withNums[0];
  if (last && epNum > byArc[last][byArc[last].length - 1]) return last;
  if (first && epNum < byArc[first][0]) return first;
  return null;
}

export function buildGroupedOrder(characters, sagas, arcEpisodes) {
  const { byArc, assigned } = buildExclusiveArcEpisodes(sagas, arcEpisodes);

  const extraEps = new Set();
  for (const c of characters) {
    const epNum = episodeFromLabel(c.firstAppearance);
    if (!Number.isFinite(epNum) || epNum === Infinity || assigned.has(epNum)) continue;
    extraEps.add(epNum);
  }

  for (const epNum of [...extraEps].sort((a, b) => a - b)) {
    if (assigned.has(epNum)) continue;

    let arc =
      findArcContainingEpisode(epNum, sagas, arcEpisodes) ??
      (epNum === 0 ? Object.values(sagas)[0]?.[0] : null) ??
      assignOrphanEpisode(epNum, sagas, byArc);

    if (!arc) continue;

    if (!byArc[arc]) byArc[arc] = [];
    byArc[arc].push(epNum);
    assigned.add(epNum);
  }

  for (const arc of Object.keys(byArc)) {
    byArc[arc].sort((a, b) => a - b);
  }

  const order = {};
  for (const [saga, arcs] of Object.entries(sagas)) {
    const sagaBlock = {};
    for (const arc of arcs) {
      const nums = byArc[arc];
      if (nums?.length) sagaBlock[arc] = nums.map(episodeLabel);
    }
    if (Object.keys(sagaBlock).length > 0) order[saga] = sagaBlock;
  }
  return order;
}

/** Vérifie unicité et ordre chronologique global. */
export function validateEpisodeOrder(order) {
  const flat = [];
  for (const saga of Object.values(order)) {
    for (const eps of Object.values(saga)) flat.push(...eps);
  }
  const nums = flat.map(episodeFromLabel);
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
