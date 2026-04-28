import fs from "node:fs";

const dataPath = "d:/worlddle/data/marvel-cineverse.json";

const toSlug = (value, separator = "-") =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), "");

const stripParentheses = (value) => String(value ?? "").replace(/\s*\([^)]*\)/g, "").trim();

const raw = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);
const characters = Array.isArray(data.characters) ? data.characters : [];

const seen = new Map();
let changed = 0;
let withSuffix = 0;

for (const character of characters) {
  const name = toSlug(stripParentheses(character?.name), "_");
  const univers = toSlug(character?.univers, "_");
  const earthRaw = toSlug(character?.earth, "-");
  const earth = earthRaw.replace(/^(terre|earth)-?/, "") || earthRaw;

  if (!name || !univers || !earth) continue;

  const baseId = `${name}-${univers}-${earth}`;
  const nextCount = (seen.get(baseId) || 0) + 1;
  seen.set(baseId, nextCount);

  const nextId = nextCount === 1 ? baseId : `${baseId}-${nextCount}`;
  if (nextCount > 1) withSuffix++;

  if (character.id !== nextId) {
    character.id = nextId;
    changed++;
  }
}

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ changed, withSuffix, total: characters.length, uniqueBases: seen.size }, null, 2));
