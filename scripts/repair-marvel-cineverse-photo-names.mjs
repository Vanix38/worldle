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
const cleanUnivers = (value) => {
  const raw = toSlug(value);
  const cleaned = raw.replace(/^(terre|earth)-?/, "");
  return cleaned || raw;
};

const rawJson = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(rawJson);
const characters = Array.isArray(data.characters) ? data.characters : [];

const candidatesByName = new Map();
const expectedBasenames = new Set();

for (const c of characters) {
  const nameSlug = toNameSlug(c?.name);
  const worldSlug = toSlug(c?.univers);
  const universSlug = cleanUnivers(c?.earth);
  if (!nameSlug || !worldSlug || !universSlug) continue;

  const expectedBase = `${nameSlug}-${worldSlug}-${universSlug}`;
  expectedBasenames.add(expectedBase);
  if (!candidatesByName.has(nameSlug)) candidatesByName.set(nameSlug, []);
  candidatesByName.get(nameSlug).push(expectedBase);
}

const entries = fs.readdirSync(photosDir, { withFileTypes: true });

let renamed = 0;
let alreadyOk = 0;
let skippedCollision = 0;
let skippedAmbiguous = 0;
let skippedUnknown = 0;

for (const entry of entries) {
  if (!entry.isFile()) continue;

  const ext = path.extname(entry.name).toLowerCase();
  if (!imageExtensions.has(ext)) continue;

  const currentBase = path.basename(entry.name, ext);
  let targetBase = null;

  if (expectedBasenames.has(currentBase)) {
    alreadyOk++;
    continue;
  }

  const directFix = currentBase
    .replace(/_terre_[a-z0-9-]+/gi, "")
    .replace(/_earth_[a-z0-9-]+/gi, "")
    .replace(/-terre-[a-z0-9-]+/gi, "")
    .replace(/-earth-[a-z0-9-]+/gi, "")
    .replace(/[-_]{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  if (expectedBasenames.has(directFix)) {
    targetBase = directFix;
  } else {
    const normalizedForLookup = currentBase.replace(/-/g, "_");
    const byName = candidatesByName.get(normalizedForLookup) || [];
    const available = byName.filter((candidate) => {
      const candidatePath = path.join(photosDir, `${candidate}${ext}`);
      return !fs.existsSync(candidatePath);
    });

    if (available.length === 1) {
      targetBase = available[0];
    } else if (byName.length > 1) {
      skippedAmbiguous++;
      console.warn(`[ambiguous] ${entry.name} -> ${byName.length} candidates`);
      continue;
    } else {
      skippedUnknown++;
      console.warn(`[unknown] ${entry.name} no unique JSON match`);
      continue;
    }
  }

  const targetName = `${targetBase}${ext}`;
  if (targetName === entry.name) {
    alreadyOk++;
    continue;
  }

  const sourcePath = path.join(photosDir, entry.name);
  const targetPath = path.join(photosDir, targetName);
  if (fs.existsSync(targetPath)) {
    skippedCollision++;
    console.warn(`[collision] ${targetName} exists, skipped.`);
    continue;
  }

  fs.renameSync(sourcePath, targetPath);
  renamed++;
  console.log(`[renamed] ${entry.name} -> ${targetName}`);
}

console.log("");
console.log(`Renamed: ${renamed}`);
console.log(`Already OK: ${alreadyOk}`);
console.log(`Skipped collision: ${skippedCollision}`);
console.log(`Skipped ambiguous: ${skippedAmbiguous}`);
console.log(`Skipped unknown: ${skippedUnknown}`);
