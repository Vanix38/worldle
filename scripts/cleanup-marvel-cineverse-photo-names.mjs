import fs from "node:fs";
import path from "node:path";

const photosDir = "d:/worlddle/public/universes/marvel-cineverse/characters";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

const entries = fs.readdirSync(photosDir, { withFileTypes: true });

let renamedCount = 0;
let skippedCollision = 0;
let untouched = 0;

for (const entry of entries) {
  if (!entry.isFile()) continue;

  const ext = path.extname(entry.name).toLowerCase();
  if (!imageExtensions.has(ext)) continue;

  const baseName = path.basename(entry.name, ext);
  const cleanedBaseName = baseName
    .replace(/_terre_[a-z0-9-]+/gi, "")
    .replace(/_earth_[a-z0-9-]+/gi, "")
    .replace(/-terre-[a-z0-9-]+/gi, "")
    .replace(/-earth-[a-z0-9-]+/gi, "")
    .replace(/[-_]{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  const cleanedName = `${cleanedBaseName}${ext}`;

  if (cleanedName === entry.name) {
    untouched++;
    continue;
  }

  const sourcePath = path.join(photosDir, entry.name);
  const targetPath = path.join(photosDir, cleanedName);

  if (fs.existsSync(targetPath)) {
    skippedCollision++;
    console.warn(`[collision] ${cleanedName} exists, skipped.`);
    continue;
  }

  fs.renameSync(sourcePath, targetPath);
  renamedCount++;
  console.log(`[renamed] ${entry.name} -> ${cleanedName}`);
}

console.log("");
console.log(`Renamed: ${renamedCount}`);
console.log(`Untouched: ${untouched}`);
console.log(`Skipped (collision): ${skippedCollision}`);
