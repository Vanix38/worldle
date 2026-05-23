/**
 * Fetch wiki FR statut for characters (batch by index among status=Inconnu).
 * Usage: node scripts/verify-hxh-status-batch.mjs [from] [to]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeHxhStatus } from "./hxh-normalize.mjs";

const API = "https://hunterxhunter.fandom.com/fr/api.php";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "hunterxhunter.json"), "utf8"),
);

const WIKI_TITLE = {
  "montutyupi": "Montutyupi",
  "neferupito": "Neferupito",
  "neon-nostrad": "Neon Nostrade",
  "sarah": "Sarah",
  "shaupfufu": "Shauapufu",
  "saccimonno-tocinno": "Saccimonno Tocinno",
  "sharnalk": "Sharnalk",
  "uvoguine": "Uvôguine",
};

/** Infobox wiki sans |statut= (corps / scrape) */
const MANUAL_WIKI_STATUT = {
  piedro: "Décédé",
  redwood: "Décédé",
  rover: "Décédé",
  spot: "Décédé",
  togari: "Décédé",
};

const INFOBOX_MARKERS = [
  "{{Infobox perso HxH",
  "{{Infobox perso",
  "{{Infobox char",
  "{{Infobox personnage",
];

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, {
    headers: { "User-Agent": "worldle-hxh-verify/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function extractInfoboxInner(wikitext) {
  let best = null;
  for (const marker of INFOBOX_MARKERS) {
    const pos = wikitext.indexOf(marker);
    if (pos === -1) continue;
    let i = pos + 2;
    let depth = 1;
    while (i < wikitext.length && depth > 0) {
      const two = wikitext.slice(i, i + 2);
      if (two === "{{") depth++;
      else if (two === "}}") depth--;
      i += 2;
    }
    let inner = wikitext.slice(pos + marker.length, i - 2).trim();
    if (!best || inner.length > best.length) best = inner;
  }
  return best;
}

function parseStatut(inner) {
  if (!inner) return "";
  const m = inner.match(/\|\s*statut\s*=\s*([^\n|]+)/i);
  return m ? m[1].replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1").trim() : "";
}

function clean(s) {
  return s.replace(/<[^>]+>/g, "").replace(/'''?/g, "").trim();
}

async function fetchStatut(title) {
  const data = await fetchJson({
    action: "parse",
    page: title,
    prop: "wikitext",
    format: "json",
    redirects: "1",
  });
  if (data.error) return { raw: "", page: title, err: data.error.info };
  const wt = data.parse?.wikitext?.["*"] || "";
  const inner = extractInfoboxInner(wt);
  return {
    raw: clean(parseStatut(inner)),
    page: data.parse?.title || title,
    err: null,
  };
}

const unknown = data.characters.filter((c) => c.status === "Inconnu");
const from = parseInt(process.argv[2] || "41", 10);
const to = parseInt(process.argv[3] || String(unknown.length), 10);
const batch = unknown.slice(from - 1, to);

console.log(`Batch ${from}-${to} (${batch.length} persos)\n`);
console.log("| # | Perso | Wiki statut | Normalisé actuel | Recommandé |");
console.log("|---|-------|-------------|------------------|------------|");

let i = from;
for (const c of batch) {
  const title = WIKI_TITLE[c.id] || c.name;
  const { raw: fetched, err } = await fetchStatut(title);
  await new Promise((r) => setTimeout(r, 300));
  const raw = MANUAL_WIKI_STATUT[c.id] || fetched;
  const norm = raw ? normalizeHxhStatus(raw) : "—";
  let reco = norm === "—" ? "Inconnu" : norm;
  if (c.id === "neon-nostrad" || c.id === "pairo") reco = "Vivant";
  console.log(
    `| ${i} | ${c.name} | ${err ? err : raw || "—"} | ${norm} | **${reco}** |`,
  );
  i++;
}
