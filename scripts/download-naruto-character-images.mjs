/**
 * Télécharge les portraits depuis l’infobox des pages wiki FR (même source que le scrape).
 * Fichiers : public/universes/naruto/characters/<character.id>.<ext>
 *
 * Usage:
 *   node scripts/download-naruto-character-images.mjs [--delay MS] [--limit N] [--skip-existing]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_JSON = path.join(ROOT, "data", "naruto.json");
const OUT_DIR = path.join(ROOT, "public", "universes", "naruto", "characters");
const API = "https://naruto.fandom.com/fr/api.php";

function parseArgs(argv) {
  const out = { delay: 400, limit: Infinity, skipExisting: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-existing") out.skipExisting = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 400);
    else if (a === "--limit") out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { "User-Agent": "worldle-naruto-images/1.0 (local)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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

/** Nom fichier wiki (sans préfixe Fichier:), préfère l’onglet Partie II si présent. */
function portraitFileNameFromInfobox(params) {
  const onglets = params["Images onglets"] || "";
  const fileRe = /\[\[\s*(?:Fichier|File)\s*:\s*([^|\]]+)/gi;
  const all = [...onglets.matchAll(fileRe)].map((m) => m[1].trim()).filter(Boolean);
  if (all.length > 0) {
    const idxII = onglets.search(/Partie\s+II/i);
    if (idxII !== -1) {
      const slice = onglets.slice(idxII);
      const m = slice.match(/\[\[\s*(?:Fichier|File)\s*:\s*([^|\]]+)/i);
      if (m) return m[1].trim();
    }
    const idxNE = onglets.search(/Nouvelle\s+[ÈE]re/i);
    if (idxNE !== -1) {
      const slice = onglets.slice(idxNE);
      const m = slice.match(/\[\[\s*(?:Fichier|File)\s*:\s*([^|\]]+)/i);
      if (m) return m[1].trim();
    }
    if (all.length >= 2) return all[all.length - 1];
    return all[0];
  }

  const single = (params["Image"] || "").trim();
  if (!single) return null;
  let m = single.match(/\[\[\s*(?:Fichier|File)\s*:\s*([^|\]]+)/i);
  if (m) return m[1].trim();
  const plain = single
    .replace(/\[\[|\]\]/g, "")
    .replace(/^\s*(?:Fichier|File)\s*:\s*/i, "")
    .split("|")[0]
    .trim();
  if (/\.(png|jpe?g|gif|webp)$/i.test(plain)) return plain;
  return null;
}

async function fetchWikitext(pageTitle) {
  const data = await fetchJson({
    action: "parse",
    page: pageTitle,
    prop: "wikitext",
    redirects: "1",
    format: "json",
  });
  if (data.error) return { error: data.error.info || JSON.stringify(data.error), wikitext: "" };
  return {
    wikitext: data.parse?.wikitext?.["*"] || "",
    resolvedTitle: data.parse?.title || pageTitle,
  };
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
  const res = await fetch(url, { headers: { "User-Agent": "worldle-naruto-images/1.0 (local)" } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function existsAnyExtension(id) {
  for (const ext of [".webp", ".png", ".jpg", ".jpeg"]) {
    if (fs.existsSync(path.join(OUT_DIR, `${id}${ext}`))) return true;
  }
  return false;
}

async function main() {
  const opts = parseArgs(process.argv);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const data = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));
  const characters = Array.isArray(data.characters) ? data.characters : [];
  let ok = 0;
  let skip = 0;
  let noImage = 0;
  let fail = 0;

  const todo = opts.limit < Infinity ? characters.slice(0, opts.limit) : characters;

  for (let i = 0; i < todo.length; i++) {
    const ch = todo[i];
    const id = ch.id;
    const pageTitle = ch.name;
    if (!id || !pageTitle) {
      fail++;
      continue;
    }

    if (opts.skipExisting && existsAnyExtension(id)) {
      skip++;
      continue;
    }

    try {
      const { wikitext, error } = await fetchWikitext(pageTitle);
      await sleep(opts.delay);
      if (error || !wikitext) {
        fail++;
        console.warn("[wiki]", pageTitle, error || "empty");
        continue;
      }
      const inner = extractInfoboxInner(wikitext);
      if (!inner) {
        noImage++;
        console.warn("[no infobox]", pageTitle);
        continue;
      }
      const params = parseInfoboxParams(inner);
      const fileName = portraitFileNameFromInfobox(params);
      if (!fileName) {
        noImage++;
        console.warn("[no fichier]", pageTitle);
        continue;
      }

      const url = await getImageDownloadUrl(fileName);
      await sleep(opts.delay);
      if (!url) {
        noImage++;
        console.warn("[no url]", pageTitle, fileName);
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
      console.warn("[err]", pageTitle, e.message);
      await sleep(opts.delay * 2);
    }
  }

  console.log("Done. ok:", ok, "skipExisting:", skip, "noImage:", noImage, "fail:", fail, "out:", OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
