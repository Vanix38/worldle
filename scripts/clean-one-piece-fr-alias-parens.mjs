import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

function parseLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ";") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function csvEscapeField(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function splitTopLevel(value, sepRegex = /,/) {
  const out = [];
  let cur = "";
  let quoted = false;
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') {
      quoted = !quoted;
      cur += ch;
      continue;
    }
    if (!quoted && ch === "(") {
      depth++;
      cur += ch;
      continue;
    }
    if (!quoted && ch === ")") {
      depth = Math.max(0, depth - 1);
      cur += ch;
      continue;
    }
    if (!quoted && depth === 0 && sepRegex.test(ch)) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function extractParenSegments(value) {
  const out = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(value.slice(start, i));
        start = -1;
      }
    }
  }
  return out;
}

function stripParenSegments(value) {
  let out = "";
  let depth = 0;
  for (const ch of value) {
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0) out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

function unwrapQuotes(value) {
  let s = value.trim();
  while (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("“") && s.endsWith("”")) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function normalizeAlias(value) {
  let s = String(value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  s = s
    .replace(/^[-,;:?･\s]+/u, "")
    .replace(/^[A-Za-zÀ-ÿ-]+\.\s*,\s*/u, "")
    .replace(/^litt\.\s*/iu, "")
    .replace(/^signifiant littéralement\s*/iu, "")
    .replace(/^version française\s*:\s*/iu, "")
    .replace(/^versions? françaises?\s*:\s*/iu, "")
    .replace(/^english versions?\s*:\s*/iu, "")
    .replace(/^funimation\s+(?:subs|dub)\s*:\s*/iu, "")
    .replace(/^viz\s*:\s*/iu, "")
    .replace(/^[\s"'“”‘’.,;:?･-]+/u, "")
    .replace(/[\s"'“”‘’.,;:?･-]+$/u, "")
    .replace(/\?+$/u, "")
    .trim();

  s = unwrapQuotes(s).replace(/\s+/g, " ").trim();
  return s;
}

function aliasKey(value) {
  return unwrapQuotes(String(value ?? ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[“”‘’"'.,;:?･()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulAlias(value) {
  if (!value) return false;
  if (!/[A-Za-zÀ-ÿĀ-ſ]/u.test(value)) return false;
  if (/^(dr|dr\.)$/iu.test(value)) return false;
  if (/^(litt|version française|versions françaises|english versions?)$/iu.test(value)) return false;
  return true;
}

function collectAliasesFromSegment(segment) {
  const out = [];
  let work = String(segment ?? "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const contextual = work.replace(
    /^(?:[\s,;:?･-]+|litt\.\s*|version française\s*:\s*|versions? françaises?\s*:\s*)/iu,
    "",
  );

  // Cas du type: Yūsutasu "Kyaputen" Kiddo
  if (/"[^"]+"/.test(contextual) && /[A-Za-zÀ-ÿĀ-ſ]/u.test(contextual.replace(/"[^"]*"/g, " "))) {
    const direct = normalizeAlias(contextual);
    if (isUsefulAlias(direct)) out.push(direct);
  }

  for (const m of work.matchAll(/"([^"]+)"/g)) {
    const alias = normalizeAlias(m[1]);
    if (isUsefulAlias(alias)) out.push(alias);
  }
  work = work.replace(/"[^"]*"/g, " ");

  for (const part of splitTopLevel(work, /[,;]/)) {
    const alias = normalizeAlias(part);
    if (isUsefulAlias(alias)) out.push(alias);
  }
  return out;
}

function extractQuotedAliases(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('"')) return null;
  const matches = [...trimmed.matchAll(/"([^"]+)"/g)].map((m) => normalizeAlias(m[1])).filter(isUsefulAlias);
  const outside = trimmed.replace(/"[^"]*"/g, "").replace(/\s+/g, "").trim();
  return matches.length >= 1 && outside === "" ? matches : null;
}

function uniqueAliases(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const alias = normalizeAlias(item);
    if (!isUsefulAlias(alias)) continue;
    const key = aliasKey(alias);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

function cleanFrAliasesCell(cell) {
  const baseAliases = [];
  const extraAliases = [];

  for (const rawPart of splitTopLevel(String(cell ?? ""), /,/)) {
    const part = rawPart.trim();
    if (!part) continue;

    for (const seg of extractParenSegments(part)) {
      extraAliases.push(...collectAliasesFromSegment(seg));
    }

    const stripped = stripParenSegments(part);
    const quotedAliases = extractQuotedAliases(stripped);
    if (quotedAliases) {
      baseAliases.push(...quotedAliases);
    } else {
      const alias = normalizeAlias(stripped);
      if (isUsefulAlias(alias)) baseAliases.push(alias);
    }
  }

  return uniqueAliases([...baseAliases, ...extraAliases]).join(", ");
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
const aliasIdx = headers.indexOf("fr_wiki_aliases");
if (aliasIdx < 0) {
  console.error("Colonne fr_wiki_aliases introuvable");
  process.exit(1);
}

let changed = 0;
const outLines = [headers.join(";")];
for (let i = 1; i < lines.length; i++) {
  const row = parseLine(lines[i]);
  while (row.length < headers.length) row.push("");
  const before = row[aliasIdx] ?? "";
  const after = cleanFrAliasesCell(before);
  if (after !== before) changed++;
  row[aliasIdx] = after;
  outLines.push(row.map(csvEscapeField).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Nettoyé:", CSV);
console.log("Lignes modifiées:", changed);
