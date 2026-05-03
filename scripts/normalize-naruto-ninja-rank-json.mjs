import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ninjaRankLastOnly, canonicalNinjaRank } from "./naruto-ninja-rank-last.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const fp = path.join(ROOT, "data", "naruto.json");

const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "naruto-ninja-ranks-order.json"), "utf8"));

const j = JSON.parse(fs.readFileSync(fp, "utf8"));

j.fieldMapping.ninjaRank = {
  header: j.fieldMapping.ninjaRank?.header || "Rang ninja",
  fonction: "Comparaison",
  order: meta.order,
  orderLabelEquivalence: meta.orderLabelEquivalence,
  description:
    "Hiérarchie indicative (académie → Kage). ↑ = rang plus bas dans cette échelle ; ↓ = rang plus élevé. Réglages : data/naruto-ninja-ranks-order.json.",
};

let n = 0;
for (const c of j.characters) {
  if (c.ninjaRank === undefined || c.ninjaRank === "") continue;
  const next = canonicalNinjaRank(ninjaRankLastOnly(String(c.ninjaRank)));
  if (next !== c.ninjaRank) n++;
  c.ninjaRank = next;
}
fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n");
console.log("ninjaRank:", n, "/", j.characters.length);
