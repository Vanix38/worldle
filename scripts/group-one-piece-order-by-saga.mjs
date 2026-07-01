/**
 * Regroupe arc.order et firstAppearance.order par saga dans one-piece-anime.json.
 * Usage: node scripts/group-one-piece-order-by-saga.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SAGAS_PATH,
  buildGroupedOrder,
  getArcEpisodes,
  toEpisodeOnly,
} from "./one-piece-episode-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(__dirname, "..", "data", "one-piece-anime.json");

function groupArcListBySaga(flatArcs, sagas) {
  const order = {};
  const used = new Set();
  for (const [saga, arcs] of Object.entries(sagas)) {
    const list = arcs.filter((a) => flatArcs.includes(a));
    if (list.length > 0) {
      order[saga] = list;
      list.forEach((a) => used.add(a));
    }
  }
  const missing = flatArcs.filter((a) => !used.has(a));
  if (missing.length) {
    throw new Error(`Arcs sans saga: ${missing.join(", ")}`);
  }
  return order;
}

function flattenArcOrderFromGrouped(grouped) {
  const flat = [];
  for (const val of Object.values(grouped)) {
    if (Array.isArray(val)) flat.push(...val);
    else flat.push(...flattenArcOrderFromGrouped(val));
  }
  return flat;
}

const sagas = JSON.parse(fs.readFileSync(SAGAS_PATH, "utf8"));
const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const arcEpisodes = await getArcEpisodes();

const arcOrderRaw = data.fieldMapping.arc.order;
let flatArcs;
if (Array.isArray(arcOrderRaw)) {
  flatArcs = [...arcOrderRaw];
} else {
  flatArcs = flattenArcOrderFromGrouped(arcOrderRaw);
}

for (const char of data.characters) {
  if (char.firstAppearance) {
    char.firstAppearance = toEpisodeOnly(char.firstAppearance) || char.firstAppearance;
  }
}

data.fieldMapping.arc.order = groupArcListBySaga(flatArcs, sagas);
data.fieldMapping.firstAppearance.order = buildGroupedOrder(data.characters, sagas, arcEpisodes);
data.fieldMapping.firstAppearance.header = "Épisode";
data.fieldMapping.firstAppearance.description =
  "Premier épisode anime de première apparition. La sélection anti-spoiler se fait par saga, arc ou épisode.";

fs.writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`OK — ${Object.keys(sagas).length} sagas, ${flatArcs.length} arcs`);
