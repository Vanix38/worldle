/**
 * Ajoute les personnages manquants depuis Catégorie:Personnages (wiki FR).
 * Préserve fieldMapping / personnages existants. Nouveaux : difficulte=Impossible, role=Fonctionnel.
 *
 * Usage:
 *   node scripts/add-hxh-missing-from-wiki.mjs [--dry-run] [--delay MS] [--limit N]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildCharacter,
  buildFieldPrevalence,
  canonicalizeParams,
  extractInfoboxInner,
  fetchCategoryTitles,
  fetchWikitext,
  parseInfoboxParams,
  sleep,
  titleToId,
} from "./scrape-hunterxhunter-fandom.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "hunterxhunter.json");
const ARCS_PATH = path.join(ROOT, "data", "hunterxhunter-chapitres-arcs.json");

const ARC_ROWS = JSON.parse(fs.readFileSync(ARCS_PATH, "utf8")).arcs;

function parseArgv(argv) {
  const out = { dryRun: false, delay: 300, limit: Infinity };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 300);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
  }
  return out;
}

function pickEpisodeNumber(text) {
  const m = String(text || "").match(/(?:Épisode|Episode)\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function episodeToArcLabel(ep) {
  if (typeof ep !== "number" || Number.isNaN(ep)) return null;
  for (const row of ARC_ROWS) {
    if (ep >= row.episodeFrom && ep <= row.episodeTo) return row.label;
  }
  return null;
}

function applyArc(char) {
  const ep = pickEpisodeNumber(char.firstAppearance);
  const arc = ep != null ? episodeToArcLabel(ep) : null;
  char.arc = arc ?? "Inconnu";
}

function finalizeNewChar(char) {
  applyArc(char);
  char.role = "Fonctionnel";
  char.difficulte = "Impossible";
  if (!char.status) char.status = "Inconnu";
  if (!char.gender) char.gender = "Inconnu";
  return char;
}

async function main() {
  const opts = parseArgv(process.argv);
  const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const existingIds = new Set(data.characters.map((c) => c.id));

  console.log("JSON existant:", existingIds.size);
  const titles = await fetchCategoryTitles(Infinity, opts.delay);
  console.log("Titres wiki:", titles.length);

  const missingTitles = titles.filter((t) => !existingIds.has(titleToId(t)));
  console.log("Manquants (par id):", missingTitles.length);

  const toFetch = missingTitles.slice(0, opts.limit);
  if (opts.limit < Infinity) console.log("Limit:", toFetch.length);

  const added = [];
  let skipNoBox = 0;
  let fail = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const title = toFetch[i];
    try {
      const { wikitext, resolvedTitle, error } = await fetchWikitext(title);
      await sleep(opts.delay);
      if (error) {
        fail++;
        console.warn("[fail]", title, error);
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      let char;
      if (!inner) {
        skipNoBox++;
        console.warn("[stub]", title);
        char = finalizeNewChar({
          id: titleToId(resolvedTitle),
          name: resolvedTitle.replace(/_/g, " "),
        });
      } else {
        const params = canonicalizeParams(parseInfoboxParams(inner));
        char = finalizeNewChar(buildCharacter(resolvedTitle, params));
      }
      if (existingIds.has(char.id)) {
        console.warn("[dup]", char.id, title);
        continue;
      }
      added.push(char);
      existingIds.add(char.id);
      if ((i + 1) % 25 === 0 || i === toFetch.length - 1) {
        console.log("Progress", i + 1, "/", toFetch.length, "ajoutés", added.length);
      }
    } catch (e) {
      fail++;
      console.warn("[err]", title, e.message);
      await sleep(opts.delay * 2);
    }
  }

  console.log("Ajoutés:", added.length, "| sans infobox:", skipNoBox, "| erreurs:", fail);

  if (opts.dryRun) {
    console.log("Dry-run — premiers ids:", added.slice(0, 15).map((c) => c.id).join(", "));
    return;
  }

  data.characters = [...data.characters, ...added].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
  data.fieldPrevalence = buildFieldPrevalence(data.characters, data.fieldMapping);

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2), "utf8");
  console.log("Wrote", OUT);
  console.log("Total personnages:", data.characters.length);

  const diffs = {};
  for (const c of data.characters) {
    diffs[c.difficulte || "?"] = (diffs[c.difficulte || "?"] || 0) + 1;
  }
  console.log("Difficultés:", diffs);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
