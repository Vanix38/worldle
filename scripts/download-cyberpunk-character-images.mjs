/**
 * Télécharge les portraits depuis l’infobox (cyberpunk.fandom.com).
 * Fichiers : public/universes/cyberpunk/characters/<character.id>.<ext>
 *
 * Usage:
 *   node scripts/download-cyberpunk-character-images.mjs [--delay MS] [--limit N] [--skip-existing]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_JSON = path.join(ROOT, "data", "cyberpunk.json");
const OUT_DIR = path.join(ROOT, "public", "universes", "cyberpunk", "characters");
const API = "https://cyberpunk.fandom.com/api.php";
const REF = "https://cyberpunk.fandom.com/";
const UA = "worldle-cyberpunk-images/1.0 (educational; fan quiz)";

const TITLE_OVERRIDES = {
  V: "V (character)",
  "Michiko Sanderson (née Arasaka)": "Michiko Sanderson",
};

function parseArgs(argv) {
  const out = { delay: 200, limit: Infinity, skipExisting: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-existing") out.skipExisting = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 200);
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
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function extractInfoboxInner(wikitext) {
  const marker = "{{Infobox Character";
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

/** Prefer first gallery image, else plain image= filename. */
function portraitFileNameFromInfobox(params) {
  let raw = (params.image || "").replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!raw) return null;

  const galleryMatch = raw.match(/<gallery[^>]*>([\s\S]*?)<\/gallery>/i);
  if (galleryMatch) {
    for (const line of galleryMatch[1].split("\n")) {
      const cleaned = line.trim();
      if (!cleaned || cleaned.startsWith("<!--")) continue;
      const file = cleaned.split("|")[0].trim().replace(/^(?:File|Image):/i, "");
      if (/\.(png|jpe?g|gif|webp)$/i.test(file)) return file;
    }
  }

  // [[File:Foo.png|...]] or [[Foo.png]]
  let m = raw.match(/\[\[\s*(?:(?:File|Image)\s*:)?\s*([^|\]]+\.(?:png|jpe?g|gif|webp))\s*(?:\|[^\]]*)?\]\]/i);
  if (m) return m[1].trim();

  m = raw.match(/([^|/\n[\]]+\.(?:png|jpe?g|gif|webp))/i);
  if (m) return m[1].trim().replace(/^(?:File|Image):/i, "");

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

/** Returns { pageTitle, wikitext } or null. */
async function resolveCharacterPage(character, delay) {
  const preferred = TITLE_OVERRIDES[character.name] || character.name;
  const direct = await fetchWikitext(preferred);
  await sleep(delay);
  if (direct.wikitext && direct.wikitext.includes("{{Infobox Character")) {
    return { pageTitle: direct.resolvedTitle || preferred, wikitext: direct.wikitext };
  }

  const data = await fetchJson({
    action: "query",
    list: "search",
    srsearch: character.name,
    srlimit: "5",
    format: "json",
  });
  await sleep(delay);
  const hits = data.query?.search || [];
  for (const hit of hits) {
    const t = hit.title;
    if (/\/Gallery$/i.test(t)) continue;
    if (t === preferred || t === character.name) continue;
    const wt = await fetchWikitext(t);
    await sleep(delay);
    if (wt.wikitext && wt.wikitext.includes("{{Infobox Character")) {
      return { pageTitle: wt.resolvedTitle || t, wikitext: wt.wikitext };
    }
  }
  return null;
}

async function getImageDownloadUrl(fileName) {
  const title =
    /^file:/i.test(fileName) || /^image:/i.test(fileName) ? fileName : `File:${fileName}`;
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
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Referer: REF,
      Accept: "image/png,image/jpeg,image/webp,image/*,*/*",
    },
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "";
  let finalDest = dest;
  if (/webp/i.test(ct) && !dest.endsWith(".webp")) {
    finalDest = dest.replace(/\.[^.]+$/, ".webp");
  } else if (/png/i.test(ct) && !dest.endsWith(".png") && !dest.endsWith(".webp")) {
    finalDest = dest.replace(/\.[^.]+$/, ".png");
  }
  fs.writeFileSync(finalDest, buf);
  return finalDest;
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
    if (!id || !ch.name) {
      fail++;
      continue;
    }

    if (opts.skipExisting && existsAnyExtension(id)) {
      skip++;
      continue;
    }

    try {
      const page = await resolveCharacterPage(ch, opts.delay);
      if (!page) {
        fail++;
        console.warn("[no page]", ch.name);
        continue;
      }

      const inner = extractInfoboxInner(page.wikitext);
      if (!inner) {
        noImage++;
        console.warn("[no infobox]", ch.name);
        continue;
      }
      const params = parseInfoboxParams(inner);
      const fileName = portraitFileNameFromInfobox(params);
      if (!fileName) {
        noImage++;
        console.warn("[no fichier]", ch.name);
        continue;
      }

      const url = await getImageDownloadUrl(fileName);
      await sleep(opts.delay);
      if (!url) {
        noImage++;
        console.warn("[no url]", ch.name, fileName);
        continue;
      }

      const ext = extFromUrl(url);
      const dest = path.join(OUT_DIR, `${id}${ext}`);
      for (const oldExt of [".webp", ".png", ".jpg", ".jpeg"]) {
        const p = path.join(OUT_DIR, `${id}${oldExt}`);
        if (fs.existsSync(p) && p !== dest) fs.unlinkSync(p);
      }
      await downloadFile(url, dest);
      ok++;
      if ((i + 1) % 25 === 0 || i + 1 === todo.length) {
        console.log(`${i + 1}/${todo.length} ok=${ok} skip=${skip} noImage=${noImage} fail=${fail}`);
      }
    } catch (e) {
      fail++;
      console.warn("[err]", ch.name, e.message);
      await sleep(opts.delay * 2);
    }
  }

  console.log(
    `Done. ok=${ok} skipExisting=${skip} noImage=${noImage} fail=${fail} out=${OUT_DIR}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
