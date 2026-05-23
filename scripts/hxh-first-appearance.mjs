/**
 * Fusion manga debut + anime debut (2011) → firstAppearance.
 */

export function mergeFirstAppearance(manga, anime) {
  const m = String(manga || "").trim();
  const a = String(anime || "").trim();
  if (!m && !a) return "";
  if (m && a) return `Manga : ${m} · Anime (2011) : ${a}`;
  if (m) return `Manga : ${m}`;
  return `Anime (2011) : ${a}`;
}

/** Segment manga depuis firstAppearance ou chaîne brute « Chapitre N ». */
export function mangaSegmentFromFirstAppearance(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const tagged = raw.match(/Manga\s*:\s*([^·]+?)(?:\s*·|$)/i);
  if (tagged) return tagged[1].trim();
  if (/Chapitre\s+\d+/i.test(raw) && !/Anime\s*\(/i.test(raw)) return raw;
  return "";
}

/** Segment anime depuis firstAppearance ou chaîne brute « Episode N ». */
export function animeSegmentFromFirstAppearance(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const tagged = raw.match(/Anime\s*\(2011\)\s*:\s*(.+)$/i);
  if (tagged) return tagged[1].trim();
  if (/(?:Épisode|Episode)\s+\d+/i.test(raw) && !/^Manga\s*:/i.test(raw)) return raw;
  return "";
}
