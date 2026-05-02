import type { Character } from "@/types/game";

/**
 * Removes diacritics on e/E and a/A only (custom universe fonts often lack those glyphs).
 */
export function stripAccents(str: string): string {
  return str
    .replace(/\u00E6/g, "ae")
    .replace(/\u0153/g, "oe")
    .normalize("NFD")
    .replace(/([eEaA])(?:[\u0300-\u036f]+)/g, "$1")
    .normalize("NFC");
}

/** Première valeur affichable du champ `affiliation` (string ou premier élément d’un tableau). */
export function getFirstAffiliationSubtitle(character: Character): string | undefined {
  const raw = character.affiliation;
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const s = String(item).trim();
      if (s) return s;
    }
    return undefined;
  }
  const s = String(raw).trim();
  return s || undefined;
}
