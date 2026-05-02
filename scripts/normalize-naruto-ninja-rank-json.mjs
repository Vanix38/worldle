import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ninjaRankLastOnly } from "./naruto-ninja-rank-last.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fp = path.join(__dirname, "..", "data", "naruto.json");

const j = JSON.parse(fs.readFileSync(fp, "utf8"));
let n = 0;
for (const c of j.characters) {
  if (c.ninjaRank === undefined || c.ninjaRank === "") continue;
  const next = ninjaRankLastOnly(String(c.ninjaRank));
  if (next !== c.ninjaRank) n++;
  c.ninjaRank = next;
}
for (const c of j.characters) {
  const cls = String(c.classification ?? "").trim();
  const sp = String(c.species ?? "").trim();
  const nr = String(c.ninjaRank ?? "").trim();
  c.indice1 = cls || sp || nr || "—";
}
fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n");
console.log("ninjaRank:", n, "/", j.characters.length, "| indice1 recalculé");
