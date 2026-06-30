import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const ALIASES = {
  universa: ["Reine guerrière"],
  "supreme-lizard": ["Supreme Lizard"],
  "angstrom-levy": ["Peacemaker", "Pacificateur"],
  kregg: ["Général Kregg", "General Kregg"],
  "donald-ferguson": ["Donnie", "Agent Ferguson"],
  "flaxan-leader": ["Flaxan Leader", "Chef des Flaxans"],
  aquarus: ["Roi d'Atlantis"],
  "martian-man": ["Martian Man"],
  "the-elephant": ["L'Éléphant", "Elephant"],
  andressa: ["Impératrice de Thraxa"],
  "rick-sheridan": ["RéAniman"],
};

for (const c of data.characters) {
  if (ALIASES[c.id]) {
    c.aliases = ALIASES[c.id];
    console.log(`${c.id}: ${c.aliases.join(", ")}`);
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
console.log(`aliases: ${data.fieldPrevalence.aliases} (${Math.round(data.fieldPrevalence.aliases * n)}/${n})`);
