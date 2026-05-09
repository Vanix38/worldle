import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

function stripAccents(s) {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

const text = fs.readFileSync(CSV, "utf8");
const out = stripAccents(text);
fs.writeFileSync(CSV, out, "utf8");
console.log("Strip accents (NFD) | bytes in:", Buffer.byteLength(text, "utf8"), "| out:", Buffer.byteLength(out, "utf8"));
