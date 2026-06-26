/**
 * Scrape amazon-invincible.fandom.com — Category:Characters -> CSV.
 *
 * Usage:
 *   node scripts/scrape-invincible-fandom-csv.mjs
 *   node scripts/scrape-invincible-fandom-csv.mjs --limit 25 --delay 250
 *
 * Outputs:
 *   data/amazon-invincible-characters-fields.csv
 *   data/amazon-invincible-sample-fields.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API = "https://amazon-invincible.fandom.com/api.php";
const CATEGORY = "Category:Characters";
const DEFAULT_OUT = path.join(ROOT, "data", "amazon-invincible-characters-fields.csv");
const DEFAULT_SAMPLE_OUT = path.join(ROOT, "data", "amazon-invincible-sample-fields.json");

const FIXED_COLUMNS = ["pageid", "title", "resolved_title", "url", "image_url"];
const EXCLUDED_FIELD_KEYS = new Set([
  "affiliation",
  "allies",
  "died",
  "dislikes",
  "last appearance",
  "latest appearance",
  "likes",
  "marital",
  "members",
  "only appearance",
]);

function parseArgs(argv) {
  const opts = {
    limit: Infinity,
    delay: 300,
    outPath: DEFAULT_OUT,
    sampleOutPath: DEFAULT_SAMPLE_OUT,
    sampleSize: 10,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--limit") opts.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (arg === "--delay") opts.delay = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (arg === "--out") opts.outPath = argv[++i] || DEFAULT_OUT;
    else if (arg === "--sample-out") opts.sampleOutPath = argv[++i] || DEFAULT_SAMPLE_OUT;
    else if (arg === "--sample-size") opts.sampleSize = Math.max(0, parseInt(argv[++i], 10) || 0);
  }

  return opts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const res = await fetch(url, {
    headers: { "User-Agent": "worlddle-invincible-scraper/1.0 (educational)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code}: ${json.error.info}`);
  return json;
}

async function fetchCategoryPages(limit, delay) {
  const pages = [];
  let cmcontinue;

  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: CATEGORY,
      cmnamespace: "0",
      cmlimit: "500",
      format: "json",
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;

    const data = await fetchJson(params);
    for (const page of data.query?.categorymembers || []) {
      if (page.ns === 0 && page.title) pages.push(page);
      if (pages.length >= limit) return pages.slice(0, limit);
    }

    cmcontinue = data.continue?.cmcontinue;
    if (cmcontinue) await sleep(delay);
  } while (cmcontinue);

  return pages.slice(0, limit);
}

async function fetchPageHtml(title) {
  const data = await fetchJson({
    action: "parse",
    page: title,
    prop: "text",
    redirects: "1",
    format: "json",
  });

  return {
    html: data.parse?.text?.["*"] || "",
    resolvedTitle: data.parse?.title || title,
  };
}

function cleanValue(value) {
  return String(value || "")
    .replace(/\[\s*v\s*·\s*e\s*\]/gi, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\u200e/g, "")
    .replace(/[ \t]*\n+[ \t]*/g, " / ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function valueText($, valueNode) {
  const node = valueNode.clone();
  node.find("br").replaceWith("\n");
  node.find("li").append("\n");
  node.find("sup.reference").remove();
  return cleanValue(node.text());
}

function parseInfobox(html) {
  const $ = cheerio.load(html);
  const infobox = $(".portable-infobox").first();
  const fields = {};

  if (!infobox.length) return { fields, imageUrl: "" };

  infobox.find("[data-source]").each((_, element) => {
    const key = $(element).attr("data-source");
    if (!key || fields[key] !== undefined) return;
    if (EXCLUDED_FIELD_KEYS.has(key.trim().toLowerCase())) return;

    const valueNode = $(element).find(".pi-data-value").first();
    if (!valueNode.length) return;

    const text = valueText($, valueNode);
    if (text) fields[key] = text;
  });

  const image = infobox.find("figure.pi-image img").first();
  const imageUrl = String(image.attr("src") || image.attr("data-src") || "").split("?")[0];

  return { fields, imageUrl };
}

function pageUrl(title) {
  return `https://amazon-invincible.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function csvEscape(value) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(outPath, headers, rows) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const lines = [headers.map(csvEscape).join(";")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header])).join(";"));
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
}

function writeSampleReport(outPath, samplePages, fieldCounts, allKeys) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const report = {
    wiki: "https://amazon-invincible.fandom.com/wiki/Category:Characters",
    sampleSize: samplePages.length,
    totalFieldKeysInSample: allKeys.length,
    fieldKeysInSample: allKeys,
    samplePages,
    fieldCountsInFullCsv: Object.fromEntries(
      Object.entries(fieldCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en")),
    ),
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
}

async function main() {
  const opts = parseArgs(process.argv);
  const pages = await fetchCategoryPages(opts.limit, opts.delay);
  const rows = [];
  const allKeys = new Set();
  const sampleKeys = new Set();
  const samplePages = [];
  const fieldCounts = {};

  console.log(`Category pages: ${pages.length}`);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { html, resolvedTitle } = await fetchPageHtml(page.title);
    const { fields, imageUrl } = parseInfobox(html);

    const row = {
      pageid: page.pageid,
      title: page.title,
      resolved_title: resolvedTitle,
      url: pageUrl(resolvedTitle),
      image_url: imageUrl,
    };

    for (const [key, value] of Object.entries(fields)) {
      row[key] = value;
      allKeys.add(key);
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }

    if (samplePages.length < opts.sampleSize) {
      for (const key of Object.keys(fields)) sampleKeys.add(key);
      samplePages.push({
        title: page.title,
        resolvedTitle,
        keys: Object.keys(fields),
        fields,
      });
    }

    rows.push(row);

    if ((i + 1) % 25 === 0 || i + 1 === pages.length) {
      console.log(`Progress ${i + 1}/${pages.length}`);
    }

    await sleep(opts.delay);
  }

  const headers = [
    ...FIXED_COLUMNS,
    ...[...allKeys].filter((key) => !FIXED_COLUMNS.includes(key)).sort((a, b) => a.localeCompare(b, "en")),
  ];
  writeCsv(opts.outPath, headers, rows);
  writeSampleReport(
    opts.sampleOutPath,
    samplePages,
    fieldCounts,
    [...sampleKeys].sort((a, b) => a.localeCompare(b, "en")),
  );

  console.log(`Wrote ${opts.outPath}`);
  console.log(`Wrote ${opts.sampleOutPath}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Field columns: ${headers.length - FIXED_COLUMNS.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
