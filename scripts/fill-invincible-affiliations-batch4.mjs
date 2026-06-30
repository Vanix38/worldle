import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const AFF = {
  "flaxan-leader": { affiliation: "Flaxans", formerAffiliation: "" },
  "rex-splode": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "Teen Team",
  },
  robot: {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "Teen Team",
  },
  "amber-bennett": { affiliation: "", formerAffiliation: "" },
  aquarus: { affiliation: "Gardiens du Globe", formerAffiliation: "" },
  "art-rosenbaum": { affiliation: "", formerAffiliation: "" },
  darkwing: { affiliation: "Gardiens du Globe", formerAffiliation: "" },
  "debbie-grayson": { affiliation: "", formerAffiliation: "" },
  "green-ghost-ii": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "",
  },
  "l-immortel": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "",
  },
  invincible: {
    affiliation: "Agence de Défence Globale (A.D.G.)",
    formerAffiliation: "",
  },
  killcannon: { affiliation: "", formerAffiliation: "" },
  kursk: { affiliation: "L'ordre", formerAffiliation: "" },
  "martian-man": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "",
  },
  "jumeaux-mauler": { affiliation: "", formerAffiliation: "" },
  olga: { affiliation: "", formerAffiliation: "" },
  "omni-man": {
    affiliation: "Coalition des Planètes",
    formerAffiliation:
      "Agence de Défence Globale (A.D.G.), Empire Viltrumite",
  },
  "red-rush": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "",
  },
  titan: { affiliation: "", formerAffiliation: "L'ordre" },
  "war-woman": {
    affiliation: "Gardiens du Globe",
    formerAffiliation: "",
  },
};

const slice = data.characters.slice(60, 80);
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
