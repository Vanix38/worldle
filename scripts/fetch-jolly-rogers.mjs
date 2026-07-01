/**
 * Extrait les Jolly Roger du wiki FR et les enregistre dans
 * public/universes/one-piece-anime/specific-symbols/
 * Usage: node scripts/fetch-jolly-rogers.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "universes", "one-piece-anime", "specific-symbols");
const API = "https://onepiece.fandom.com/fr/api.php";

/** Nom de fichier : nom équipage sans le préfixe L' */
function toFilename(crewName) {
  let name = crewName.replace(/\s+/g, " ").trim();
  name = name.replace(/^l['']/i, "");
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function fullImageUrl(href) {
  let url = href.replace(/&amp;/g, "&");
  if (url.startsWith("//")) url = `https:${url}`;
  url = url.replace(/\/scale-to-width-down\/\d+/, "");
  return url;
}

function imgFullUrl($img) {
  const parentHref = $img.closest("a").attr("href");
  if (parentHref && !parentHref.startsWith("/fr/wiki/")) {
    return fullImageUrl(parentHref);
  }
  const src = $img.attr("data-src") || $img.attr("src");
  if (!src || src.startsWith("data:")) return null;
  return fullImageUrl(src);
}

function isJollyRogerImg($img) {
  const key = $img.attr("data-image-key") || "";
  const alt = $img.attr("alt") || "";
  const name = $img.attr("data-image-name") || "";
  return /jolly.?roger/i.test(key) || /jolly.?roger/i.test(alt) || /jolly.?roger/i.test(name);
}

async function fetchHtml(page) {
  const u = new URL(API);
  u.searchParams.set("action", "parse");
  u.searchParams.set("page", page);
  u.searchParams.set("prop", "text");
  u.searchParams.set("format", "json");
  const res = await fetch(u, { headers: { "User-Agent": "worlddle/1.0" } });
  const j = await res.json();
  return j.parse?.text?.["*"] || "";
}

async function downloadImage(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": "worlddle/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function extractRogers(html) {
  const $ = cheerio.load(html);
  const rogers = [];

  $("table").each((_, table) => {
    const rows = $(table).find("tr").toArray();
    for (let i = 0; i < rows.length - 1; i++) {
      const $imgCells = $(rows[i]).find("th, td");
      const imgs = $imgCells
        .toArray()
        .map((cell) => {
          const $img = $(cell).find("img").first();
          if (!$img.length || !isJollyRogerImg($img)) return null;
          const url = imgFullUrl($img);
          return url ? { url, col: $(cell).index() } : null;
        })
        .filter(Boolean);

      if (imgs.length === 0) continue;

      const $nameCells = $(rows[i + 1]).find("th, td");
      for (const { url, col } of imgs) {
        const $nameCell = $nameCells.eq(col);
        const link = $nameCell.find("a").first();
        const crewName = (link.length ? link.text() : $nameCell.text()).replace(/\s+/g, " ").trim();
        if (!crewName || /drapeaux|navbox|pirates/i.test(crewName) && crewName.length < 4) continue;
        rogers.push({ crewName, url });
      }
    }
  });

  // Drapeaux personnels : figures isolées avec légende = nom perso
  $("figure.thumb").each((_, fig) => {
    const $fig = $(fig);
    const $img = $fig.find("img").first();
    if (!$img.length || !isJollyRogerImg($img)) return;
    const url = imgFullUrl($img);
    if (!url) return;
    const caption = $fig.find(".caption").text().trim();
    if (!caption || /différents jolly/i.test(caption)) return;
    rogers.push({ crewName: caption, url });
  });

  return rogers;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.error("Fetching wiki...");
  const html = await fetchHtml("Jolly Roger");
  const rogers = extractRogers(html);
  console.error(`${rogers.length} paires image/nom trouvées`);

  const seen = new Map();
  for (const r of rogers) {
    const slug = toFilename(r.crewName);
    if (!slug) continue;
    if (!seen.has(slug)) seen.set(slug, r);
  }

  let ok = 0;
  let fail = 0;

  for (const [slug, { crewName, url }] of seen) {
    const ext = url.match(/\.(png|jpg|jpeg|gif|webp)/i)?.[1]?.toLowerCase() || "png";
    const dest = path.join(OUT_DIR, `${slug}.${ext}`);
    try {
      const size = await downloadImage(url, dest);
      console.log(`${slug}.${ext} ← ${crewName} (${size} bytes)`);
      ok++;
      await new Promise((r) => setTimeout(r, 100));
    } catch (e) {
      console.error(`FAIL ${slug}: ${e.message}`);
      fail++;
    }
  }

  console.error(`Terminé : ${ok} OK, ${fail} échecs`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
