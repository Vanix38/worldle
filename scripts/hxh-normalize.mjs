/**
 * Normalisation genre / statut / type Nen / champs wiki corrompus (HxH).
 */

export const NEN_TYPES = [
  "Renforcement",
  "Transformation",
  "Matérialisation",
  "Émission",
  "Manipulation",
  "Spécialisation",
  "Inconnu",
];

export function normalizeGenderDisplay(raw) {
  const s = stripInfoboxLeak(String(raw || "").trim());
  if (!s) return s;
  if (/^=+/.test(s)) return "Homme";
  if (/\bvariable\b/i.test(s) || /masculin\s+et\s+féminin|masculin\s+et\s+feminin/i.test(s)) {
    return "Variable";
  }
  if (/fourmi|chimère|chimere/i.test(s)) return "Inconnu";
  if (/pas\s+défini|pas\s+defini|indétermin|indetermin/i.test(s)) return "Inconnu";
  if (/\bgarçon\b|\bgarcon\b/i.test(s)) return "Homme";
  const female = /\b(femme|femelle|féminin|feminin)\b/i.test(s);
  const male = /\b(homme|mâle|male|masculin)\b/i.test(s);
  if (female && !male) return "Femme";
  if (male && !female) return "Homme";
  if (female && male) {
    const fi = s.search(/\b(femme|femelle|féminin|feminin)\b/i);
    const mi = s.search(/\b(homme|mâle|male|masculin)\b/i);
    return fi >= 0 && (mi < 0 || fi < mi) ? "Femme" : "Homme";
  }
  return "Inconnu";
}

export function normalizeHxhStatus(raw) {
  const s = stripInfoboxLeak(String(raw || "").trim());
  if (!s) return s;
  const ascii = s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (/\bdece?d/.test(ascii) || /\bmort/.test(ascii) || /\bdisparu/.test(ascii) || /\btue\b/.test(ascii)) {
    return "Mort";
  }
  if (
    /\b(vivant|alive|vivante|vivants|vivantes)\b/.test(ascii) ||
    /\ben vie\b/.test(ascii) ||
    /\breincarn/.test(ascii)
  ) {
    return "Vivant";
  }
  if (/\barrete/.test(ascii) || /\bchien de garde\b/.test(ascii)) {
    return "Vivant";
  }
  if (/\b(inconnu|indetermine|kimera)\b/.test(ascii)) {
    return "Inconnu";
  }
  return "Inconnu";
}

/** Extrait le type Nen depuis texte wiki brut. */
export function normalizeNenType(raw) {
  let s = stripInfoboxLeak(String(raw || "").trim());
  if (!s || s === "[[]]") return "";

  const bracketLink = s.match(/\[[^\]]*#\s*([^\]]+)\]/);
  if (bracketLink) s = bracketLink[1].trim();
  const plainBracket = s.match(/\[\s*([^\]]+)\s*\]/);
  if (plainBracket && !/^https?:/i.test(plainBracket[1])) s = plainBracket[1].trim();

  s = s.replace(/\[https?:[^\]]+\]/gi, " ").trim();
  s = s.split("[")[0].trim();

  const canon = matchNenType(s);
  if (canon) return canon;
  if (/inconnu/i.test(s)) return "Inconnu";
  return "";
}

function matchNenType(s) {
  const n = s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (/\brenforcement\b/.test(n)) return "Renforcement";
  if (/\btransformation\b/.test(n)) return "Transformation";
  if (/\bmaterialisation\b/.test(n)) return "Matérialisation";
  if (/\bemission\b/.test(n)) return "Émission";
  if (/\bmanipulation\b/.test(n)) return "Manipulation";
  if (/\bspecialisation\b/.test(n)) return "Spécialisation";
  return null;
}

/** Retire fuites d’autres clés infobox (`|cheveux = …`, `|numero = …`). */
export function stripInfoboxLeak(s) {
  if (!s || !s.includes("|")) return s;
  const pipe = s.indexOf("|");
  const tail = s.slice(pipe + 1).trim();
  if (/^[a-zàâäéèêëïîôùûüœæç\s]+=/i.test(tail)) {
    return s.slice(0, pipe).trim();
  }
  return s;
}

export function cleanWikiFieldValue(raw) {
  return stripInfoboxLeak(String(raw || "").trim());
}

/** Nettoie un lien wiki dans indice2 / capacités. */
export function cleanIndiceWikiText(raw) {
  let s = String(raw || "").trim();
  if (!s) return s;
  const hash = s.match(/#\s*([^?\]]+?)(?:\s*\]|$)/);
  if (hash) return hash[1].trim();
  const m = s.match(/\[\s*([^\]]+)\s*\]/);
  if (m && !/^https?:/i.test(m[1])) return m[1].trim();
  if (/^https?:\/\//i.test(s)) return "";
  return cleanWikiFieldValue(s);
}

export function normalizeFirstAppearance(raw) {
  let s = String(raw || "").trim();
  if (!s) return s;
  s = s.replace(/Épisode/gi, "Episode");
  s = s.replace(/Episode\s+(\d+)\s*\(\s*2011\s*\)/gi, "Episode $1 (2011)");
  s = s.replace(/Episode\s+(\d+)\(2011\)/gi, "Episode $1 (2011)");
  return s;
}
