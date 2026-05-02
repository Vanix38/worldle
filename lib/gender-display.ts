/**
 * Détection homme / femme pour affichage par symboles ♂ / ♀ (react-icons FaMars / FaVenus).
 * Correspondance sur la chaîne entière normalisée.
 */

export type GenderKind = "male" | "female";

function normalize(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const MALE = new Set(
  [
    "homme",
    "man",
    "male",
    "masculin",
    "garcon",
    "boy",
    "m",
    "monsieur",
    "mr",
  ].map(normalize),
);

const FEMALE = new Set(
  [
    "femme",
    "woman",
    "female",
    "feminin",
    "fille",
    "girl",
    "f",
    "madame",
    "mme",
    "ms",
    "mrs",
  ].map(normalize),
);

export function classifyGenderValue(raw: string | number): GenderKind | null {
  const s = normalize(String(raw ?? ""));
  if (!s) return null;
  if (MALE.has(s)) return "male";
  if (FEMALE.has(s)) return "female";
  return null;
}

function isGenderFieldKey(fieldKey: string): boolean {
  const k = fieldKey.trim().toLowerCase();
  return k === "gender" || k === "genre" || k === "sexe";
}

/** Icône genre uniquement sur les champs genre, si la valeur correspond. */
export function resolveGenderDisplay(
  raw: string | number,
  fieldKey: string,
): GenderKind | null {
  if (!isGenderFieldKey(fieldKey)) return null;
  return classifyGenderValue(raw);
}
