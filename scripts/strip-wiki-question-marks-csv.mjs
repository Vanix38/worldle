import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const text = fs.readFileSync(CSV, "utf8");
const out = text.replace(/\?/g, "");
fs.writeFileSync(CSV, out, "utf8");
const n = (text.match(/\?/g) ?? []).length;
console.log("Removed ? count:", n);
