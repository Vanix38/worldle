/**
 * Télécharge les portraits manquants des persos One Piece depuis onepiece.fandom.com,
 * en prenant la bonne version de l'infobox selon l'univers :
 *   - one-piece-anime  -> onglet / fichier « Anime »
 *   - one-piece-manga  -> onglet / fichier « Manga »
 *
 * Pour chaque figure de l'infobox (portable-infobox, y compris les onglets imbriqués),
 * on construit un libellé = onglets parents + légende + nom du fichier, puis on garde
 * la première image dont le libellé contient « anime » ou « manga ».
 * Si aucune image n'est marquée pour cet univers, le perso est laissé sans image et listé
 * dans le rapport (option --fallback : prendre quand même la première image de l'infobox).
 *
 * Fichiers : public/universes/<univers>/characters/<character.id>.<ext>
 * Anti-doublon : une image identique (sha1) à une image déjà présente dans l'univers est ignorée.
 *
 * Usage :
 *   node scripts/download-one-piece-character-images.mjs [--only anime|manga] [--ids a,b]
 *        [--delay MS] [--limit N] [--fallback] [--dry-run]
 * Rapport : scripts/one-piece-images-report.json
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API = "https://onepiece.fandom.com/api.php";
const UA = "worldle-one-piece-images/1.0 (educational; fan quiz)";
const EXTENSIONS = ["webp", "png", "jpg", "jpeg"];
const REPORT = path.join(__dirname, "one-piece-images-report.json");

const UNIVERSES = [
  { id: "one-piece-anime", kind: "anime" },
  { id: "one-piece-manga", kind: "manga" },
];

/** id -> titre exact de la page sur onepiece.fandom.com (noms ambigus ou traduits). */
const TITLE_OVERRIDES = {
  "vinsmoke-sanji": "Sanji",
  "captain-john": "John (Rocks Pirates)",
  "kurozumi-tama": "Tama",
  "mozu-et-kiwi": "Mozu",
  "shandia-chief": "Shandia Chief",
  "wolf-elbaph": "Wolf (Elbaph)",
  "bell-mere": "Bell-mère",
};

