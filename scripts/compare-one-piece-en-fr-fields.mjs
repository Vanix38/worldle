import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");
const OUT = path.join(__dirname, "..", "data", "one-piece-en-fr-compare-report.txt");

const IDX = {
  id: 0,
  localName: 1,
  enAge: 4,
  enDfName: 7,
  enFirst: 9,
  enHeight: 10,
  enStatus: 14,
  frAge: 16,
  frDfName: 18,
  frFirst: 23,
  frStatus: 25,
  frHeight: 26,
};

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

function firstInt(value) {
  const m = String(value ?? "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function compareAge(en, fr) {
  const a = firstInt(en);
  const b = firstInt(fr);
  return {
    ok: a === b,
    detail: `en=${en || "∅"} | fr=${fr || "∅"}`,
  };
}

function compareHeight(en, fr) {
  const a = firstInt(en);
  const b = firstInt(fr);
  return {
    ok: a === b,
    detail: `en=${en || "∅"} | fr=${fr || "∅"}`,
  };
}

function mapStatus(en) {
  const v = norm(en);
  if (v === "alive") return "vivant(e)";
  if (v === "deceased") return "decede(e)";
  if (v === "unknown") return "inconnu";
  return v;
}

function compareStatus(en, fr) {
  const a = mapStatus(en);
  const b = norm(fr)
    .replace(/decédée?/g, "decede")
    .replace(/decede\(e\)/g, "decede(e)");
  return {
    ok: a === b,
    detail: `en=${en || "∅"} | fr=${fr || "∅"}`,
  };
}

function canonicalDfName(value) {
  return norm(value)
    .replace(/\(/g, ", ")
    .replace(/\)/g, " ")
    .replace(/modele/g, "model")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFruitFamilies(value) {
  const text = canonicalDfName(value);
  const out = [];
  for (const m of text.matchAll(/([a-z]+(?: [a-z]+)* no mi)/g)) {
    out.push(m[1].trim());
  }
  return [...new Set(out)].sort();
}

function compareDfName(en, fr) {
  const a = extractFruitFamilies(en);
  const b = extractFruitFamilies(fr);
  if (!a.length && !b.length) {
    const emptyish = !canonicalDfName(en) && !canonicalDfName(fr);
    return { ok: emptyish, detail: `en=${en || "∅"} | fr=${fr || "∅"}` };
  }
  return {
    ok: JSON.stringify(a) === JSON.stringify(b),
    detail: `en=${en || "∅"} => [${a.join(", ")}] | fr=${fr || "∅"} => [${b.join(", ")}]`,
  };
}

function parseFirstPairs(value, isFr) {
  const text = norm(value);
  const re = isFr
    ? /chapitre\s*(\d+)\s*[,;]?\s*episode\s*(\d+)/g
    : /chapter\s*(\d+)\s*[,;]?\s*episode\s*(\d+)/g;
  const out = [];
  for (const m of text.matchAll(re)) {
    if (m[1] === "0" && m[2] === "0") continue;
    out.push(`${m[1]}/${m[2]}`);
  }
  return out;
}

function compareFirst(en, fr) {
  const a = parseFirstPairs(en, false);
  const b = parseFirstPairs(fr, true);
  const setA = [...new Set(a)].sort();
  const setB = [...new Set(b)].sort();
  return {
    ok: JSON.stringify(setA) === JSON.stringify(setB),
    detail: `en=${en || "∅"} => [${setA.join(", ")}] | fr=${fr || "∅"} => [${setB.join(", ")}]`,
  };
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const rows = lines.slice(1).map(parseLine);

const fields = [
  ["age", IDX.enAge, IDX.frAge, compareAge],
  ["taille", IDX.enHeight, IDX.frHeight, compareHeight],
  ["statut", IDX.enStatus, IDX.frStatus, compareStatus],
  ["dfnom", IDX.enDfName, IDX.frDfName, compareDfName],
  ["premiere", IDX.enFirst, IDX.frFirst, compareFirst],
];

const report = [];
for (const [label, enIdx, frIdx, cmp] of fields) {
  const mismatches = [];
  for (const row of rows) {
    const result = cmp(row[enIdx] ?? "", row[frIdx] ?? "");
    if (!result.ok) {
      mismatches.push({
        id: row[IDX.id],
        localName: row[IDX.localName],
        detail: result.detail,
      });
    }
  }

  report.push(`## ${label}`);
  report.push(`count: ${mismatches.length}`);
  for (const item of mismatches) {
    report.push(`- ${item.id} | ${item.localName} | ${item.detail}`);
  }
  report.push("");
}

fs.writeFileSync(OUT, report.join("\n") + "\n", "utf8");
console.log(`Wrote ${OUT}`);
