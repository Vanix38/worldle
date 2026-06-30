import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const AFF = {
  iguana: { affiliation: "Ligue Lézard", formerAffiliation: "" },
  argall: { affiliation: "Empire Viltrumite", formerAffiliation: "" },
  "ed-thompson": { affiliation: "", formerAffiliation: "" },
  domina: { affiliation: "Clan Darkblood", formerAffiliation: "" },
  volcanikka: { affiliation: "Magmanites", formerAffiliation: "" },
  "capitaine-pikell": {
    affiliation: "Coalition des Planètes",
    formerAffiliation: "",
  },
  thragg: { affiliation: "Empire Viltrumite", formerAffiliation: "" },
  universa: {
    affiliation: "",
    formerAffiliation: "Coalition des Planètes",
  },
  satan: { affiliation: "Forces de l'Enfer", formerAffiliation: "" },
  brit: {
    affiliation: "Agence de Défence Globale (A.D.G.)",
    formerAffiliation: "Gardiens du Globe",
  },
  "tech-jacket": {
    affiliation: "Coalition des Planètes",
    formerAffiliation: "",
  },
  powerplex: {
    affiliation: "",
    formerAffiliation: "Agence de Défence Globale (A.D.G.)",
  },
  "l-immortel-ligne-temporelle-future": {
    affiliation: "",
    formerAffiliation: "Gardiens du Globe",
  },
  radcliffe: {
    affiliation: "",
    formerAffiliation: "Agence de Défence Globale (A.D.G.)",
  },
  dropkick: { affiliation: "La Résistance", formerAffiliation: "" },
  fightmaster: { affiliation: "La Résistance", formerAffiliation: "" },
  "atom-eve-ligne-temporelle-alternative": {
    affiliation: "",
    formerAffiliation: "Teen Team",
  },
  "robot-ligne-temporelle-alternative": {
    affiliation: "",
    formerAffiliation: "Teen Team, Gardiens du Globe",
  },
  anissa: { affiliation: "Empire Viltrumite", formerAffiliation: "" },
  "april-howsam": {
    affiliation: "Agence de Défence Globale (A.D.G.)",
    formerAffiliation: "",
  },
};

let n = 0;
for (const c of data.characters.slice(0, 20)) {
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
