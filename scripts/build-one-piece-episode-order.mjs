/**
 * Passe One Piece en épisodes uniquement + order complet par arc.
 * Usage: node scripts/build-one-piece-episode-order.mjs [--refresh-wiki]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SAGAS_PATH,
  buildGroupedOrder,
  getArcEpisodes,
  toEpisodeOnly,
  validateEpisodeOrder,
} from "./one-piece-episode-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(__dirname, "..", "data", "one-piece-anime.json");

const refreshWiki = process.argv.includes("--refresh-wiki");

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const sagas = JSON.parse(fs.readFileSync(SAGAS_PATH, "utf8"));
const arcEpisodes = await getArcEpisodes({ refresh: refreshWiki });

let migrated = 0;
let dropped = 0;
for (const char of data.characters) {
  if (!char.firstAppearance) continue;
  const ep = toEpisodeOnly(char.firstAppearance);
  if (ep) {
    char.firstAppearance = ep;
    migrated++;
  } else {
    delete char.firstAppearance;
    dropped++;
  }
}

data.fieldMapping.firstAppearance = {
  header: "Épisode",
  fonction: "Comparaison",
  order: buildGroupedOrder(data.characters, sagas, arcEpisodes),
  description:
    "Premier épisode anime de première apparition. La sélection anti-spoiler se fait par saga, arc ou épisode.",
};

const { flat, issues } = validateEpisodeOrder(data.fieldMapping.firstAppearance.order);
const withFa = data.characters.filter((c) => c.firstAppearance).length;
console.log(`Persos avec firstAppearance: ${withFa}/${data.characters.length}`);
console.log(`Épisodes dans order: ${flat.length} (${new Set(flat).size} uniques)`);
console.log(`Arcs couverts: ${Object.keys(arcEpisodes).length}`);
if (issues.length) {
  console.warn("Problèmes order:", issues.slice(0, 10).join("; "));
} else {
  console.log("Order OK — chronologique, sans doublon");
}

fs.writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log("Wrote", JSON_PATH);
