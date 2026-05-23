/**
 * Normalise cheveux / yeux : garde 2011, retire 1999/1998.
 * Usage: node scripts/apply-hxh-versioned-attrs-2011.mjs [--out path] [--fields cheveux,yeux]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.join(__dirname, "..", "data", "hunterxhunter.json");
const DEFAULT_FIELDS = ["cheveux", "yeux"];

function splitVersionedSegments(raw) {
  let s = String(raw);
  s = s.replace(/\)\s*(?=[A-ZÀ-ÖØ-öø-ÿ])/g, ") / ");
  s = s.replace(/(1999|1998)\s*(?=[A-ZÀ-ÖØ-öø-ÿ(])/gi, "$1 / ");
  return s
    .split(/\s*\/\s*|\s*;\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function clean2011AttributeSegment(p) {
  return p
    .replace(/\([^)]*1999[^)]*\)/gi, "")
    .replace(/\([^)]*1998[^)]*\)/gi, "")
    .replace(/\([^)]*2011[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVersionedAttribute2011(raw) {
  if (!raw || !String(raw).trim()) return "";
  const parts = splitVersionedSegments(raw);
  const y2011 = parts.filter((p) => /2011/i.test(p));
  if (y2011.length > 0) {
    return y2011.map(clean2011AttributeSegment).filter(Boolean).join(" / ");
  }
  const no1999 = parts.filter((p) => !/1999|1998/i.test(p));
  return no1999.map(clean2011AttributeSegment).filter(Boolean).join(" / ") || "";
}

function parseArgv(argv) {
  const out = { outPath: DEFAULT_OUT, fields: [...DEFAULT_FIELDS] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") out.outPath = argv[++i] || DEFAULT_OUT;
    else if (argv[i] === "--fields") {
      out.fields = (argv[++i] || "").split(",").map((f) => f.trim()).filter(Boolean);
    }
  }
  return out;
}

const opts = parseArgv(process.argv);
const data = JSON.parse(fs.readFileSync(opts.outPath, "utf8"));
const stats = Object.fromEntries(opts.fields.map((f) => [f, { changed: 0, empty: [] }]));

for (const c of data.characters) {
  for (const field of opts.fields) {
    if (!c[field]) continue;
    const next = normalizeVersionedAttribute2011(c[field]);
    if (next !== c[field]) {
      stats[field].changed++;
      c[field] = next;
    }
    if (!c[field]) stats[field].empty.push(`${c.id} (${c.name})`);
  }
}

fs.writeFileSync(opts.outPath, JSON.stringify(data, null, 2), "utf8");
console.log("Wrote", opts.outPath);
for (const field of opts.fields) {
  console.log(`${field} modifiés:`, stats[field].changed);
  if (stats[field].empty.length) console.log(`${field} vides:`, stats[field].empty.join(", "));
}
