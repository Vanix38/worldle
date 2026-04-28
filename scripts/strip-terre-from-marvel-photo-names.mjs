import fs from "node:fs";
import path from "node:path";

const photosDir = "d:/worlddle/public/universes/marvel-cineverse/characters";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

let renamed = 0;
let skipped = 0;
let collisions = 0;

for (const entry of fs.readdirSync(photosDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (!imageExtensions.has(ext)) continue;

  const base = path.basename(entry.name, ext);
  const cleaned = base.replace(/_terre_\d+/g, "").replace(/[-_]{2,}/g, "-").replace(/^[-_]+|[-_]+$/g, "");
  if (cleaned === base) {
    skipped++;
    continue;
  }

  const targetName = `${cleaned}${ext}`;
  const src = path.join(photosDir, entry.name);
  const dst = path.join(photosDir, targetName);

  if (fs.existsSync(dst)) {
    collisions++;
    console.warn(`[collision] ${entry.name} -> ${targetName}`);
    continue;
  }

  fs.renameSync(src, dst);
  renamed++;
  console.log(`[renamed] ${entry.name} -> ${targetName}`);
}

console.log("");
console.log(`Renamed: ${renamed}`);
console.log(`Unchanged: ${skipped}`);
console.log(`Skipped collision: ${collisions}`);
