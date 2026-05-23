/**
 * Ajoute le champ arc (manga → arc) et rapporte les conflits manga/anime.
 * Usage: node scripts/apply-hxh-arc.mjs [--out path] [--dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  animeSegmentFromFirstAppearance,
  mangaSegmentFromFirstAppearance,
} from "./hxh-first-appearance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "data", "hunterxhunter.json");
const ARCS_PATH = path.join(ROOT, "data", "hunterxhunter-chapitres-arcs.json");

const ARC_ROWS = JSON.parse(fs.readFileSync(ARCS_PATH, "utf8")).arcs;
const ARC_ORDER = ["Inconnu", ...ARC_ROWS.map((a) => a.label)];

function parseArgv(argv) {
  const out = { outPath: DEFAULT_OUT, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
    else if (argv[i] === "--dry-run") out.dryRun = true;
  }
  return out;
}

/** Tous les numéros de chapitre dans la chaîne. */
function extractAllChapterNumbers(text) {
  return [...String(text || "").matchAll(/Chapitre\s+(\d+)/gi)].map((m) => parseInt(m[1], 10));
}

/** Priorité au segment « Officielle », sinon le plus grand numéro (début canon). */
function pickChapterNumber(text) {
  const raw = String(text || "");
  const official = raw.match(/Chapitre\s+(\d+)[^,)]*\([^)]*Officielle/i);
  if (official) return parseInt(official[1], 10);
  const nums = extractAllChapterNumbers(raw);
  if (!nums.length) return null;
  if (nums.length === 1) return nums[0];
  return Math.max(...nums);
}

function extractAllEpisodeNumbers(text) {
  return [...String(text || "").matchAll(/(?:Épisode|Episode)\s+(\d+)/gi)].map((m) =>
    parseInt(m[1], 10),
  );
}

function pickEpisodeNumber(text) {
  const raw = String(text || "");
  const official = raw.match(/(?:Épisode|Episode)\s+(\d+)[^/)]*\([^)]*Officielle/i);
  if (official) return parseInt(official[1], 10);
  const nums = extractAllEpisodeNumbers(raw);
  if (!nums.length) return null;
  if (nums.length === 1) return nums[0];
  return Math.max(...nums);
}

function chapterToArcLabel(ch) {
  if (typeof ch !== "number" || Number.isNaN(ch)) return null;
  for (const row of ARC_ROWS) {
    if (ch >= row.chapterFrom && ch <= row.chapterTo) return row.label;
  }
  return null;
}

function episodeToArcLabel(ep) {
  if (typeof ep !== "number" || Number.isNaN(ep)) return null;
  for (const row of ARC_ROWS) {
    if (ep >= row.episodeFrom && ep <= row.episodeTo) return row.label;
  }
  return null;
}

const opts = parseArgv(process.argv);
const data = JSON.parse(fs.readFileSync(opts.outPath, "utf8"));

const conflicts = {
  mangaVsAnime: [],
  multiChapterArcs: [],
  horsTable: { manga: [], anime: [] },
  sansChapitre: [],
};

for (const c of data.characters) {
  const mangaRaw = mangaSegmentFromFirstAppearance(c.firstAppearance);
  const animeRaw = animeSegmentFromFirstAppearance(c.firstAppearance);
  const chNums = extractAllChapterNumbers(mangaRaw);
  const chPick = pickChapterNumber(mangaRaw);
  const epPick = pickEpisodeNumber(animeRaw);

  const arcManga = chPick != null ? chapterToArcLabel(chPick) : null;
  const arcAnime = epPick != null ? episodeToArcLabel(epPick) : null;

  c.arc = arcManga ?? "Inconnu";

  if (chNums.length > 1) {
    const arcSet = new Set(chNums.map((n) => chapterToArcLabel(n)).filter(Boolean));
    if (arcSet.size > 1) {
      conflicts.multiChapterArcs.push({
        id: c.id,
        name: c.name,
        firstAppearance: c.firstAppearance,
        arcs: [...arcSet],
        retained: c.arc,
      });
    }
  }

  if (chPick != null && !arcManga) {
    conflicts.horsTable.manga.push({
      id: c.id,
      name: c.name,
      chapitre: chPick,
      firstAppearance: c.firstAppearance,
    });
  }
  if (epPick != null && !arcAnime) {
    conflicts.horsTable.anime.push({
      id: c.id,
      name: c.name,
      episode: epPick,
      firstAppearance: c.firstAppearance,
    });
  }

  if (arcManga && arcAnime && arcManga !== arcAnime) {
    conflicts.mangaVsAnime.push({
      id: c.id,
      name: c.name,
      firstAppearance: c.firstAppearance,
      arcManga,
      arcAnime,
      arc: c.arc,
    });
  }

  if (chPick == null) {
    conflicts.sansChapitre.push({ id: c.id, name: c.name, firstAppearance: c.firstAppearance });
  }
}

data.fieldMapping = data.fieldMapping || {};
data.fieldMapping.arc = {
  header: "Arc",
  fonction: "Comparaison",
  order: ARC_ORDER,
  description:
    "Arc anime 2011 au premier chapitre manga d’apparition (ordre chronologique). ↑ = plus tôt ; ↓ = plus tard. Bornes : data/hunterxhunter-chapitres-arcs.json.",
};

const withArc = data.characters.filter((c) => c.arc && c.arc !== "Inconnu").length;
data.fieldPrevalence = data.fieldPrevalence || {};
data.fieldPrevalence.arc = withArc / data.characters.length;

if (!opts.dryRun) {
  fs.writeFileSync(opts.outPath, JSON.stringify(data, null, 2), "utf8");
}

console.log(opts.dryRun ? "[dry-run]" : "Wrote", opts.outPath);
console.log("Persos avec arc:", withArc, "/", data.characters.length);
console.log("\n--- Conflits manga ≠ anime (arc retenu = manga) ---");
if (conflicts.mangaVsAnime.length === 0) console.log("(aucun)");
else {
  for (const x of conflicts.mangaVsAnime) {
    console.log(
      `- ${x.name} (${x.id}): manga→${x.arcManga}, anime→${x.arcAnime} | ${x.firstAppearance}`,
    );
  }
}
console.log("\n--- Multi-chapitres → arcs différents ---");
if (conflicts.multiChapterArcs.length === 0) console.log("(aucun)");
else {
  for (const x of conflicts.multiChapterArcs) {
    console.log(`- ${x.name}: ${x.firstAppearance} → [${x.arcs.join(", ")}], retenu: ${x.retained}`);
  }
}
console.log("\n--- Hors table (chapitre/épisode) ---");
console.log("Manga:", conflicts.horsTable.manga.length ? conflicts.horsTable.manga : "(aucun)");
console.log("Anime:", conflicts.horsTable.anime.length ? conflicts.horsTable.anime : "(aucun)");
console.log("\n--- Sans chapitre parsable (arc=Inconnu) ---");
console.log(
  conflicts.sansChapitre.length
    ? conflicts.sansChapitre.map((x) => `${x.name} (${x.firstAppearance || "—"})`).join(", ")
    : "(aucun)",
);
