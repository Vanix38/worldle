import { readFileSync, writeFileSync } from "fs";

const path = "d:/worlddle/data/invincible.json";
const data = JSON.parse(readFileSync(path, "utf8"));

function normalizePart(part) {
  let p = part.trim();
  if (!p) return "";

  // Priorité haute (déjà appliquée)
  if (/^Super-vilain(?:e|s)$/i.test(p)) return "Super-vilain";
  if (/^Étudiant(?:e)? à l.Université Upstate$/i.test(p)) return "Étudiant";
  if (/^Directeur de l.Agence/i.test(p)) return "Directeur";
  if (
    /^Agent de la G\.D\.A\.$/i.test(p) ||
    /^Agent de l.Agence de d[eé]fense mondiale$/i.test(p) ||
    /^Membre de l.Agence de d[eé]fense mondiale$/i.test(p) ||
    /^Second de l.Agence de d[eé]fense mondiale$/i.test(p) ||
    /^Garde d'enfants G\.D\.A\.$/i.test(p)
  ) {
    return "Agent";
  }
  if (/^Général(?:e)? militaire$/i.test(p)) return "Général";

  // Élève → Étudiant
  if (/^Élève\b/i.test(p)) return "Étudiant";

  // Membre des Gardiens du Globe → Gardien du Globe
  if (/^Membre des Gardiens du Globe/i.test(p)) return "Gardien du Globe";

  // Chef XXX → Chef
  if (/^Chef(?:fe)? .+/i.test(p)) return "Chef";

  // Souverain / Roi / Empereur / etc.
  if (
    /^(?:Ancienne )?Souverain(?:e)?(?:s)? .+/i.test(p) ||
    /^Roi(?:ne)? .+/i.test(p) ||
    /^Empereur .+/i.test(p) ||
    /^Impératrice .+/i.test(p) ||
    /^Prince .+/i.test(p) ||
    /^Grand régent .+/i.test(p) ||
    /^Régent(?:e)? .+/i.test(p) ||
    /^Reine guerrière$/i.test(p)
  ) {
    return "Souverain";
  }

  // Agent XXX → Agent
  if (/^Agente? .+/i.test(p)) return "Agent";

  // Homme de main XXX → Homme de main
  if (/^Homme de main .+/i.test(p)) return "Homme de main";

  // Lieutenant XXX → Lieutenant
  if (/^Lieutenant .+/i.test(p)) return "Lieutenant";

  // Guerrier XXX → Guerrier
  if (/^Guerri(?:er|ère) .+/i.test(p)) return "Guerrier";

  // Chercheur XXX → Chercheur
  if (/^Chercheur .+/i.test(p)) return "Chercheur";

  // Soldat XXX → Soldat
  if (/^Soldat(?:e)? .+/i.test(p)) return "Soldat";

  return p;
}

function normalizeField(value) {
  const parts = (value || "")
    .split(",")
    .map(normalizePart)
    .filter(Boolean);

  return [...new Set(parts)].join(", ");
}

for (const c of data.characters) {
  c.occupation = normalizeField(c.occupation);
  c.indice2 = normalizeField(c.indice2);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Occupations normalized.");
