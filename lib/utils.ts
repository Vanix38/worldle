/**
 * Removes diacritics/accents from a string for display with fonts that don't support them.
 */
export function stripAccents(str: string): string {
  return str
    .replace(/\u00E6/g, "ae")
    .replace(/\u0153/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");
}
