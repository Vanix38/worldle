import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const REMOVE_IDS = new Set([
  "l-immortel-ligne-temporelle-future",
  "dropkick",
  "fightmaster",
  "atom-eve-ligne-temporelle-alternative",
  "robot-ligne-temporelle-alternative",
]);

const SPECIFIC = {
  domina: {
    affiliation: "Clan Darkblood, Forces de l'Enfer",
    formerAffiliation: "",
  },
  radcliffe: {
    affiliation: "Agence de Défence Globale (A.D.G.)",
    formerAffiliation: "",
  },
  "oliver-grayson-ii": {
    affiliation: "Coalition des Planètes",
    formerAffiliation: "",
  },
  paul: { affiliation: "Civil", formerAffiliation: "" },
  bulletproof: {
    affiliation: "Teen Team",
    formerAffiliation: "Gardiens du Globe",
  },
  isotope: {
    affiliation: "L'ordre",
    formerAffiliation: "Titan",
  },
  "omni-man": {
    affiliation: "Coalition des Planètes",
    formerAffiliation: "Empire Viltrumite",
  },
  titan: { affiliation: "L'ordre", formerAffiliation: "" },
};

function isCivilian(occupation) {
  if (!occupation) return false;
  return occupation.split(",").some((p) => p.trim() === "Civil");
}

const before = data.characters.length;
data.characters = data.characters.filter((c) => !REMOVE_IDS.has(c.id));

for (const c of data.characters) {
  if (SPECIFIC[c.id]) {
    Object.assign(c, SPECIFIC[c.id]);
  }
}

for (const c of data.characters) {
  if (SPECIFIC[c.id]) continue;
  if (c.affiliation) continue;

  c.affiliation = isCivilian(c.occupation) ? "Civil" : "Indépendant";
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Removed ${before - data.characters.length} characters`);
console.log(`Remaining: ${data.characters.length}`);
