/**
 * Split `occupation` into current occupation + `former_occupations`.
 *
 * Default: dry-run preview.
 * Write:   node scripts/split-invincible-occupations.mjs --write
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_CSV = path.join(ROOT, "data", "amazon-invincible-characters-fields.csv");

const FORMER_NOTE_RE = /\((?:formerly|former|resigned[^)]*|graduated[^)]*|dropped out|terminated|retired|temporary)\)/i;
const REMOVE_NOTE_RE = /\s*\((?:formerly|former|resigned[^)]*|graduated[^)]*|dropped out|terminated|retired|temporary|cover|undercover|currently|new company|in some universes|graduated in \d+ at \d+)\)/gi;

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

function normalizeRawOccupation(value) {
  return String(value ?? "")
    .replace(/\u200e/g, "")
    .replace(/\s+/g, " ")
    .replace(/([a-z)])([A-Z])/g, "$1 / $2")
    .replace(/(formerly)([A-Z])/gi, "$1) / $2")
    .replace(/(Current:|Former:)/gi, " / $1 / ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

function cleanOccupationToken(value) {
  return value
    .replace(/^(Current|Former):$/i, "")
    .replace(/^(Current|Former):/i, "")
    .replace(REMOVE_NOTE_RE, "")
    .replace(/^[:,-]+|[:,-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addUnique(target, value) {
  const cleaned = cleanOccupationToken(value);
  if (!cleaned) return;
  const key = cleaned.toLocaleLowerCase("en");
  if (target.some((existing) => existing.toLocaleLowerCase("en") === key)) return;
  target.push(cleaned);
}

function splitExistingFormerOccupations(value) {
  return String(value || "")
    .split(",")
    .map((part) => cleanOccupationToken(part))
    .filter(Boolean);
}

function splitOccupations(value, existingFormer = "") {
  const normalized = normalizeRawOccupation(value);
  if (!normalized) {
    return {
      occupation: "",
      former_occupations: splitExistingFormerOccupations(existingFormer).join(", "),
    };
  }

  const current = [];
  const former = splitExistingFormerOccupations(existingFormer);
  let mode = "current";

  for (const rawToken of normalized.split("/")) {
    const token = rawToken.trim();
    if (!token) continue;

    if (/^Current:?$/i.test(token)) {
      mode = "current";
      continue;
    }
    if (/^Former:?$/i.test(token)) {
      mode = "former";
      continue;
    }

    if (/^\([^)]*\)$/.test(token)) continue;

    const isFormer = mode === "former" || FORMER_NOTE_RE.test(token);
    addUnique(isFormer ? former : current, token);
  }

  return {
    occupation: current.join(", "),
    former_occupations: former.join(", "),
  };
}

function ensureFormerOccupationHeader(headers) {
  if (headers.includes("former_occupations")) return headers;
  const out = [...headers];
  const occupationIndex = out.indexOf("occupation");
  out.splice(occupationIndex + 1, 0, "former_occupations");
  return out;
}

function main() {
  const opts = parseArgs(process.argv);
  const { headers, rows } = readCsv(opts.csvPath);
  if (!headers.includes("occupation")) throw new Error("Missing occupation column");

  const outputHeaders = ensureFormerOccupationHeader(headers);
  const changed = [];

  for (const row of rows) {
    const beforeOccupation = row.occupation || "";
    const beforeFormer = row.former_occupations || "";
    const after = splitOccupations(beforeOccupation, beforeFormer);

    if (after.occupation !== beforeOccupation || after.former_occupations !== beforeFormer) {
      changed.push({
        title: row.title,
        beforeOccupation,
        afterOccupation: after.occupation,
        afterFormer: after.former_occupations,
      });
      row.occupation = after.occupation;
      row.former_occupations = after.former_occupations;
    }
  }

  if (opts.write) writeCsv(opts.csvPath, outputHeaders, rows);

  console.log(`${opts.write ? "Wrote" : "Dry run"} ${opts.csvPath}`);
  console.log(`Changed rows: ${changed.length}`);
  for (const change of changed.slice(0, 30)) {
    console.log(`\n${change.title}`);
    console.log(`- occupation: ${change.beforeOccupation}`);
    console.log(`+ occupation: ${change.afterOccupation}`);
    console.log(`+ former_occupations: ${change.afterFormer}`);
  }
  if (changed.length > 30) console.log(`\n... ${changed.length - 30} more`);
}

main();
