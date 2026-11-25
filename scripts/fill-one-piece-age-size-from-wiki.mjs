/**
 * Complète l'âge et la taille manquants (0 ou vide) des persos One Piece
 * depuis l'infobox de onepiece.fandom.com (champs data-source "age" et "height").
 *
 * - Âge : dernière valeur indiquée (après l'ellipse si le wiki en donne plusieurs).
 * - Taille : dernière valeur en cm (ou en m, convertie), entier en centimètres.
 * Ne touche jamais une valeur déjà remplie (« ? » = inconnu, donc à compléter).
 * Écrit dans data/one-piece-*.json puis reporte les changements dans la source unique
 * sources/one-piece.json (npm run one-piece:merge).
 *
 * Usage :
 *   node scripts/fill-one-piece-age-size-from-wiki.mjs [--dry-run] [--delay MS] [--ids a,b]
 * Rapport : scripts/one-piece-age-size-report.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API = "https://onepiece.fandom.com/api.php";
const UA = "worldle-one-piece-fields/1.0 (educational; fan quiz)";
const FILES = ["one-piece-manga", "one-piece-anime"].map((u) => path.join(ROOT, "data", `${u}.json`));
const REPORT = path.join(__dirname, "one-piece-age-size-report.json");

const TITLE_OVERRIDES = {
  "vinsmoke-sanji": "Sanji",
  "captain-john": "John (Rocks Pirates)",
  "kurozumi-tama": "Tama",
  "mozu-et-kiwi": "Mozu",
  "wolf-elbaph": "Wolf (Elbaph)",
  "bellemere": "Bell-mère",
  "ben-beckmann": "Benn Beckman",
  "gaimon": "Gaimon",
  "dugong": "Kung-Fu Dugongs",
};

function parseArgs(argv) {
  const out = { delay: 350, dryRun: false, ids: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--delay") out.delay = Math.max(0, parseInt(argv[++i], 10) || 350);
    else if (a === "--ids") out.ids = new Set(argv[++i].split(","));
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isEmpty = (v) => v === undefined || v === null || v === "" || v === 0 || v === "?" || v === "Inconnu";

async function fetchInfobox(title) {
  const u = new URL(API);
  for (const [k, v] of Object.entries({ action: "parse", page: title, prop: "text", redirects: "1", format: "json" }))
    u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) return null;
  const $ = cheerio.load(data.parse?.text?.["*"] || "");
  const ib = $(".portable-infobox").first();
  if (!ib.length) return null;
  const get = (key) => {
    const el = ib.find(`[data-source="${key}"] .pi-data-value`).first();
    if (!el.length) return "";
    el.find("br").replaceWith("\n");
    el.find("sup").remove();
    return el.text().trim();
  };
  return { title: data.parse.title, age: get("age"), height: get("height") };
}

/** "39 (debut)\n41 (after timeskip)" -> 41 ; "Unknown" -> null */
export function parseAge(s) {
  const vals = String(s)
    .replace(/\[\d+\]/g, "")
    .split(/\n|;/)
    .map((line) => line.match(/^\s*(?:~|about\s+)?(\d{1,4})\b(?!\s*(?:years?\s+ago|cm|m\b))/i))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n > 0);
  return vals.length ? vals[vals.length - 1] : null;
}

/** "206 cm (6'9\")" -> 206 ; "11.87 m" -> 1187 ; plusieurs valeurs -> la dernière */
export function parseHeight(s) {
  const vals = [];
  for (const m of String(s).matchAll(/(\d+(?:[.,]\d+)?)\s*(cm|m)\b/g)) {
    const n = parseFloat(m[1].replace(",", "."));
    vals.push(Math.round(m[2] === "m" ? n * 100 : n));
  }
  return vals.length ? vals[vals.length - 1] : null;
}

async function main() {
  const args = parseArgs(process.argv);
  const datasets = FILES.map((f) => ({ f, raw: fs.readFileSync(f, "utf8") })).map((d) => ({ ...d, json: JSON.parse(d.raw) }));

  const todo = new Map();
  for (const d of datasets)
    for (const c of d.json.characters)
      if ((isEmpty(c.age) || isEmpty(c.size)) && (!args.ids || args.ids.has(c.id)) && !todo.has(c.id)) todo.set(c.id, c);
  console.log(`${todo.size} persos avec âge ou taille manquant`);

  const found = {};
  const report = { filled: [], noValue: [], notFound: [] };
  for (const c of todo.values()) {
    const titles = [...new Set([TITLE_OVERRIDES[c.id], c.name, ...(c.aliases || [])].filter((t) => t && /^[\x20-\x7EÀ-ÿ]+$/.test(t)))];
    let ib = null;
    for (const t of titles) {
      try {
        ib = await fetchInfobox(t);
      } catch (e) {
        console.warn(`  ${c.id}: ${t} -> ${e.message}`);
      }
      await sleep(args.delay);
      if (ib) break;
    }
    if (!ib) {
      report.notFound.push(c.id);
      console.log(`✗ ${c.id} : page introuvable`);
      continue;
    }
    const age = parseAge(ib.age);
    const size = parseHeight(ib.height);
    found[c.id] = { age, size };
    if (age || size) {
      report.filled.push({ id: c.id, page: ib.title, ageRaw: ib.age, age, heightRaw: ib.height, size });
      console.log(`✓ ${c.id} <- ${ib.title} : âge ${age ?? "-"} | taille ${size ?? "-"}`);
    } else {
      report.noValue.push({ id: c.id, page: ib.title });
      console.log(`– ${c.id} : ni âge ni taille sur ${ib.title}`);
    }
  }

  for (const d of datasets) {
    for (const c of d.json.characters) {
      const v = found[c.id];
      if (!v) continue;
      if (isEmpty(c.age) && v.age) c.age = v.age;
      if (isEmpty(c.size) && v.size) c.size = v.size;
    }
    if (!args.dryRun) fs.writeFileSync(d.f, JSON.stringify(d.json, null, 2) + (d.raw.endsWith("\n") ? "\n" : ""));
  }
  if (!args.dryRun && report.filled.length) {
    execFileSync(process.execPath, [path.join(__dirname, "one-piece-source.mjs"), "merge"], { stdio: "inherit" });
  }
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
  console.log(`\n${report.filled.length} complétés, ${report.noValue.length} sans valeur sur le wiki, ${report.notFound.length} introuvables`);
  console.log(`Rapport : ${path.relative(ROOT, REPORT)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
