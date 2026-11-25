/**
 * Remplit le champ `arc` des persos One Piece à partir de `firstAppearance`
 * (Chapitre N pour le manga, Épisode N pour l'anime), en se basant sur
 * fieldMapping.firstAppearance.order de chaque fichier.
 *
 * Le champ arc = « arc narratif de la première apparition » : on le remplace
 * quand il vaut « Inconnu », quand il n'est pas un arc de fieldMapping.arc.order
 * (ex. « Arabasta », « Début, Marineford ») ou quand il contredit le chapitre /
 * l'épisode de première apparition.
 *
 * Usage: node scripts/apply-one-piece-arc-from-first-appearance.mjs [--dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FILES = ["one-piece-manga", "one-piece-anime"];
const dryRun = process.argv.includes("--dry-run");

for (const name of FILES) {
  const file = path.join(ROOT, "data", `${name}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const fm = data.fieldMapping;

  /** "Chapitre 12" / "Épisode 12" -> arc */
  const segmentToArc = new Map();
  for (const arcs of Object.values(fm.firstAppearance.order)) {
    for (const [arc, segments] of Object.entries(arcs)) {
      for (const s of segments) segmentToArc.set(s, arc);
    }
  }
  const validArcs = new Set(Object.values(fm.arc.order).flat());

  let changed = 0;
  const unresolved = [];
  for (const c of data.characters) {
    const expected = segmentToArc.get(c.firstAppearance);
    if (!expected || !validArcs.has(expected)) {
      if (!c.arc || c.arc === "Inconnu" || !validArcs.has(c.arc)) {
        unresolved.push(`${c.id} (${c.firstAppearance ?? "?"})`);
      }
      continue;
    }
    if (c.arc !== expected) {
      console.log(`[${name}] ${c.id}: ${JSON.stringify(c.arc)} -> ${expected}`);
      c.arc = expected;
      changed++;
    }
  }
  console.log(`[${name}] ${changed} arc(s) modifié(s)`);
  if (unresolved.length) console.log(`[${name}] non résolus: ${unresolved.join(", ")}`);
  if (!dryRun && changed) fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
