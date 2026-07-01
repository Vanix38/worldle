/**
 * Renomme les Jolly Roger : slug → libellé exact affiliation JSON.
 * Usage: node scripts/rename-jolly-rogers-affiliation.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "public", "universes", "one-piece-anime", "specific-symbols");
const JSON_PATH = path.join(ROOT, "data", "one-piece-anime.json");

function slugify(text) {
  return text
    .replace(/^l['']/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeFilename(affiliation, ext) {
  return `${affiliation.replace(/[<>:"/\\|?*]/g, "")}${ext}`;
}

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const slugToAff = new Map();
for (const c of data.characters) {
  for (const a of [c.affiliation, ...(c.sub_affiliation || [])].filter(Boolean)) {
    slugToAff.set(slugify(a), a);
  }
}

const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".png"));

for (const file of files) {
  const ext = path.extname(file);
  const stem = file.slice(0, -ext.length);
  const aff = slugToAff.get(stem);
  if (!aff) {
    console.warn("SKIP (pas dans JSON):", file);
    continue;
  }
  const target = safeFilename(aff, ext);
  if (file === target) {
    console.log("OK", target);
    continue;
  }
  const from = path.join(DIR, file);
  const to = path.join(DIR, target);
  if (fs.existsSync(to)) {
    console.warn("SKIP existe:", target);
    continue;
  }
  if (file.toLowerCase() === target.toLowerCase()) {
    const tmp = path.join(DIR, `.__tmp_${Date.now()}${ext}`);
    fs.renameSync(from, tmp);
    fs.renameSync(tmp, to);
  } else {
    fs.renameSync(from, to);
  }
  console.log(`${file} → ${target}`);
}
