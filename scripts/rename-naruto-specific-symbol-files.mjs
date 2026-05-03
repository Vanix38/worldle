/**
 * Renomme les fichiers dans public/universes/naruto/specific-symbols/ :
 * - supprime « _Symbole »
 * - supprime le préfixe « Chapeau_ »
 * - remplace _ par espace
 * - minuscules
 * - sans accents
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "public", "universes", "naruto", "specific-symbols");

function stripAccents(s) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

function cleanStem(rawName) {
  const ext = path.extname(rawName);
  let base = path.basename(rawName, ext);
  base = base.replace(/_Symbole/gi, "");
  base = base.replace(/^Chapeau_/i, "");
  base = base.replace(/_/g, " ");
  base = stripAccents(base.trim()).toLowerCase();
  base = base.replace(/\s+/g, " ").trim();
  return base + ext.toLowerCase();
}

const EXTS = new Set([".svg", ".png", ".webp", ".gif", ".jpg", ".jpeg"]);
const files = fs
  .readdirSync(DIR)
  .filter((f) => !f.startsWith(".") && f.toLowerCase() !== "manifest.json" && EXTS.has(path.extname(f).toLowerCase()));

const mapping = [];
for (const f of files) {
  const neu = cleanStem(f);
  if (neu !== f) mapping.push({ old: f, neu });
}

const byNew = new Map();
for (const m of mapping) {
  if (!byNew.has(m.neu)) byNew.set(m.neu, []);
  byNew.get(m.neu).push(m.old);
}

for (const [neu, olds] of byNew) {
  if (olds.length > 1) {
    console.warn("Collision ->", neu, "sources:", olds.join(", "));
    continue;
  }
  const old = olds[0];
  const from = path.join(DIR, old);
  const to = path.join(DIR, neu);
  if (old === neu) continue;

  if (fs.existsSync(to)) {
    if (path.resolve(from) === path.resolve(to)) continue;
    /** Casse Windows uniquement */
    if (old.toLowerCase() === neu.toLowerCase()) {
      const tmp = path.join(
        DIR,
        `.__tmp_rename_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(old)}`,
      );
      fs.renameSync(from, tmp);
      fs.renameSync(tmp, to);
      console.log(old, "->", neu);
      continue;
    }
    console.warn("SKIP existe déjà:", neu, "(gardé:", old, ")");
    continue;
  }
  fs.renameSync(from, to);
  console.log(old, "->", neu);
}
