/**
 * Normalize `enemies` in data/amazon-invincible-characters-fields.csv.
 *
 * Default: dry-run preview.
 * Write:   node scripts/normalize-invincible-enemies.mjs --write
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_CSV = path.join(ROOT, "data", "amazon-invincible-characters-fields.csv");

const GROUP_LABELS = new Set([
  "Coalition of Planets",
  "The Graysons",
  "Team Evil Invincible",
  "Viltrum Empire",
  "Others",
]);

function parseArgs(argv) {
  const opts = {
    csvPath: DEFAULT_CSV,
    write: false,
  };

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
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(";"));
  }
  fs.writeFileSync(csvPath, `${lines.join("\n")}\n`, "utf8");
}

function stripReferences(value) {
  return value
    .replace(/\[\d+\]/g, "")
    .replace(/\u200e/g, "")
    .replace(/�/g, "")
    .replace(/†/g, "")
    .trim();
}

function normalizeSpacing(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function insertKnownMissingSeparators(value) {
  return value
    .replace(/([a-z)])(Others:)/g, "$1 / $2")
    .replace(/([a-z)])(Viltrum Empire:)/g, "$1 / $2")
    .replace(/([a-z)])(Coalition of Planets:)/g, "$1 / $2")
    .replace(/([a-z)])(Team Evil Invincible:)/g, "$1 / $2")
    .replace(/(Globe)(Shrinking Rae\b)/g, "$1 / $2")
    .replace(/(Empire)(Others:)/g, "$1 / $2")
    .replace(/(Empire)([A-Z][a-z])/g, "$1 / $2")
    .replace(/(Others:)([A-Z])/g, "$1 / $2")
    .replace(/(Invincible:)([A-Z])/g, "$1 / $2")
    .replace(/(Planets:)([A-Z])/g, "$1 / $2");
}

function removeGroupLabel(token) {
  const raw = token.trim();
  const hadColon = raw.endsWith(":");
  const cleaned = raw.replace(/:$/, "").trim();
  if (hadColon && GROUP_LABELS.has(cleaned)) return "";

  for (const label of GROUP_LABELS) {
    const prefix = `${label}:`;
    if (cleaned.startsWith(prefix)) return cleaned.slice(prefix.length).trim();
  }

  return cleaned;
}

function normalizeEnemyToken(token) {
  let cleaned = stripReferences(token);
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = removeGroupLabel(cleaned);
  cleaned = cleaned.replace(/^[:,-]+|[:,-]+$/g, "").trim();
  return cleaned;
}

function normalizeEnemies(value) {
  if (!value) return "";

  const prepared = normalizeSpacing(insertKnownMissingSeparators(stripReferences(value)));
  const parts = prepared
    .split("/")
    .map(normalizeEnemyToken)
    .filter(Boolean);

  const seen = new Set();
  const enemies = [];
  for (const part of parts) {
    const key = part.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    enemies.push(part);
  }

  return enemies.join(", ");
}

function main() {
  const opts = parseArgs(process.argv);
  const { headers, rows } = readCsv(opts.csvPath);

  if (!headers.includes("enemies")) throw new Error("Missing enemies column");

  const changed = [];
  for (const row of rows) {
    const before = row.enemies || "";
    const after = normalizeEnemies(before);
    if (before !== after) {
      changed.push({ title: row.title, before, after });
      row.enemies = after;
    }
  }

  if (opts.write) writeCsv(opts.csvPath, headers, rows);

  console.log(`${opts.write ? "Wrote" : "Dry run"} ${opts.csvPath}`);
  console.log(`Changed rows: ${changed.length}`);
  for (const change of changed.slice(0, 20)) {
    console.log(`\n${change.title}`);
    console.log(`- ${change.before}`);
    console.log(`+ ${change.after}`);
  }
  if (changed.length > 20) console.log(`\n... ${changed.length - 20} more`);
}

main();
