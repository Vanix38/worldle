import fs from "node:fs";
import path from "node:path";

const rootDir = "d:/worlddle";
const dataPath = path.join(rootDir, "data", "marvel-cineverse.json");
const photosDir = path.join(rootDir, "public", "universes", "marvel-cineverse", "characters");
const outCsv = path.join(rootDir, "data", "marvel-cineverse-no-image.csv");
const outJson = path.join(rootDir, "data", "marvel-cineverse-no-image.json");

const exts = [".webp", ".png", ".jpg", ".jpeg"];

const data = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
const characters = Array.isArray(data.characters) ? data.characters : [];

const files = new Set(
  fs.readdirSync(photosDir).filter((f) => fs.statSync(path.join(photosDir, f)).isFile()),
);

const missing = [];
for (const c of characters) {
  const id = c?.id;
  if (!id) continue;
  const ok = exts.some((e) => files.has(`${id}${e}`));
  if (!ok) missing.push({ id, name: c?.name ?? "" });
}

const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
const csvLines = ["id,name", ...missing.map((r) => `${esc(r.id)},${esc(r.name)}`)];
fs.writeFileSync(outCsv, `${csvLines.join("\n")}\n`, "utf8");
fs.writeFileSync(outJson, `${JSON.stringify(missing, null, 2)}\n`, "utf8");

console.log(`written ${outCsv}`);
console.log(`written ${outJson}`);
console.log(`count ${missing.length}`);
