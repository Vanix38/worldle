import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

const CIVILIAN_OCCUPATIONS = new Set([
  "Étudiant",
  "Employé du Burger Mart",
  "Employé dans un magasin de meubles",
  "Bénévole en soupe populaire",
  "Tailleur",
  "Mère adoptive d'Atom Eve",
  "Père adoptif d'Atom Eve",
  "Partenaire de Tech Jacket",
  "Nounou spécialisée",
  "Écrivain",
  "Photographe",
  "Homme d'affaires",
]);

function isCivilianOccupation(part) {
  const p = part.trim();
  if (!p) return false;
  if (CIVILIAN_OCCUPATIONS.has(p)) return true;
  if (/^Femme d.affaires$/u.test(p)) return true;
  return false;
}

function normalizePart(part) {
  return isCivilianOccupation(part) ? "Civil" : part.trim();
}

function normalizeField(value) {
  const parts = (value || "")
    .split(",")
    .map(normalizePart)
    .filter(Boolean);

  return [...new Set(parts)].join(", ");
}

const CIVILIAN_AGENT_IDS = new Set(["paul", "debbie-grayson"]);

for (const c of data.characters) {
  if (CIVILIAN_AGENT_IDS.has(c.id) && c.occupation === "Agent") {
    c.occupation = "Civil";
  }
  c.occupation = normalizeField(c.occupation);
  c.indice2 = normalizeField(c.indice2);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Civilian occupations normalized.");
