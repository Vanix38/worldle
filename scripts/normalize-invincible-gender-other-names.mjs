/**
 * Normalize `gender` and `other names` in data/amazon-invincible-characters-fields.csv.
 *
 * Default: dry-run preview.
 * Write:   node scripts/normalize-invincible-gender-other-names.mjs --write
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_CSV = path.join(ROOT, "data", "amazon-invincible-characters-fields.csv");

const LABEL_RE = /^(?:Codenames?|Nicknames?|By Fans|Aliases?|Titles?):\s*/i;
const DROP_TOKEN_RE = /^(?:none|unknown|tba|\?+)$/i;

function parseArgs(argv) {
  const opts = { csvPath: DEFAULT_CSV, write: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--write") opts.write = true;
    else if (arg === "--csv") opts.csvPath = argv[++i] || DEFAULT_CSV;
  }
  return opts;
}

function parseCsvLine(line, delimiter = ";") {
  const out = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cur += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += char;
  }

  out.push(cur);
  return out;
}

function csvEscape(value, delimiter = ";") {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes("\n") || text.includes("\r") || text.includes(delimiter)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function readCsv(csvPath) {
  const lines = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, rows };
}

function writeCsv(csvPath, headers, rows) {
  const lines = [headers.map((header) => csvEscape(header)).join(";")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header])).join(";"));
  fs.writeFileSync(csvPath, `${lines.join("\n")}\n`, "utf8");
}

function normalizeGender(value) {
  return String(value ?? "")
    .replace(/[♂♀]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOtherNameToken(value) {
  let token = String(value ?? "")
    .replace(/\u200e/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(LABEL_RE, "")
    .replace(/\s*\((?:official title|descriptor|earth name|cyrillic|romanized|comics|subtitles|posts|original concept|by [^)]+)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  token = token.replace(LABEL_RE, "").trim();
  if (!token || DROP_TOKEN_RE.test(token)) return "";
  return token;
}

function normalizeOtherNames(value) {
  if (!value) return "";

  const raw = String(value)
    .replace(/([a-z)])(Codenames?|Nicknames?|By Fans|Aliases?|Titles?):/gi, "$1 / $2:")
    .replace(/\s*\/\s*/g, " / ")
    .trim();

  const seen = new Set();
  const names = [];
  for (const part of raw.split("/")) {
    const cleaned = cleanOtherNameToken(part);
    if (!cleaned) continue;
    const key = cleaned.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(cleaned);
  }
  return names.join(", ");
}

function main() {
  const opts = parseArgs(process.argv);
  const { headers, rows } = readCsv(opts.csvPath);
  if (!headers.includes("gender")) throw new Error("Missing gender column");
  if (!headers.includes("other names")) throw new Error("Missing other names column");

  const changed = [];
  for (const row of rows) {
    for (const [field, normalize] of [
      ["gender", normalizeGender],
      ["other names", normalizeOtherNames],
    ]) {
      const before = row[field] || "";
      const after = normalize(before);
      if (before !== after) {
        changed.push({ title: row.title, field, before, after });
        row[field] = after;
      }
    }
  }

  if (opts.write) writeCsv(opts.csvPath, headers, rows);

  console.log(`${opts.write ? "Wrote" : "Dry run"} ${opts.csvPath}`);
  console.log(`Changed cells: ${changed.length}`);
  for (const change of changed.slice(0, 40)) {
    console.log(`\n${change.title} | ${change.field}`);
    console.log(`- ${change.before}`);
    console.log(`+ ${change.after}`);
  }
  if (changed.length > 40) console.log(`\n... ${changed.length - 40} more`);
}

main();
