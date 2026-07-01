import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const JSON_PATH = path.join(ROOT, "data", "one-piece-anime.json");
const SYMBOLS_DIR = path.join(ROOT, "public", "universes", "one-piece-anime", "specific-symbols");

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

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const affiliationSlugs = new Set();
const affiliationBySlug = new Map();

for (const c of data.characters) {
  for (const aff of [c.affiliation, ...(c.sub_affiliation || [])]) {
    if (!aff) continue;
    const slug = slugify(aff);
    affiliationSlugs.add(slug);
    if (!affiliationBySlug.has(slug)) affiliationBySlug.set(slug, aff);
  }
}

const files = fs.readdirSync(SYMBOLS_DIR).filter((f) => f.endsWith(".png"));
const unmatched = [];
const matched = [];

for (const file of files.sort()) {
  const fileSlug = file.replace(/\.png$/i, "");
  if (affiliationSlugs.has(fileSlug)) {
    matched.push({ file, affiliation: affiliationBySlug.get(fileSlug) });
    continue;
  }
  unmatched.push(file);
}

console.log("=== Jolly Roger SANS affiliation correspondante ===\n");
for (const f of unmatched) {
  console.log(f.replace(/\.png$/, ""));
}
console.log(`\nTotal: ${unmatched.length} / ${files.length} non matchés, ${matched.length} matchés`);
