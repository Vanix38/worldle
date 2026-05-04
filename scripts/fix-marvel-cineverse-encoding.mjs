import fs from "node:fs";
import path from "node:path";

const rootDir = "d:/worlddle";
const dataPath = path.join(rootDir, "data", "marvel-cineverse.json");
const tmpPath = `${dataPath}.tmp`;

const FFFD = "\uFFFD";
const LEFT_DOUBLE_QUOTE = "\u201c"; // “

const FIXED_INDICE2_PROMPT = "Année (première apparition à l'écran)";

/** @param {string} path */
function sanitizeString(path, s) {
  let t = s;

  if (path === "fieldMapping.indice2.hint.prompt" && t.includes(FFFD)) {
    return FIXED_INDICE2_PROMPT;
  }

  if (path === "fieldMapping.indice3.hint.prompt" && t.includes("Å") && t.includes(LEFT_DOUBLE_QUOTE)) {
    t = t.replace(`Films et Å${LEFT_DOUBLE_QUOTE}uvres`, "Films et œuvres");
  }

  if (path === "fieldMapping.role.description") {
    t = t.replace(/Traétre,\s*Traître/g, "Traître");
  }

  const rules = [
    [/L'\uFFFD\uFFFDre d'Ultron/g, "L'ère d'Ultron"],
    [/T\uFFFDn\uFFFDbres/g, "Ténèbres"],
    [/\(S\uFFFDrie\)/g, "(Série)"],
    [/vid\uFFFDo/gi, "vidéo"],
    [/\uFFFD0tats-Unis/g, "États-Unis"],
    [/\uFFFD0ternels/g, "Éternels"],
    [/\uFFFD0lodie/g, "Élodie"],
    [/Ma\uFFFDtre/g, "Maître"],
    [/l'\uFFFDvolution/g, "l'évolution"],
    [/interpr\uFFFDte/g, "interprète"],
    [/l'\uFFFDcran/g, "l'écran"],
    [/num\uFFFDriques/g, "numériques"],
    [/ humaine \uFFFD l'/g, " humaine à l'"],
    [new RegExp(`SÅ${LEFT_DOUBLE_QUOTE}ur`, "g"), "Sœur"],
  ];

  for (const [re, rep] of rules) {
    t = t.replace(re, rep);
  }

  if (t.includes(FFFD) && /premi.*cran/.test(t) && t.includes("apparition")) {
    return FIXED_INDICE2_PROMPT;
  }

  return t;
}

function walkMutate(value, keyPath) {
  if (typeof value === "string") {
    const next = sanitizeString(keyPath, value);
    return { changed: next !== value, value: next };
  }
  if (Array.isArray(value)) {
    let changed = false;
    for (let i = 0; i < value.length; i++) {
      const childPath = `${keyPath}[${i}]`;
      const res = walkMutate(value[i], childPath);
      if (res.changed) {
        value[i] = res.value;
        changed = true;
      }
    }
    return { changed, value };
  }
  if (value && typeof value === "object") {
    let changed = false;
    for (const k of Object.keys(value)) {
      const childPath = keyPath ? `${keyPath}.${k}` : k;
      const res = walkMutate(value[k], childPath);
      if (res.changed) {
        value[k] = res.value;
        changed = true;
      }
    }
    return { changed, value };
  }
  return { changed: false, value };
}

function countFffdInStrings(value, acc = { n: 0 }) {
  if (typeof value === "string") {
    for (const ch of value) if (ch === FFFD) acc.n++;
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => countFffdInStrings(v, acc));
    return;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) countFffdInStrings(value[k], acc);
  }
}

const raw = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);

const before = { n: 0 };
countFffdInStrings(data, before);

let iterations = 0;
let totalChanged = 0;
while (iterations < 8) {
  iterations++;
  const { changed } = walkMutate(data, "");
  if (!changed) break;
  totalChanged++;
}

const after = { n: 0 };
countFffdInStrings(data, after);

fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
fs.renameSync(tmpPath, dataPath);

console.log(
  JSON.stringify(
    {
      iterations,
      passesWithChanges: totalChanged,
      fffdBefore: before.n,
      fffdAfter: after.n,
    },
    null,
    2,
  ),
);

if (after.n > 0) {
  console.warn(`WARN: ${after.n} U+FFFD code units remain — extend fix rules or fix manually.`);
  process.exitCode = 1;
}
