import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const AFF = {
  "betsy-wilkins": { affiliation: "", formerAffiliation: "" },
  isotope: { affiliation: "", formerAffiliation: "L'ordre" },
  "king-lizard": { affiliation: "Ligue Lézard", formerAffiliation: "" },
  "machine-head": { affiliation: "L'ordre", formerAffiliation: "" },
  "tether-tyrant": { affiliation: "L'ordre", formerAffiliation: "" },
  "the-elephant": { affiliation: "", formerAffiliation: "" },
  "ka-hor": { affiliation: "", formerAffiliation: "" },
  "mister-liu": { affiliation: "L'ordre", formerAffiliation: "" },
  shapesmith: {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "",
  },
  "black-samson": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "",
  },
  "doc-seismic": { affiliation: "", formerAffiliation: "" },
  "monster-girl": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "Teen Team",
  },
  "multi-paul": { affiliation: "L'ordre", formerAffiliation: "" },
  "shrinking-rae": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "Teen Team",
  },
  "allen-l-extraterrestre": {
    affiliation: "Coalition des Planètes",
    formerAffiliation: "",
  },
  "atom-eve": { affiliation: "", formerAffiliation: "Teen Team" },
  "cecil-stedman": {
    affiliation: "Agence de Défence Globale (A.D.G.)",
    formerAffiliation: "",
  },
  "damien-darkblood": {
    affiliation: "Clan Darkblood",
    formerAffiliation: "Agence de Défence Globale (A.D.G.)",
  },
  "donald-ferguson": {
    affiliation: "Agence de Défence Globale (A.D.G.)",
    formerAffiliation: "",
  },
  "dupli-kate": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "Teen Team",
  },
};

const slice = data.characters.slice(40, 60);
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
