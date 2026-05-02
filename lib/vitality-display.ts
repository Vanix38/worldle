/**
 * Détection des libellés « vivant / mort / inconnu » pour affichage par icônes (tableau de jeu).
 * Correspondance sur la chaîne entière normalisée (accents retirés, casse ignorée).
 */

export type VitalityKind = "alive" | "dead" | "unknown";

function normalizeVitality(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ALIVE = new Set(
  [
    "en vie",
    "envie", // saisie sans espace
    "alive",
    "vivant",
    "vivante",
    "vivants",
    "vivantes",
    "living",
    "au monde",
    "en detention",
    "vivant(e)",
    "presumed alive",
  ].map(normalizeVitality),
);

const DEAD = new Set(
  [
    "decede",
    "decedee",
    "mort",
    "morte",
    "morts",
    "mortes",
    "dead",
    "deceased",
    "defunt",
    "defunte",
    "defunts",
    "disparu",
    "disparue",
    "disparus",
    "disparues",
    "tue",
    "tuee",
    "tues",
    "tuees",
    "killed",
    "fallen",
  ].map(normalizeVitality),
);

/** Statuts non vivant/mort mais à afficher avec « ? ». (Pas « — » / « - » : placeholders cellule vide dans la grille.) */
const UNKNOWN = new Set(
  [
    "inconnu",
    "inconnue",
    "inconnus",
    "inconnues",
    "unknown",
    "indetermine",
    "indeterminee",
    "non renseigne",
    "non renseignee",
    "non renseignes",
    "n/a",
    "na",
    "?",
    "undetermined",
    "incapacite",
  ].map(normalizeVitality),
);

/** Retourne la catégorie si la valeur est un libellé vitalité connu, sinon null (afficher le texte brut). */
export function classifyVitalityValue(raw: string | number): VitalityKind | null {
  const s = normalizeVitality(String(raw ?? ""));
  if (!s) return null;
  if (ALIVE.has(s)) return "alive";
  if (DEAD.has(s)) return "dead";
  if (UNKNOWN.has(s)) return "unknown";
  return null;
}

function isStatusFieldKey(fieldKey: string): boolean {
  const k = fieldKey.trim().toLowerCase();
  return k === "status" || k === "statut";
}

/**
 * Décide si la cellule affiche une icône vitalité :
 * correspondance explicite, ou champ statut avec valeur non vide non classée → « inconnu ».
 */
export function resolveVitalityDisplay(
  raw: string | number,
  fieldKey: string,
): VitalityKind | null {
  const direct = classifyVitalityValue(raw);
  if (direct !== null) return direct;

  if (!isStatusFieldKey(fieldKey)) return null;
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return "unknown";
}
