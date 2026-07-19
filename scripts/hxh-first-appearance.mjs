/**
 * Fusion / extraction firstAppearance HxH — épisode anime 2011 uniquement.
 */

export function episodeLabel2011(n) {
  return `Épisode ${n}`;
}

/**
 * Extrait le n° d’épisode 2011 depuis une chaîne firstAppearance / animeDebut.
 * Priorité : mention « Officielle », sinon premier Episode/Épisode numérique.
 * Ignore films / OVA sans numéro d’épisode.
 */
export function extractEpisode2011(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const animeSeg = raw.match(/Anime\s*\(2011\)\s*:\s*(.+)$/i);
  const scope = animeSeg ? animeSeg[1] : raw;

  if (/Last Mission|Phantom Rouge|film/i.test(scope) && !/(?:Épisode|Episode)\s+\d+/i.test(scope)) {
    return null;
  }

  const official = scope.match(/(?:Épisode|Episode)\s+(\d+)[^/]*\(\s*Officielle/i);
  if (official) return parseInt(official[1], 10);

  const first = scope.match(/(?:Épisode|Episode)\s+(\d+)/i);
  if (first) return parseInt(first[1], 10);

  return null;
}

/** @deprecated Prefer extractEpisode2011 + episodeLabel2011 */
export function mergeFirstAppearance(manga, anime) {
  const ep = extractEpisode2011(anime) ?? extractEpisode2011(manga);
  return ep != null ? episodeLabel2011(ep) : "";
}

/** Segment manga depuis firstAppearance (souvent vide après nettoyage épisode-only). */
export function mangaSegmentFromFirstAppearance(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const tagged = raw.match(/Manga\s*:\s*([^·]+?)(?:\s*·|$)/i);
  if (tagged) return tagged[1].trim();
  if (/Chapitre\s+\d+/i.test(raw) && !/Anime\s*\(/i.test(raw) && !/(?:Épisode|Episode)\s+\d+/i.test(raw)) {
    return raw;
  }
  return "";
}

/** Segment anime / épisode depuis firstAppearance. */
export function animeSegmentFromFirstAppearance(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const ep = extractEpisode2011(raw);
  if (ep != null) return episodeLabel2011(ep);
  const tagged = raw.match(/Anime\s*\(2011\)\s*:\s*(.+)$/i);
  if (tagged) return tagged[1].trim();
  if (/(?:Épisode|Episode)\s+\d+/i.test(raw) && !/^Manga\s*:/i.test(raw)) return raw;
  return "";
}
