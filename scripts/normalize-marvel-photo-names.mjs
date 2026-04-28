import fs from "node:fs";
import path from "node:path";

const rootDir = "d:/worlddle";
const dataPath = path.join(rootDir, "data", "marvel-cineverse.json");
const photosDir = path.join(rootDir, "public", "universes", "marvel-cineverse", "characters");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

const toSlug = (value, separator = "-") =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), "");

const toNameSlug = (value) => toSlug(value, "_");
const stripParentheses = (value) => String(value ?? "").replace(/\s*\([^)]*\)/g, "").trim();
const toEarthSlug = (value) => toSlug(value).replace(/^(terre|earth)-?/, "");

const raw = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);
const characters = Array.isArray(data.characters) ? data.characters : [];

/** @type {Map<string, string[]>} basename(lowercase) -> file names */
const filesByBase = new Map();
for (const entry of fs.readdirSync(photosDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (!imageExtensions.has(ext)) continue;
  const base = path.basename(entry.name, ext).toLowerCase();
  if (!filesByBase.has(base)) filesByBase.set(base, []);
  filesByBase.get(base).push(entry.name);
}

let renamed = 0;
let collisions = 0;
let unmatched = 0;

for (const c of characters) {
  const univers = c?.univers;
  const earth = c?.earth;
  const name = c?.name;
  if (!univers || !earth || !name) continue;

  const fullNameSlug = toNameSlug(name);
  const cleanNameSlug = toNameSlug(stripParentheses(name));
  const universHyphen = toSlug(univers, "-");
  const universUnderscore = toSlug(univers, "_");
  const earthSlug = toEarthSlug(earth);
  if (!cleanNameSlug || !universUnderscore || !earthSlug) continue;

  const targetBase = `${cleanNameSlug}-${universUnderscore}-${earthSlug}`;

  const candidateBases = new Set([
    `${fullNameSlug}-${universHyphen}-${earthSlug}`,
    `${cleanNameSlug}-${universHyphen}-${earthSlug}`,
    `${fullNameSlug}-${universUnderscore}-${earthSlug}`,
    `${cleanNameSlug}-${universUnderscore}-${earthSlug}`,
    `${fullNameSlug}_terre_${earthSlug}-${universHyphen}-${earthSlug}`,
    `${cleanNameSlug}_terre_${earthSlug}-${universHyphen}-${earthSlug}`,
    `${fullNameSlug}_earth_${earthSlug}-${universHyphen}-${earthSlug}`,
    `${cleanNameSlug}_earth_${earthSlug}-${universHyphen}-${earthSlug}`,
  ]);

  let matchedAny = false;
  for (const candidateBase of candidateBases) {
    const files = filesByBase.get(candidateBase.toLowerCase());
    if (!files || files.length === 0) continue;

    for (const fileName of [...files]) {
      matchedAny = true;
      const ext = path.extname(fileName).toLowerCase();
      const sourcePath = path.join(photosDir, fileName);
      const targetName = `${targetBase}${ext}`;
      const targetPath = path.join(photosDir, targetName);

      if (fileName === targetName) continue;
      if (fs.existsSync(targetPath)) {
        collisions++;
        console.warn(`[collision] ${fileName} -> ${targetName}`);
        continue;
      }

      fs.renameSync(sourcePath, targetPath);
      renamed++;
      console.log(`[renamed] ${fileName} -> ${targetName}`);

      // keep in-memory index coherent
      const oldBase = path.basename(fileName, ext).toLowerCase();
      const oldList = filesByBase.get(oldBase) || [];
      filesByBase.set(oldBase, oldList.filter((x) => x !== fileName));

      const newBase = path.basename(targetName, ext).toLowerCase();
      if (!filesByBase.has(newBase)) filesByBase.set(newBase, []);
      filesByBase.get(newBase).push(targetName);
    }
  }

  if (!matchedAny) unmatched++;
}

console.log("");
console.log(`Renamed: ${renamed}`);
console.log(`Collisions: ${collisions}`);
console.log(`Unmatched characters: ${unmatched}`);
