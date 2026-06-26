/**
 * Normalize gender, species and status in data/amazon-invincible-characters-fields.csv.
 *
 * Default: dry-run preview.
 * Write:   node scripts/normalize-invincible-core-fields.mjs --write
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_CSV = path.join(ROOT, "data", "amazon-invincible-characters-fields.csv");

const FIELD_NAMES = ["gender", "species", "status"];

const VALUE_REPLACEMENTS = {
  gender: new Map([
    ["Male ♂", "Male"],
    ["Female ♀", "Female"],
    ["Male (both)", "Male"],
  ]),
  species: new Map([
    ["Artificial Unopan", "Unopan"],
    ["Human (Cyborg) / ReAniman (temporarily)", "Human, ReAniman"],
    ["Human (Cybernetically Enhanced)", "Human"],
    ["Human (cyborg)", "Human"],
    ["Human (enhanced)", "Human"],
    ["Human (enhanced) /", "Human"],
    ["Human (magically enhanced) /", "Human"],
    ["Human (formerly) / Demon", "Demon"],
    ["Human (presumably)", "Human"],
    ["Human / Demon (formerly)", "Human"],
    ["Human / Monster", "Human, Monster"],
    ["Human or alien", "Unknown"],
    ["Human-Reptilian Hybrid", "Human, Reptilian"],
    ["Viltrumite-Human Hybrid", "Viltrumite, Human"],
    ["Viltrumite-Human Hybrid (formerly) / ReAniman", "Viltrumite, Human, ReAniman"],
    ["Viltrumite-Thraxan Hybrid", "Viltrumite, Thraxan"],
    ["Werewolf / Human (formerly)", "Werewolf"],
  ]),
  status: new Map([
    ["Alive /", "Alive"],
    ["Alive (both)", "Alive"],
    ["Alive (Incarcerated)", "Alive"],
    ["Alive (mentally disabled)", "Alive"],
    ["Alive (possessed by Ka-Hor)", "Alive"],
    ["Alive (comatose)", "Alive"],
    ["Active /", "Active"],
  ]),
};

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

function cleanBase(value) {
  return String(value ?? "")
    .replace(/\[\d+\]/g, "")
    .replace(/\u200e/g, "")
    .replace(/[♂♀]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripStatusNotes(value) {
  return value
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*\/\s*$/g, "")
    .trim();
}

function normalizeField(field, value) {
  let normalized = cleanBase(value);
  if (!normalized) return "";

  const replacements = VALUE_REPLACEMENTS[field];
  if (replacements?.has(normalized)) return replacements.get(normalized);

  if (field === "gender") return normalizeGender(normalized);
  if (field === "species") return normalizeSpecies(normalized);
  if (field === "status") return normalizeStatus(normalized);

  return normalized;
}

function normalizeGender(value) {
  if (/^male\b/i.test(value)) return "Male";
  if (/^female\b/i.test(value)) return "Female";
  return value;
}

function normalizeSpecies(value) {
  let normalized = value
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*\/\s*$/g, "")
    .replace(/\s*\/\s*/g, ", ")
    .trim();

  normalized = normalized.replace(/\b([A-Z][A-Za-z]+)-([A-Z][A-Za-z]+) Hybrid\b/g, "$1, $2");
  normalized = normalized.replace(/\bHybrid\b/g, "").replace(/\s+/g, " ").trim();
  return normalized;
}

function normalizeStatus(value) {
  const stripped = stripStatusNotes(value);
  if (/^alive\b/i.test(stripped)) return "Alive";
  if (/^deceased\b/i.test(stripped)) return "Deceased";
  if (/^unknown\b/i.test(stripped)) return "Unknown";
  return stripped;
}

function main() {
  const opts = parseArgs(process.argv);
  const { headers, rows } = readCsv(opts.csvPath);

  for (const field of FIELD_NAMES) {
    if (!headers.includes(field)) throw new Error(`Missing ${field} column`);
  }

  const changed = [];
  for (const row of rows) {
    for (const field of FIELD_NAMES) {
      const before = row[field] || "";
      const after = normalizeField(field, before);
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
    console.log(`${change.title} | ${change.field}: ${change.before} -> ${change.after}`);
  }
  if (changed.length > 40) console.log(`... ${changed.length - 40} more`);
}

main();
