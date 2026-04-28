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
const toUniversSlug = (value) => {
  const raw = toSlug(value);
  const withoutPrefix = raw.replace(/^(terre|earth)-?/, "");
  return withoutPrefix || raw;
};

const rawJson = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(rawJson);
const characters = Array.isArray(data.characters) ? data.characters : [];

const files = fs.readdirSync(photosDir, { withFileTypes: true });
const photoByBasename = new Map();

for (const entry of files) {
  if (!entry.isFile()) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (!imageExtensions.has(ext)) continue;
  const base = path.basename(entry.name, ext).toLowerCase();
  if (!photoByBasename.has(base)) {
    photoByBasename.set(base, entry.name);
  }
}

let renamedCount = 0;
let skippedNoPhoto = 0;
let skippedMissingData = 0;
let skippedCollision = 0;

for (const character of characters) {
  const id = String(character?.id ?? "").trim();
  const nameSlug = toNameSlug(character?.name);
  const worldSlug = toSlug(character?.univers);
  const universSlug = toUniversSlug(character?.earth);

  if (!id || !nameSlug || !worldSlug || !universSlug) {
    skippedMissingData++;
    continue;
  }

  const sourceFileName = photoByBasename.get(id.toLowerCase());
  if (!sourceFileName) {
    skippedNoPhoto++;
    continue;
  }

  const ext = path.extname(sourceFileName).toLowerCase();
  const targetFileName = `${nameSlug}-${worldSlug}-${universSlug}${ext}`;

  if (sourceFileName === targetFileName) {
    continue;
  }

  const sourcePath = path.join(photosDir, sourceFileName);
  const targetPath = path.join(photosDir, targetFileName);

  if (fs.existsSync(targetPath)) {
    skippedCollision++;
    console.warn(`[collision] ${targetFileName} already exists, skipped.`);
    continue;
  }

  fs.renameSync(sourcePath, targetPath);
  renamedCount++;
  console.log(`[renamed] ${sourceFileName} -> ${targetFileName}`);
}

console.log("");
console.log(`Renamed: ${renamedCount}`);
console.log(`Skipped (no matching photo): ${skippedNoPhoto}`);
console.log(`Skipped (missing character data): ${skippedMissingData}`);
console.log(`Skipped (name collision): ${skippedCollision}`);
