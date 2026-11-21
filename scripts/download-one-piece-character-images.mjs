/**
 * Télécharge les portraits manquants des persos One Piece depuis onepiece.fandom.com
 * (image principale de la page, via l'API MediaWiki "pageimages").
 *
 * Les univers one-piece-manga et one-piece-anime partagent les mêmes images :
 * chaque image téléchargée est écrite dans les deux dossiers.
 *
 * Fichiers : public/universes/<univers>/characters/<character.id>.<ext>
 * Anti-doublon : une image dont le contenu (sha1) existe déjà pour un autre perso est ignorée
 * et signalée dans le rapport.
 *
 * Usage :
 *   node scripts/download-one-piece-character-images.mjs [--delay MS] [--limit N] [--dry-run]
 * Rapport : scripts/one-piece-images-report.json
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const UNIVERSES = ["one-piece-manga", "one-piece-anime"];
const API = "https://onepiece.fandom.com/api.php";
const UA = "worldle-one-piece-images/1.0 (educational; fan quiz)";
const EXTENSIONS = ["webp", "png", "jpg", "jpeg"];
const REPORT = path.join(__dirname, "one-piece-images-report.json");

/** id -> titre exact de la page sur onepiece.fandom.com (noms ambigus ou traduits). */
const TITLE_OVERRIDES = {
  "vinsmoke-sanji": "Sanji",
  "tony-tony-chopper": "Tony Tony Chopper",
  usopp: "Usopp",
  "dracule-mihawk": "Dracule Mihawk",
  "silvers-rayleigh": "Silvers Rayleigh",
  "captain-john": "John (Rocks Pirates)",
  "kurozumi-tama": "Tama",
  kikunojo: "Kikunojo",
  "kin-emon": "Kin'emon",
  "mozu-et-kiwi": "Mozu",
  "shandia-chief": "Shandia Chief",
  "minister-of-the-left": "Minister of the Left",
  "minister-of-the-right": "Minister of the Right",
  "wolf-elbaph": "Wolf (Elbaph)",
  "rocks-d-xebec": "Rocks D. Xebec",
  "scopper-gaban": "Scopper Gaban",
  "bell-mere": "Bell-mère",
  imu: "Imu",
  kuro: "Kuro",
  gin: "Gin",
  road: "Road",
  doll: "Doll",
  colon: "Colon",
  mag: "Mag",
  zeus: "Zeus",
  emet: "Emet",
  loki: "Loki",
  york: "York",
  lilith: "Lilith",
  shaka: "Shaka",
  atlas: "Atlas",
  edison: "Edison",
  pythagoras: "Pythagoras",
};

function parseArgs(argv) {
  const out = { delay: 300, limit: Infinity, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 300);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries({ ...params, format: "json" })) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Renvoie { title, url } de l'image principale d'une page, ou null. */
async function pageImage(title) {
  const data = await fetchJson({
    action: "query",
    titles: title,
    prop: "pageimages|categories",
    piprop: "original",
    cllimit: "max",
    redirects: "1",
  });
  const pages = Object.values(data.query?.pages || {});
  const page = pages.find((p) => !("missing" in p));
  if (!page) return null;
  const url = page.original?.source;
  if (!url) return { title: page.title, url: null };
  const cats = (page.categories || []).map((c) => c.title);
  const isCharacter = cats.some((c) => /Characters|Pirates|Marines|Humans|Giants|Fishmen|Male|Female/i.test(c));
  return { title: page.title, url, isCharacter, isDisambig: cats.some((c) => /Disambiguation/i.test(c)) };
}

function candidateTitles(c) {
  const list = [];
  if (TITLE_OVERRIDES[c.id]) list.push(TITLE_OVERRIDES[c.id]);
  list.push(c.name);
  for (const a of c.aliases || []) if (/^[\x20-\x7EÀ-ÿ]+$/.test(a)) list.push(a);
  return [...new Set(list)];
}

function existingImage(dir, id) {
  for (const ext of EXTENSIONS) {
    const p = path.join(dir, `${id}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const dirs = UNIVERSES.map((u) => path.join(ROOT, "public", "universes", u, "characters"));

  const chars = new Map();
  for (const u of UNIVERSES) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", `${u}.json`), "utf8"));
    for (const c of data.characters) if (!chars.has(c.id)) chars.set(c.id, c);
  }

  const knownHashes = new Map();
  for (const f of fs.readdirSync(dirs[0])) {
    knownHashes.set(sha1(fs.readFileSync(path.join(dirs[0], f))), path.parse(f).name);
  }

  const missing = [...chars.values()].filter((c) => dirs.some((d) => !existingImage(d, c.id)));
  console.log(`${missing.length} persos sans image`);

  const report = { ok: [], copied: [], notFound: [], duplicate: [], suspicious: [] };
  let n = 0;
  for (const c of missing) {
    if (n++ >= args.limit) break;

    // Image déjà présente dans l'autre univers : on la recopie.
    const src = dirs.map((d) => existingImage(d, c.id)).find(Boolean);
    if (src) {
      for (const d of dirs) if (!existingImage(d, c.id) && !args.dryRun) fs.copyFileSync(src, path.join(d, path.basename(src)));
      report.copied.push(c.id);
      continue;
    }

    let found = null;
    for (const t of candidateTitles(c)) {
      try {
        const r = await pageImage(t);
        await sleep(args.delay);
        if (r?.url && !r.isDisambig) {
          found = r;
          break;
        }
      } catch (e) {
        console.warn(`  ${c.id}: ${t} -> ${e.message}`);
      }
    }
    if (!found) {
      console.log(`✗ ${c.id} (${c.name}) : introuvable`);
      report.notFound.push({ id: c.id, name: c.name });
      continue;
    }

    const res = await fetch(found.url, { headers: { "User-Agent": UA } });
    await sleep(args.delay);
    if (!res.ok) {
      report.notFound.push({ id: c.id, name: c.name, error: `HTTP ${res.status}` });
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const h = sha1(buf);
    if (knownHashes.has(h)) {
      console.log(`= ${c.id} : même image que ${knownHashes.get(h)}, ignorée`);
      report.duplicate.push({ id: c.id, sameAs: knownHashes.get(h), page: found.title });
      continue;
    }
    knownHashes.set(h, c.id);

    const type = res.headers.get("content-type") || "";
    let ext = (new URL(found.url).pathname.match(/\.(png|jpe?g|webp)(?=\/|$)/i)?.[1] || "png").toLowerCase();
    if (type.includes("webp")) ext = "webp";
    if (!args.dryRun) for (const d of dirs) fs.writeFileSync(path.join(d, `${c.id}.${ext}`), buf);
    const entry = { id: c.id, name: c.name, page: found.title, file: `${c.id}.${ext}` };
    report.ok.push(entry);
    if (!found.isCharacter) report.suspicious.push(entry);
    console.log(`✓ ${c.id} <- ${found.title}`);
  }

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
  console.log(
    `\nTéléchargées: ${report.ok.length}, recopiées: ${report.copied.length}, introuvables: ${report.notFound.length}, doublons ignorés: ${report.duplicate.length}, à vérifier: ${report.suspicious.length}`,
  );
  console.log(`Rapport : ${path.relative(ROOT, REPORT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
