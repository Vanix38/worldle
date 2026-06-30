import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const { formerOccupations, enemies, ...restMapping } = data.fieldMapping;

data.fieldMapping = {
  ...restMapping,
  indice1: {
    header: "Indice 1",
    fonction: "Indice",
    hint: {
      prompt: "Ennemis",
      icon: "FaSkull",
    },
    description:
      "Ennemis listés sur la fiche wiki. Débloqué après plusieurs tentatives.",
  },
  indice2: {
    header: "Indice 2",
    fonction: "Indice",
    hint: {
      prompt: "Anciennes occupations",
      icon: "FaBriefcase",
    },
    description:
      "Anciennes occupations connues du personnage. Débloqué après plusieurs tentatives.",
  },
};

for (const c of data.characters) {
  c.indice1 = c.enemies ?? "";
  c.indice2 = c.formerOccupations ?? "";
  delete c.enemies;
  delete c.formerOccupations;
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Migrated ${data.characters.length} characters`);
