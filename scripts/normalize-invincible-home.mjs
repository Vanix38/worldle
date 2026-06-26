/**
 * Normalize `home` in data/amazon-invincible-characters-fields.csv.
 *
 * Default: dry-run preview.
 * Write:   node scripts/normalize-invincible-home.mjs --write
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_CSV = path.join(ROOT, "data", "amazon-invincible-characters-fields.csv");

const FIELD_LABEL_RE = /^(?:Current|Former|Residence|City|Country|Planet|Universe):\s*/i;
const FORMER_MARKER_RE = /^(?:Former:|Former)$/i;

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

function normalizeRawHome(value) {
  return String(value ?? "")
    .replace(/\u200e/g, "")
    .replace(/\s+/g, " ")
    .replace(/([a-z)])(Earth|Hell|Alternate|Current:|Former:|Residence:|City:|Country:|Planet:|Universe:)/g, "$1 / $2")
    .replace(/(Current:|Former:|Residence:|City:|Country:|Planet:|Universe:)/gi, " / $1")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

function cleanHomeToken(value) {
  return value
    .replace(FIELD_LABEL_RE, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/^[:,-]+|[:,-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addUnique(target, value) {
  const cleaned = cleanHomeToken(value);
  if (!cleaned || /^(Unknown|N\/A)$/i.test(cleaned)) return;

  const key = cleaned.toLocaleLowerCase("en");
  if (target.some((existing) => existing.toLocaleLowerCase("en") === key)) return;
  target.push(cleaned);
}

function normalizeHome(value) {
  const normalized = normalizeRawHome(value);
  if (!normalized) return "";

  const current = [];
  let mode = "current";

  for (const rawToken of normalized.split("/")) {
    const token = rawToken.trim();
    if (!token) continue;

    if (/^Current:?$/i.test(token)) {
      mode = "current";
      continue;
    }
    if (FORMER_MARKER_RE.test(token)) {
      mode = "former";
      continue;
    }

    if (mode === "former" || /^Former:/i.test(token)) continue;
    addUnique(current, token);
  }

  return current.join(", ");
}

function main() {
  const opts = parseArgs(process.argv);
  const { headers, rows } = readCsv(opts.csvPath);
  if (!headers.includes("home")) throw new Error("Missing home column");

  const changed = [];
  for (const row of rows) {
    const before = row.home || "";
    const after = normalizeHome(before);
    if (before !== after) {
      changed.push({ title: row.title, before, after });
      row.home = after;
    }
  }

  if (opts.write) writeCsv(opts.csvPath, headers, rows);

  console.log(`${opts.write ? "Wrote" : "Dry run"} ${opts.csvPath}`);
  console.log(`Changed rows: ${changed.length}`);
  for (const change of changed.slice(0, 30)) {
    console.log(`\n${change.title}`);
    console.log(`- ${change.before}`);
    console.log(`+ ${change.after}`);
  }
  if (changed.length > 30) console.log(`\n... ${changed.length - 30} more`);
}

main();
