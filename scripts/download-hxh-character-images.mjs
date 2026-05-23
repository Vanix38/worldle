/**
 * Télécharge les portraits depuis la liste wiki FR des personnages.
 * Source : https://hunterxhunter.fandom.com/fr/wiki/Liste_des_personnages_d%27Hunter_x_Hunter
 * Fichiers : public/universes/hunterxhunter/characters/<character.id>.<ext>
 *
 * Usage:
 *   node scripts/download-hxh-character-images.mjs [--delay MS] [--skip-existing] [--limit N]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_JSON = path.join(ROOT, "data", "hunterxhunter.json");
const OUT_DIR = path.join(ROOT, "public", "universes", "hunterxhunter", "characters");
const API = "https://hunterxhunter.fandom.com/fr/api.php";
const LIST_PAGE = "Liste des personnages d'Hunter x Hunter";

function parseArgs(argv) {
  const out = { delay: 300, limit: Infinity, skipExisting: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-existing") out.skipExisting = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 300);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function titleToId(title) {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normLabel(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/†/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": "worldle-hxh-images/1.0 (local)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** wikiTitle → nom de fichier (sans préfixe Fichier:). */
function parseListWikitext(wikitext) {
  const map = new Map();
  const rows = wikitext.split(/\|-\s*/);
  let pendingFiles = null;

  for (const row of rows) {
    const cells = [...row.matchAll(/!\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
    if (cells.length === 0) continue;

    const isFile = (c) => /^(?:Fichier|File):/i.test(c);
    const files = cells.filter(isFile).map((c) => c.replace(/^(?:Fichier|File):\s*/i, "").trim());
    const names = cells.filter((c) => !isFile(c));

    if (files.length > 0 && files.length === cells.length) {
      pendingFiles = files;
      continue;
    }

    if (pendingFiles && names.length > 0) {
      const n = Math.min(pendingFiles.length, names.length);
      for (let i = 0; i < n; i++) {
        if (!map.has(names[i])) map.set(names[i], pendingFiles[i]);
      }
      pendingFiles = null;
      continue;
    }

    pendingFiles = null;
  }

  return map;
}

async function fetchListWikitext() {
  const data = await fetchJson({
    action: "parse",
    page: LIST_PAGE,
    prop: "wikitext",
    format: "json",
    redirects: "1",
  });
  if (data.error) throw new Error(data.error.info || JSON.stringify(data.error));
  return data.parse?.wikitext?.["*"] || "";
}

async function getImageDownloadUrl(fileName) {
  const title = /^fichier:/i.test(fileName) || /^file:/i.test(fileName) ? fileName : `Fichier:${fileName}`;
  const data = await fetchJson({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
  });
  const page = data.query?.pages && Object.values(data.query.pages)[0];
  if (!page || page.missing || page.invalid) return null;
  return page.imageinfo?.[0]?.url || null;
}

async function getPageThumbnailUrl(pageTitle) {
  const data = await fetchJson({
    action: "query",
    titles: pageTitle,
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: 500,
    format: "json",
    redirects: "1",
  });
  const page = data.query?.pages && Object.values(data.query.pages)[0];
  return page?.thumbnail?.source || null;
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
  return ".png";
}

async function downloadFile(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": "worldle-hxh-images/1.0 (local)" } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function existsAnyExtension(id) {
  for (const ext of [".webp", ".png", ".jpg", ".jpeg"]) {
    if (fs.existsSync(path.join(OUT_DIR, `${id}${ext}`))) return true;
  }
  return false;
}

function buildLookup(characters, listMap) {
  const byId = new Map();
  const byNorm = new Map();
  const fileByNorm = new Map();

  for (const [wikiTitle, file] of listMap) {
    byId.set(titleToId(wikiTitle), { wikiTitle, file });
    fileByNorm.set(normLabel(wikiTitle), { wikiTitle, file });
  }

  for (const c of characters) {
    byNorm.set(normLabel(c.name), c);
    if (c.aliases) {
      for (const a of c.aliases) byNorm.set(normLabel(a), c);
    }
  }

  return { byId, byNorm, fileByNorm };
}

function resolveListEntry(ch, lookup) {
  const { byId, byNorm, fileByNorm } = lookup;

  if (byId.has(ch.id)) return byId.get(ch.id);

  const fromName = fileByNorm.get(normLabel(ch.name));
  if (fromName) return fromName;

  if (ch.aliases) {
    for (const a of ch.aliases) {
      const hit = fileByNorm.get(normLabel(a));
      if (hit) return hit;
    }
  }

  for (const hit of lookup.byId.values()) {
    const wn = normLabel(hit.wikiTitle);
    const cn = normLabel(ch.name);
    if (wn.includes(cn) || cn.includes(wn)) return hit;
  }

  return null;
}

async function main() {
  const opts = parseArgs(process.argv);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const data = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));
  const characters = Array.isArray(data.characters) ? data.characters : [];

  console.log("Fetching list wikitext…");
  const wikitext = await fetchListWikitext();
  const listMap = parseListWikitext(wikitext);
  console.log("Portraits on list page:", listMap.size);

  const lookup = buildLookup(characters, listMap);

  let ok = 0;
  let skip = 0;
  let noImage = 0;
  let fail = 0;
  const unmatched = [];

  const todo = opts.limit < Infinity ? characters.slice(0, opts.limit) : characters;

  for (let i = 0; i < todo.length; i++) {
    const ch = todo[i];
    const id = ch.id;
    if (!id) {
      fail++;
      continue;
    }

    if (opts.skipExisting && existsAnyExtension(id)) {
      skip++;
      continue;
    }

    try {
      const entry = resolveListEntry(ch, lookup);
      let url = null;

      if (entry?.file) {
        url = await getImageDownloadUrl(entry.file);
        await sleep(opts.delay);
      }

      if (!url) {
        url = await getPageThumbnailUrl(ch.name);
        await sleep(opts.delay);
      }

      if (!url) {
        noImage++;
        unmatched.push(ch.name);
        continue;
      }

      const ext = extFromUrl(url);
      const dest = path.join(OUT_DIR, `${id}${ext}`);
      for (const oldExt of [".webp", ".png", ".jpg", ".jpeg"]) {
        const p = path.join(OUT_DIR, `${id}${oldExt}`);
        if (p !== dest && fs.existsSync(p)) fs.unlinkSync(p);
      }
      await downloadFile(url, dest);
      ok++;
      if ((i + 1) % 25 === 0) console.log(i + 1, "/", todo.length, "ok", ok);
    } catch (e) {
      fail++;
      console.warn("[err]", ch.name, e.message);
      await sleep(opts.delay * 2);
    }
  }

  console.log("\nDone. ok:", ok, "skip:", skip, "noImage:", noImage, "fail:", fail);
  console.log("out:", OUT_DIR);
  if (unmatched.length) {
    console.log("\nSans image (" + unmatched.length + "):");
    console.log(unmatched.join(", "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
