/**
 * Télécharge les portraits wiki des personnages marvel-cineverse sans fichier local.
 * Destination : public/universes/marvel-cineverse/characters/<id>.<ext>
 *
 * Sources :
 *   1. marvel.fandom.com — Title (Earth-XXX)
 *   2. marvelcinematicuniverse.fandom.com — Title (MCU / pages croisées)
 *
 * Usage:
 *   node scripts/download-marvel-cineverse-missing-images.mjs
 *   node scripts/download-marvel-cineverse-missing-images.mjs --skip-existing --delay 300
 *   node scripts/download-marvel-cineverse-missing-images.mjs --limit 20 --dry-run
 *   node scripts/download-marvel-cineverse-missing-images.mjs --resume
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "marvel-cineverse.json");
const OUT_DIR = path.join(ROOT, "public", "universes", "marvel-cineverse", "characters");
const REPORT_PATH = path.join(ROOT, "data", "marvel-cineverse-missing-images-report.json");

const MARVEL_API = "https://marvel.fandom.com/api.php";
const MCU_API = "https://marvelcinematicuniverse.fandom.com/api.php";
const UA = "worlddle-marvel-images/1.0 (local educational script)";
const EXTS = [".webp", ".png", ".jpg", ".jpeg"];

/** universe + earth (jeu) → slug Earth wiki marvel.fandom */
const WIKI_EARTH = [
  ["MCU", 616, "199999"],
  ["MCU", 838, "838"],
  ["MCU", 828, "828"],
  ["MCU", 617, "617"],
  ["MCU", 21818, "21818"],
  ["MCU", 72124, "72124"],
  ["MCU", 82111, "82111"],
  ["MCU", 86445, "86445"],
  ["MCU", 91233, "91233"],
  ["MCU", "TRN954", "TRN954"],
  ["Fox X-Men", 10005, "10005"],
  ["Fox X-Men", 17315, "17315"],
  ["Fox X-Men", 41633, "41633"],
  ["Fox Fantastiques", 121698, "121698"],
  ["SSU", 688, "688B"],
  ["Raimi-Verse", 96283, "96283"],
  ["Webb-Verse", 120703, "120703"],
  ["Spider-Verse", 8311, "1610B"],
  ["Indépendants", 26320, "26320"],
  ["Indépendants", 701306, "701306"],
  ["Indépendants", 121347, "121347"],
  ["Indépendants", 400083, "400083"],
  ["Indépendants", 47281, "47281"],
  ["Indépendants", 58732, "58732"],
  ["Indépendants", 58460, "58460"],
];

