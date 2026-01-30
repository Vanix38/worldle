import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "one-piece-cleaned.csv");
const outPath = join(root, "data", "one-piece.json");

function parseCSVLine(line) {
  const result = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let cell = "";
      while (i < line.length && line[i] !== '"') {
        cell += line[i++];
      }
      i++;
      result.push(cell);
      if (line[i] === ",") i++;
    } else {
      let cell = "";
      while (i < line.length && line[i] !== ",") {
        cell += line[i++];
      }
      result.push(cell.trim());
      i++;
    }
  }
  return result;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueId(name, index, used) {
  let base = slugify(name);
  if (!base) base = "char";
  let id = base;
  let n = 0;
  while (used.has(id)) {
    id = `${base}-${++n}`;
  }
  used.add(id);
  return id;
}

const hakiMap = {
  "Conqueror's": "Roi",
  Armament: "Armement",
  Observation: "Observation",
};

function mapHaki(hakiStr) {
  if (!hakiStr || hakiStr.trim() === "None") return "";
  return hakiStr
    .split("|")
    .map((s) => hakiMap[s.trim()] || s.trim())
    .filter(Boolean)
    .join(", ");
}

function mapGender(g) {
  if (g === "Female") return "Femme";
  if (g === "Male") return "Homme";
  return g || "";
}

function mapDevilFruitType(df) {
  if (!df || df.trim() === "None") return "";
  if (df.includes("|")) return df.split("|")[0].trim();
  return df.trim();
}

const csv = readFileSync(csvPath, "utf-8");
const lines = csv.split(/\r?\n/).filter((l) => l.trim());
const header = parseCSVLine(lines[0]);
const nameIdx = header.indexOf("Character Name");
const genderIdx = header.indexOf("Gender");
const ageIdx = header.indexOf("Age");
const aliasesIdx = header.indexOf("Aliases");
const bountyIdx = header.indexOf("Bounty (in millions of berries)");
const arcIdx = header.indexOf("First Arc");
const dfIdx = header.indexOf("DevilFruit Type");
const affIdx = header.indexOf("Affiliation");
const originIdx = header.indexOf("Origin");
const hakiIdx = header.indexOf("Haki");

const usedIds = new Set();
const characters = [];

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  if (row.length < 10) continue;
  const name = (row[nameIdx] || "").trim();
  if (!name) continue;
  const bountyMillions = parseFloat(row[bountyIdx]) || 0;
  const bounty = Math.round(bountyMillions * 1_000_000);
  const aliasesStr = (row[aliasesIdx] || "").trim();
  const aliases = aliasesStr ? aliasesStr.split("|").map((s) => s.trim()).filter(Boolean) : [];
  const char = {
    id: uniqueId(name, i, usedIds),
    name,
    ...(aliases.length > 0 && { aliases }),
    gender: mapGender(row[genderIdx]),
    age: parseInt(row[ageIdx], 10) >= 0 ? parseInt(row[ageIdx], 10) : 0,
    bounty,
    arc: (row[arcIdx] || "").trim(),
    devilFruitType: mapDevilFruitType(row[dfIdx]),
    affiliation: (row[affIdx] || "").trim() || "None",
    origin: (row[originIdx] || "").trim(),
    haki: mapHaki(row[hakiIdx]),
  };
  characters.push(char);
}

const output = {
  id: "one-piece",
  name: "One Piece",
  characters,
};

writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`Wrote ${characters.length} characters to ${outPath}`);
