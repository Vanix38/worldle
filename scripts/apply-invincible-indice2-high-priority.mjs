import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const INDICE2 = {
  paul: "Civil",
  "debbie-grayson": "Civil",
  "art-rosenbaum": "Civil",
  "april-howsam": "Civil",
  "green-ghost-ii": "Civil",
  "war-woman": "Civil",
  "damien-darkblood": "Agent",
  isotope: "Homme de main",
  "doc-seismic": "Scientifique",
  shapesmith: "Soldat",
};

for (const c of data.characters) {
  if (INDICE2[c.id]) {
    c.indice2 = INDICE2[c.id];
    console.log(`${c.id}: ${c.indice2}`);
  }
}

function hasVal(v) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

const n = data.characters.length;
const rates = {};
for (const key of Object.keys(data.fieldMapping)) {
  let count = 0;
  for (const ch of data.characters) if (hasVal(ch[key])) count++;
  rates[key] = count / n;
}
data.fieldPrevalence = Object.fromEntries(
  Object.entries(rates).sort((a, b) => b[1] - a[1]),
);

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`indice2: ${(data.fieldPrevalence.indice2 * 100).toFixed(1)}% (${Math.round(data.fieldPrevalence.indice2 * n)}/${n})`);
