import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");
const OUT_PATH = path.join(__dirname, "..", "data", "one-piece-en-fr-dftype-origin-report.txt");

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

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function sortUnique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function extractDfTypes(value) {
  const text = norm(value)
    .replace(/[()]/g, " ")
    .replace(/artificial zoan/g, "zoan artificiel")
    .replace(/smile/g, "zoan artificiel");

  const out = [];

  if (/special paramecia/.test(text)) out.push("special paramecia");
  if (/mythical zoan|zoan mythique/.test(text)) out.push("mythical zoan");
  if (/ancient zoan|zoan antique/.test(text)) out.push("ancient zoan");
  if (/zoan artificiel/.test(text)) out.push("artificial zoan");
  if (/logia/.test(text)) out.push("logia");
  if (/paramecia/.test(text) && !out.includes("special paramecia")) out.push("paramecia");
  if (/(^| )zoan( |$)/.test(text) && !out.includes("mythical zoan") && !out.includes("ancient zoan") && !out.includes("artificial zoan")) {
    out.push("zoan");
  }

  return sortUnique(out);
}

function compareDfType(en, fr) {
  const enTypes = extractDfTypes(en);
  const frTypes = extractDfTypes(fr);

  return {
    ok: JSON.stringify(enTypes) === JSON.stringify(frTypes),
    detail: `en=${en || "∅"} => [${enTypes.join(", ")}] | fr=${fr || "∅"} => [${frTypes.join(", ")}]`,
  };
}

const ORIGIN_ALIASES = [
  [/guanhao/g, "grand line"],
  [/logue town/g, "loguetown"],
  [/erbaf/g, "elbaph"],
  [/pays des wa/g, "wano country"],
  [/royaume ryugu/g, "ryugu kingdom"],
  [/principaute de mokomo/g, "mokomo dukedom"],
  [/royaume de goa/g, "goa kingdom"],
  [/village de shimotsuki/g, "shimotsuki village"],
  [/ile des hommes poissons/g, "fish-man island"],
  [/ile des hommes-poissons/g, "fish-man island"],
  [/ile de drum/g, "drum kingdom"],
  [/village de fuchsia/g, "foosha village"],
  [/mont corvo/g, "mt. colubo"],
  [/mont corbo/g, "mt. colubo"],
  [/ile de ruche/g, "hachinosu"],
  [/baldimore/g, "karakuri island"],
  [/royaume des prots/g, "torino kingdom"],
  [/water seven/g, "water 7"],
  [/bilca/g, "birka"],
  [/archipel totto land/g, "totto land"],
  [/iles celestes/g, "sky island"],
  [/ile celeste/g, "sky island"],
  [/origine inconnue/g, "unknown"],
  [/royaume d[' ]alabasta/g, "arabasta kingdom"],
  [/royaume de sorbet/g, "sorbet kingdom"],
  [/royaume bourgeois/g, "bourgeois kingdom"],
  [/royaume de standing/g, "standing kingdom"],
  [/royaume vespa/g, "vespa kingdom"],
  [/sur le moby dick/g, "moby dick"],
  [/kedetrav/g, "kamabakka kingdom"],
  [/archipel des gekko/g, "gecko islands"],
  [/archipel des orgao/g, "organ islands"],
  [/royaume de satsuruzo/g, "satsuruzo kingdom"],
];

function normalizeOriginText(value) {
  let text = norm(value)
    .replace(/[()]/g, ",")
    .replace(/[;/]/g, ",")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ");

  for (const [pattern, replacement] of ORIGIN_ALIASES) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

function extractOriginTokens(value) {
  const text = normalizeOriginText(value);
  if (!text) return [];

  return sortUnique(
    text
      .split(",")
      .map((part) => part.trim())
      .map((part) =>
        part
          .replace(/^ile d[' ]/g, "")
          .replace(/^island of /g, "")
          .replace(/^royaume de /g, "")
          .replace(/^royaume d[' ]/g, "")
          .replace(/^kingdom of /g, "")
          .replace(/^village de /g, "")
          .replace(/^archipel (des |de |d[' ])?/g, "")
          .replace(/^mount /g, "mt. ")
          .replace(/^sur le /g, "")
          .trim()
      )
  );
}

function originSetsMatch(enTokens, frTokens) {
  if (!enTokens.length && !frTokens.length) return true;
  if (!enTokens.length || !frTokens.length) return false;

  const enSet = new Set(enTokens);
  const frSet = new Set(frTokens);
  const intersection = enTokens.filter((token) => frSet.has(token));

  if (intersection.length > 0) return true;
  if (enTokens.every((token) => frSet.has(token))) return true;
  if (frTokens.every((token) => enSet.has(token))) return true;
  return false;
}

function compareOrigin(en, frOrigin, frLive) {
  const frSource = String(frOrigin ?? "").trim() || String(frLive ?? "").trim();
  const enTokens = extractOriginTokens(en);
  const frTokens = extractOriginTokens(frSource);

  return {
    ok: originSetsMatch(enTokens, frTokens),
    detail: `en=${en || "∅"} => [${enTokens.join(", ")}] | fr=${frSource || "∅"} => [${frTokens.join(", ")}]`,
  };
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const rows = lines.map(parseLine);
const header = rows[0];

const idx = {
  id: header.indexOf("id"),
  localName: header.indexOf("local_name"),
  enDfType: header.indexOf("en_wiki_dftype"),
  frDfType: header.indexOf("fr_wiki_dftype"),
  enOrigin: header.indexOf("en_wiki_origin"),
  frOrigin: header.indexOf("fr_wiki_origine"),
  frLive: header.indexOf("fr_wiki_lieuvie"),
};

const report = [];

const dftypeMismatches = [];
const originMismatches = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];

  const dftype = compareDfType(row[idx.enDfType], row[idx.frDfType]);
  if (!dftype.ok) {
    dftypeMismatches.push({
      id: row[idx.id],
      localName: row[idx.localName],
      detail: dftype.detail,
    });
  }

  const origin = compareOrigin(row[idx.enOrigin], row[idx.frOrigin], row[idx.frLive]);
  if (!origin.ok) {
    originMismatches.push({
      id: row[idx.id],
      localName: row[idx.localName],
      detail: origin.detail,
    });
  }
}

report.push("## dftype");
report.push(`count: ${dftypeMismatches.length}`);
for (const item of dftypeMismatches) {
  report.push(`- ${item.id} | ${item.localName} | ${item.detail}`);
}
report.push("");

report.push("## origin");
report.push(`count: ${originMismatches.length}`);
for (const item of originMismatches) {
  report.push(`- ${item.id} | ${item.localName} | ${item.detail}`);
}
report.push("");

fs.writeFileSync(OUT_PATH, report.join("\n"), "utf8");
console.log(`Wrote ${OUT_PATH}`);
console.log(`dftype mismatches: ${dftypeMismatches.length}`);
console.log(`origin mismatches: ${originMismatches.length}`);
