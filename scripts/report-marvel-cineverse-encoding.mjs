import fs from "node:fs";
import path from "node:path";

const rootDir = "d:/worlddle";
const dataPath = path.join(rootDir, "data", "marvel-cineverse.json");
const outPath = path.join(rootDir, "data", "marvel-cineverse-encoding-report.txt");

const FFFD = "\uFFFD";

const PATTERNS = [
  { name: "U+FFFD (replacement char)", re: /\uFFFD/g },
  { name: "L'..re d'Ultron (ère corrompue)", re: /L'[\s\S]{0,4}re d'Ultron/g },
  { name: "T..nbres (Ténèbres)", re: /T[\s\S]{0,4}n[\s\S]{0,4}bres/g },
  { name: "(S..rie) série", re: /\(S[\s\S]{0,2}rie\)/g },
  { name: "vid..o promotionnelle", re: /vid[\s\S]{0,2}o promotionnelle/gi },
  { name: "États-Unis corrompu", re: /[\s\S]{0,2}0tats-Unis/g },
  { name: "Mojibake Å\" (œ)", re: /Å./g },
];

function walkStrings(value, keyPath, onString) {
  if (typeof value === "string") {
    onString(keyPath, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, `${keyPath}[${i}]`, onString));
    return;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) {
      walkStrings(value[k], keyPath ? `${keyPath}.${k}` : k, onString);
    }
  }
}

const raw = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);

const patternCounts = Object.fromEntries(PATTERNS.map((p) => [p.name, 0]));
let fffdTotal = 0;
const fffdExamples = [];

walkStrings(data, "", (path, str) => {
  for (const p of PATTERNS) {
    const m = str.match(p.re);
    if (m) patternCounts[p.name] += m.length;
  }
  if (str.includes(FFFD)) {
    for (const ch of str) {
      if (ch === FFFD) fffdTotal++;
    }
    if (fffdExamples.length < 25) {
      const i = str.indexOf(FFFD);
      const snippet = str.slice(Math.max(0, i - 24), Math.min(str.length, i + 24)).replace(/\r?\n/g, " ");
      fffdExamples.push({ path, snippet });
    }
  }
});

const lines = [
  `File: ${dataPath}`,
  `Total U+FFFD code units in all string values: ${fffdTotal}`,
  "",
  "Pattern match counts (may overlap):",
  ...PATTERNS.map((p) => `  ${p.name}: ${patternCounts[p.name]}`),
  "",
  "Sample paths/snippets containing U+FFFD (max 25):",
  ...fffdExamples.map((e) => `  ${e.path}\n    ${JSON.stringify(e.snippet)}`),
  "",
];

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`written ${outPath}`);
console.log(`fffd_code_units=${fffdTotal}`);
