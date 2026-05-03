/**
 * Copie les portraits des persos Naruto sans profession vers
 * public/universes/naruto/sans-profession-a-trier/ (même nom de fichier que characters/).
 *
 * Usage: node scripts/copy-naruto-empty-profession-images.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "naruto.json");
const SRC_DIR = path.join(ROOT, "public", "universes", "naruto", "characters");
const DEST_DIR = path.join(ROOT, "public", "universes", "naruto", "sans-profession-a-trier");
const EXTENSIONS = ["webp", "png", "jpg", "jpeg"];

const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
const empty = data.characters.filter((c) => !String(c.profession ?? "").trim());

fs.mkdirSync(DEST_DIR, { recursive: true });

let copied = 0;
let missing = 0;
const missingIds = [];

for (const c of empty) {
  let src = null;
  let extUsed = null;
  for (const ext of EXTENSIONS) {
    const p = path.join(SRC_DIR, `${c.id}.${ext}`);
    if (fs.existsSync(p)) {
      src = p;
      extUsed = ext;
      break;
    }
  }
  if (src) {
    const dest = path.join(DEST_DIR, `${c.id}.${extUsed}`);
    fs.copyFileSync(src, dest);
    copied++;
  } else {
    missing++;
    missingIds.push(c.id);
  }
}

console.log(
  "sans profession:",
  empty.length,
  "| copiés:",
  copied,
  "| pas d’image:",
  missing,
);
if (missingIds.length && missingIds.length <= 30) {
  console.log("ids sans fichier:", missingIds.join(", "));
} else if (missingIds.length) {
  console.log("(liste ids disponible dans missingIds si besoin)");
}
