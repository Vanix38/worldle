/**
 * Révision de la difficulté One Piece (2026-11-25, validée par Vanix) :
 * applique scripts/one-piece-difficulty-review.json (id → difficulté) à
 * sources/one-piece.json. Lancer ensuite `npm run one-piece:build`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "sources", "one-piece.json");
const src = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const review = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "one-piece-difficulty-review.json"), "utf8"));
let n = 0;
for (const c of src.characters) if (review[c.id] && c.difficulty !== review[c.id]) { c.difficulty = review[c.id]; n++; }
fs.writeFileSync(SOURCE, JSON.stringify(src, null, 2) + "\n");
console.log(`${n} difficultés modifiées.`);
