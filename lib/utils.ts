import type { Character } from "@/types/game";

/**
 * Retire les diacritiques (FR : û ô é è à ç, etc.) + æ/œ → ae/oe.
 * Custom fonts : affichage sans accents ; recherche / filtre insensible aux variantes.
 */
export function stripAccents(str: string): string {
  return str
    .replace(/\u00E6/gi, "ae")
    .replace(/\u0153/gi, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
