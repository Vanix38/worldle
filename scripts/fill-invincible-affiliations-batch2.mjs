import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const AFF = {
  "space-racer": {
    affiliation: "Coalition des Planètes",
    formerAffiliation: "",
  },
  "komodo-dragon": {
    affiliation: "Ligue Lézard",
    formerAffiliation: "",
  },
  andressa: { affiliation: "Thraxa", formerAffiliation: "" },
  "oliver-grayson-ii": { affiliation: "", formerAffiliation: "" },
  lucan: { affiliation: "Empire Viltrumite", formerAffiliation: "" },
  telia: { affiliation: "Coalition des Planètes", formerAffiliation: "" },
  thaedus: {
    affiliation: "Coalition des Planètes",
    formerAffiliation: "Empire Viltrumite",
  },
  "darkwing-ii": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "",
  },
  paul: { affiliation: "", formerAffiliation: "" },
  "supreme-lizard": {
    affiliation: "Ligue Lézard",
    formerAffiliation: "",
  },
  "angstrom-levy": {
    affiliation: "Équipe des Invincibles maléfiques",
    formerAffiliation: "",
  },
  bulletproof: {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "Teen Team",
  },
  conquest: { affiliation: "Empire Viltrumite", formerAffiliation: "" },
  "great-wall": { affiliation: "L'ordre", formerAffiliation: "" },
  kregg: { affiliation: "Empire Viltrumite", formerAffiliation: "" },
  thula: { affiliation: "Empire Viltrumite", formerAffiliation: "" },
  "d-a-sinclair": {
    affiliation: "Agence de Défence Globale (A.D.G.)",
    formerAffiliation: "",
  },
  "rick-sheridan": { affiliation: "", formerAffiliation: "" },
  "adam-wilkins": { affiliation: "", formerAffiliation: "" },
  "battle-beast": {
    affiliation: "Coalition des Planètes",
    formerAffiliation: "",
  },
};

const slice = data.characters.slice(20, 40);
let n = 0;
for (const c of slice) {
  const a = AFF[c.id];
  if (!a) {
    console.warn("missing", c.id);
    continue;
  }
  c.affiliation = a.affiliation;
  c.formerAffiliation = a.formerAffiliation;
  n++;
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Updated ${n} characters`);