function parseArgs(argv) {
  const out = { delay: 350, limit: Infinity, dryRun: false, fallback: false, only: null, ids: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--fallback") out.fallback = true;
    else if (a === "--only") out.only = argv[++i];
    else if (a === "--ids") out.ids = new Set(argv[++i].split(","));
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
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

async function fetchPageHtml(title) {
  const data = await fetchJson({ action: "parse", page: title, prop: "text", redirects: "1" });
  if (data.error) return null;
  return { html: data.parse?.text?.["*"] || "", title: data.parse?.title || title };
}

/** URL d'origine (sans redimensionnement) d'une image Fandom. */
function originalUrl(src) {
  if (!src) return null;
  const m = String(src).match(/^(.*?\/revision\/latest)/);
  return m ? m[1] : String(src).split("?")[0];
}

/** Toutes les images de l'infobox avec leur libellé (onglets parents + légende + fichier). */
function infoboxImages(html) {
  const $ = cheerio.load(html);
  const ib = $(".portable-infobox").first();
  if (!ib.length) return [];
  const out = [];
  ib.find("figure.pi-image").each((_, fig) => {
    const labels = [];
    $(fig)
      .parents(".wds-tab__content")
      .each((__, content) => {
        const $content = $(content);
        const tabber = $content.parent();
        const idx = tabber.children(".wds-tab__content").index(content);
        const label = tabber.find("> .wds-tabs__wrapper .wds-tabs__tab, > .wds-tabs .wds-tabs__tab").eq(idx).text().trim();
        if (label) labels.unshift(label);
      });
    const img = $(fig).find("img").first();
    const href = $(fig).find("a").first().attr("href") || "";
    const name = img.attr("data-image-name") || img.attr("alt") || decodeURIComponent(href.split("/").pop() || "");
    const caption = $(fig).find("figcaption").text().trim();
    const src = originalUrl(href.startsWith("http") ? href : img.attr("data-src") || img.attr("src"));
    if (src) out.push({ label: [...labels, caption, name].filter(Boolean).join(" | "), url: src });
  });
  return out;
}

/** Image pour l'univers (anime/manga) ; évite pré-ellipse/enfance si une autre existe. */
function pickImage(images, kind, fallback) {
  const other = kind === "anime" ? "manga" : "anime";
  const matches = images.filter((im) => new RegExp(kind, "i").test(im.label) && !new RegExp(other, "i").test(im.label));
  const preferred = matches.filter((im) => !/pre[- ]?time ?skip|child|young|kid/i.test(im.label));
  if (preferred.length) return preferred[0];
  if (matches.length) return matches[0];
  return fallback && images.length ? { ...images[0], fallback: true } : null;
}

function candidateTitles(c) {
  const list = [];
  if (TITLE_OVERRIDES[c.id]) list.push(TITLE_OVERRIDES[c.id]);
  list.push(c.name);
  for (const a of c.aliases || []) if (/^[\x20-\x7EÀ-ÿ]+$/.test(a)) list.push(a);
  return [...new Set(list)];
}

function existingImage(dir, id) {
  for (const ext of EXTENSIONS) if (fs.existsSync(path.join(dir, `${id}.${ext}`))) return true;
  return false;
}

async function main() {
  const args = parseArgs(process.argv);
  const universes = UNIVERSES.filter((u) => !args.only || u.kind === args.only);

  const pageCache = new Map(); // character id -> { title, images }
  async function imagesFor(c) {
    if (pageCache.has(c.id)) return pageCache.get(c.id);
    let result = null;
    for (const t of candidateTitles(c)) {
      try {
        const got = await fetchPageHtml(t);
        await sleep(args.delay);
        if (!got) continue;
        const images = infoboxImages(got.html);
        if (images.length) {
          result = { title: got.title, images };
          break;
        }
      } catch (e) {
        console.warn(`  ${c.id}: ${t} -> ${e.message}`);
      }
    }
    pageCache.set(c.id, result);
    return result;
  }

  const report = {};
  for (const u of universes) {
    const dir = path.join(ROOT, "public", "universes", u.id, "characters");
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", `${u.id}.json`), "utf8"));
    const hashes = new Map(fs.readdirSync(dir).map((f) => [sha1(fs.readFileSync(path.join(dir, f))), path.parse(f).name]));
    const missing = data.characters.filter((c) => !existingImage(dir, c.id) && (!args.ids || args.ids.has(c.id)));
    const r = (report[u.id] = { ok: [], fallback: [], noSpecificImage: [], notFound: [], duplicate: [] });
    console.log(`\n=== ${u.id} (${u.kind}) : ${missing.length} persos sans image`);

    for (const c of missing.slice(0, args.limit)) {
      const page = await imagesFor(c);
      if (!page) {
        console.log(`✗ ${c.id} : page introuvable`);
        r.notFound.push({ id: c.id, name: c.name });
        continue;
      }
      const pick = pickImage(page.images, u.kind, args.fallback);
      if (!pick) {
        console.log(`– ${c.id} : pas d'image « ${u.kind} » (${page.images.map((i) => i.label).join(" ; ")})`);
        r.noSpecificImage.push({ id: c.id, page: page.title, available: page.images.map((i) => i.label) });
        continue;
      }
      const res = await fetch(pick.url, { headers: { "User-Agent": UA } });
      await sleep(args.delay);
      if (!res.ok) {
        r.notFound.push({ id: c.id, name: c.name, error: `HTTP ${res.status}` });
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const h = sha1(buf);
      if (hashes.has(h)) {
        console.log(`= ${c.id} : même image que ${hashes.get(h)}, ignorée`);
        r.duplicate.push({ id: c.id, sameAs: hashes.get(h), page: page.title });
        continue;
      }
      hashes.set(h, c.id);
      const type = res.headers.get("content-type") || "";
      let ext = (pick.url.match(/\.(png|jpe?g|webp)(?=\/|$)/i)?.[1] || "png").toLowerCase();
      if (type.includes("webp")) ext = "webp";
      if (!args.dryRun) fs.writeFileSync(path.join(dir, `${c.id}.${ext}`), buf);
      const entry = { id: c.id, page: page.title, label: pick.label, file: `${c.id}.${ext}` };
      (pick.fallback ? r.fallback : r.ok).push(entry);
      console.log(`✓ ${c.id} <- ${page.title} [${pick.label}]`);
    }
    console.log(
      `${u.id} : ${r.ok.length} téléchargées, ${r.fallback.length} par défaut, ${r.noSpecificImage.length} sans image ${u.kind}, ${r.notFound.length} introuvables, ${r.duplicate.length} doublons ignorés`,
    );
  }

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nRapport : ${path.relative(ROOT, REPORT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
