/**
 * Apply Facile review adjustments + fix Gerd affiliation.
 * Usage: node scripts/apply-op-facile-review.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const UP = {
  sakazuki: "Très facile",
  "charlotte-katakuri": "Très facile",
  "rob-lucci": "Très facile",
  baggy: "Très facile",
};

const DOWN_MOYEN = new Set([
  "absalom",
  "hogback",
  "cabaji",
  "brannew",
  "momonga",
  "bastille",
  "hina",
  "tsuru",
  "fukaboshi",
  "otohime",
  "hack",
  "karoo",
  "charlotte-chiffon",
  "charlotte-praline",
  "charlotte-flampe",
  "buffalo",
  "baby-5",
  "atlas",
  "edison",
  "pythagoras",
  "shaka",
  "york",
  "ethanbaron-v-nusjuro",
  "shepherd-ju-peter",
  "topman-warcury",
  "marcus-mars",
  "gerd",
  "oimo",
  "kashii",
  "doll",
  "ginny",
  "emet",
  "little-oars-jr",
  "izou",
  "vista",
  "vergo",
  "spandam",
  "blueno",
  "kaku",
  "kalifa",
  "urouge",
  "conis",
  "gan-forr",
  "dalton",
  "gaimon",
]);

for (const rel of ["data/one-piece-anime.json", "data/one-piece-manga.json"]) {
  const file = path.join(ROOT, rel);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  let up = 0;
  let down = 0;

  for (const c of data.characters) {
    if (c.id === "gerd") {
      c.affiliation = "Les Pirates d'Expédition";
      c.sub_affiliation = ["Grand Fleet du Chapeau de Paille"];
      if (typeof c.hint1 === "string" && /chapeau de paille/i.test(c.hint1)) {
        c.hint1 = "Les Pirates d'Expédition";
      }
    }

    if (UP[c.id]) {
      c.difficulty = UP[c.id];
      up++;
    } else if (DOWN_MOYEN.has(c.id)) {
      c.difficulty = "Moyen";
      down++;
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  const gerd = data.characters.find((c) => c.id === "gerd");
  console.log(
    `${path.basename(file)}: ↑${up} ↓Moyen ${down} | gerd=${gerd?.affiliation} / ${gerd?.difficulty}`,
  );
}
