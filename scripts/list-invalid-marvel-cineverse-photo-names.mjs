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
const toUniversSlug = (value) => {
  return toSlug(value, "_");
};
const toEarthSlug = (value) => {
  const raw = toSlug(value);
  const cleaned = raw.replace(/^(terre|earth)-?/, "");
  return cleaned || raw;
};

const rawJson = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(rawJson);
const characters = Array.isArray(data.characters) ? data.characters : [];

const expectedBases = new Set();
for (const c of characters) {
  const nameSlug = toNameSlug(stripParentheses(c?.name));
  const universSlug = toUniversSlug(c?.univers);
  const earthSlug = toEarthSlug(c?.earth);
  if (!nameSlug || !universSlug || !earthSlug) continue;
  expectedBases.add(`${nameSlug}-${universSlug}-${earthSlug}`);
}

const entries = fs.readdirSync(photosDir, { withFileTypes: true });
const invalid = [];
let checked = 0;

for (const entry of entries) {
  if (!entry.isFile()) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (!imageExtensions.has(ext)) continue;
  checked++;

  const base = path.basename(entry.name, ext);
  if (!expectedBases.has(base)) invalid.push(entry.name);
}

if (invalid.length === 0) {
  console.log(`OK: ${checked} images valides.`);
  process.exit(0);
}

console.log(`Invalides: ${invalid.length}/${checked}`);
for (const name of invalid.sort((a, b) => a.localeCompare(b, "fr"))) {
  console.log(name);
}