function parseArgs(argv) {
  const out = {
    delay: 280,
    limit: Infinity,
    skipExisting: true,
    dryRun: false,
    resume: false,
    thumbSize: 800,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-existing") out.skipExisting = true;
    else if (a === "--no-skip-existing") out.skipExisting = false;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--resume") out.resume = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 280);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--thumb-size") out.thumbSize = Math.max(100, parseInt(argv[++i], 10) || 800);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wikiEarthFor(universe, earth) {
  const hit = WIKI_EARTH.find(
    ([u, e]) => u === universe && String(e) === String(earth),
  );
  return hit ? hit[2] : String(earth ?? "").replace(/^(terre|earth)-?/i, "") || null;
}

function stripParen(s) {
  return String(s ?? "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();
}

function existsAny(id) {
  return EXTS.some((e) => fs.existsSync(path.join(OUT_DIR, `${id}${e}`)));
}

function extFromUrl(u) {
  try {
    const p = new URL(u).pathname;
    const base = path.basename(p.split("/revision/")[0] || p);
    const e = path.extname(base).toLowerCase();
    if (e === ".jpeg") return ".jpg";
    if ([".png", ".jpg", ".webp", ".gif"].includes(e)) return e;
  } catch {
    /* ignore */
  }
  return ".jpg";
}

async function apiGet(api, params) {
  const u = new URL(api);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(u, { headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      lastErr = err;
      await sleep(600 * (attempt + 1));
    }
  }
  throw lastErr || new Error("apiGet failed");
}

/** Batch pageimages (jusqu’à 40 titres). Retourne Map title → imageUrl */
async function fetchPageImages(api, titles, thumbSize) {
  const map = new Map();
  if (!titles.length) return map;
  const data = await apiGet(api, {
    action: "query",
    titles: titles.join("|"),
    prop: "pageimages",
    piprop: "thumbnail|name",
    pithumbsize: String(thumbSize),
    format: "json",
    redirects: "1",
  });
  const redirects = new Map(
    (data.query?.redirects || []).map((r) => [r.from, r.to]),
  );
  const normalized = new Map(
    (data.query?.normalized || []).map((n) => [n.from, n.to]),
  );
  const byTitle = new Map();
  for (const page of Object.values(data.query?.pages || {})) {
    if (!page || page.missing || page.invalid) continue;
    const url = page.thumbnail?.source;
    if (url) byTitle.set(page.title, url);
  }
  for (const t of titles) {
    let cur = t;
    if (normalized.has(cur)) cur = normalized.get(cur);
    if (redirects.has(cur)) cur = redirects.get(cur);
    if (byTitle.has(cur)) map.set(t, byTitle.get(cur));
    else if (byTitle.has(t)) map.set(t, byTitle.get(t));
  }
  return map;
}

function nameCandidates(ch) {
  const out = [];
  const push = (v) => {
    const s = stripParen(v);
    if (!s || s.length < 2) return;
    if (!out.includes(s)) out.push(s);
  };
  push(ch.name);
  if (Array.isArray(ch.aliases)) for (const a of ch.aliases) push(a);
  // id → nom approximatif (avant suffixe universe-earth)
  const id = String(ch.id || "");
  const m = id.match(
    /^(.+?)-(?:mcu|fox_x_men|fox_fantastiques|ssu|raimi_verse|webb_verse|spider_verse|independants)-/i,
  );
  if (m) {
    push(
      m[1]
        .replace(/_/g, " ")
        .replace(/\byoung\b|\badult\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    );
  }
  return out;
}

function buildTitleQueries(ch) {
  const earth = wikiEarthFor(ch.universe, ch.earth);
  const names = nameCandidates(ch);
  const marvelTitles = [];
  const mcuTitles = [];
  for (const n of names) {
    if (earth) {
      const t = `${n} (Earth-${earth})`;
      if (!marvelTitles.includes(t)) marvelTitles.push(t);
    }
    if (ch.universe === "MCU" || ch.universe === "Fox X-Men" || ch.universe === "Fox Fantastiques" || ch.universe === "SSU" || ch.universe === "Raimi-Verse" || ch.universe === "Webb-Verse" || ch.universe === "Spider-Verse") {
      if (!mcuTitles.includes(n)) mcuTitles.push(n);
    }
  }
  return { marvelTitles, mcuTitles };
}

async function downloadFile(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function loadReport() {
  if (!fs.existsSync(REPORT_PATH)) return { done: {}, failed: {}, skipped: {} };
  try {
    return JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  } catch {
    return { done: {}, failed: {}, skipped: {} };
  }
}

function saveReport(report) {
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function resolveImageUrl(ch, thumbSize, delayMs) {
  const { marvelTitles, mcuTitles } = buildTitleQueries(ch);

  // Batch marvel titles
  for (let i = 0; i < marvelTitles.length; i += 40) {
    const chunk = marvelTitles.slice(i, i + 40);
    const map = await fetchPageImages(MARVEL_API, chunk, thumbSize);
    for (const t of chunk) {
      if (map.has(t)) return { url: map.get(t), via: `marvel:${t}` };
    }
    if (i + 40 < marvelTitles.length) await sleep(delayMs);
  }

  // MCU wiki fallback
  for (let i = 0; i < mcuTitles.length; i += 40) {
    const chunk = mcuTitles.slice(i, i + 40);
    const map = await fetchPageImages(MCU_API, chunk, thumbSize);
    for (const t of chunk) {
      if (map.has(t)) return { url: map.get(t), via: `mcu:${t}` };
    }
    if (i + 40 < mcuTitles.length) await sleep(delayMs);
  }

  return null;
}

async function main() {
  const opts = parseArgs(process.argv);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8").replace(/^\uFEFF/, ""));
  const characters = Array.isArray(data.characters) ? data.characters : [];

  let report = opts.resume ? loadReport() : { done: {}, failed: {}, skipped: {} };
  const alreadyOk = new Set(Object.keys(report.done || {}));

  const missing = characters.filter((c) => {
    if (!c?.id) return false;
    if (opts.skipExisting && existsAny(c.id)) return false;
    if (opts.resume && alreadyOk.has(c.id)) return false;
    return true;
  });

  const queue = missing.slice(0, opts.limit);
  console.log(
    `missing local: ${missing.length} / ${characters.length} · queue: ${queue.length} · delay ${opts.delay}ms`,
  );

  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (let i = 0; i < queue.length; i++) {
    const ch = queue[i];
    const label = `[${i + 1}/${queue.length}] ${ch.id}`;

    if (opts.skipExisting && existsAny(ch.id)) {
      skip++;
      report.skipped[ch.id] = "exists";
      process.stdout.write(`\r${label} skip exists          `);
      continue;
    }

    try {
      const hit = await resolveImageUrl(ch, opts.thumbSize, opts.delay);
      if (!hit) {
        fail++;
        report.failed[ch.id] = { name: ch.name, reason: "no-image" };
        process.stdout.write(`\r${label} FAIL no-image          `);
      } else if (opts.dryRun) {
        ok++;
        report.done[ch.id] = { via: hit.via, dryRun: true, url: hit.url };
        process.stdout.write(`\r${label} DRY ${hit.via.slice(0, 40)}          `);
      } else {
        const ext = extFromUrl(hit.url);
        const dest = path.join(OUT_DIR, `${ch.id}${ext}`);
        await downloadFile(hit.url, dest);
        ok++;
        report.done[ch.id] = { via: hit.via, file: path.basename(dest) };
        process.stdout.write(`\r${label} OK ${path.basename(dest)}          `);
      }
    } catch (err) {
      fail++;
      report.failed[ch.id] = { name: ch.name, reason: String(err?.message || err) };
      process.stdout.write(`\r${label} ERR ${String(err?.message || err).slice(0, 40)}          `);
    }

    if ((i + 1) % 25 === 0) saveReport(report);
    await sleep(opts.delay);
  }

  report.summary = {
    at: new Date().toISOString(),
    queue: queue.length,
    ok,
    fail,
    skip,
    doneTotal: Object.keys(report.done).length,
    failedTotal: Object.keys(report.failed).length,
  };
  saveReport(report);
  console.log(`\nDONE ok=${ok} fail=${fail} skip=${skip}`);
  console.log(`report ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
