/**
 * Résout First wiki → libellé FR (order) + année (hint2).
 * Utilise fieldMapping.firstAppearance.order + orderLabelEquivalence.
 */

function stripParentheses(value) {
  return String(value ?? "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

/** Garde (Saison N) pour distinguer film « Daredevil » vs série. */
function stripNonSeasonParens(value) {
  return String(value ?? "")
    .replace(/\s*\((?!Saison\s*\d+)[^)]*\)/gi, "")
    .trim();
}

export function normKey(s) {
  return String(stripParentheses(s) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Clé de matching titres d’œuvres (préserve Saison N). */
export function appearanceKey(s) {
  return String(stripNonSeasonParens(s) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Clé souple : ignore articles / prépositions EN+FR (The First Avenger ↔ First Avenger). */
export function looseKey(s) {
  return appearanceKey(s).replace(/(the|and|of|a|an|le|la|les|l|de|du|des|et|un|une)/g, "");
}

/**
 * Nettoie le champ First wiki vers un titre comparable à order[].
 * Ex. "What If...? (animated series) Season 1 7" → "What If...? (Saison 1)"
 * Ex. "Fantastic Four: First Steps Vol 1 1" → "Fantastic Four: First Steps"
 */
export function cleanWikiFirstAppearance(raw) {
  let t = String(raw ?? "")
    .replace(/<ref[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{m\|[^|}]+\|([^}]+)\}\}/gi, "$1")
    .replace(/\{\{r\|[^}]+\}\}/gi, "")
    .replace(/\{\{cite[^}]*\}\}/gi, "")
    .replace(/'''|''/g, "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\*+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!t || /^(mentioned|named|,)$/i.test(t.replace(/[()]/g, "").trim())) return "";

  // Tie-in comics / one-shots : garder le titre film si préfixe Vol
  t = t.replace(/\s+Vol\.?\s*\d+(?:\s+\d+)?(?:\s*[-–:].*)?\s*$/i, "");
  t = t.replace(/\s*:\s*The Movie\s*$/i, "");
  t = t.replace(
    /\s*\((?:film|\d{4}\s*film|TV series|animated series|web series|novel|series|comic|miniseries)\)\s*/gi,
    " ",
  );
  // Épisode → saison seule (order stocke la saison, pas l’épisode)
  t = t.replace(/\bSeason\s+(\d+)\s+\d+\b/gi, "§SAISON$1§");
  t = t.replace(/\bSeason\s+(\d+)\b/gi, "§SAISON$1§");
  t = t.replace(/\bSaison\s+(\d+)\s+\d+\b/gi, "§SAISON$1§");
  t = t.replace(/\(\s*Saison\s+(\d+)\s*\)/gi, "§SAISON$1§");
  t = t.replace(/\bSaison\s+(\d+)\b/gi, "§SAISON$1§");
  t = t.replace(/§SAISON(\d+)§/g, "(Saison $1)");
  t = t.replace(/^Marvel[\u2019']?s\s+/i, "");
  t = t.replace(/\s*\(film\)\s*$/i, "");
  t = t.replace(/\s*\(TV series\)\s*$/i, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

/**
 * @param {{ order?: Record<string, string[]>, orderLabelEquivalence?: [string, string][] }} fieldMapping
 */
export function buildAppearanceResolver(fieldMapping = {}) {
  const orderByYear = fieldMapping.order || {};
  const pairs = fieldMapping.orderLabelEquivalence || [];

  /** @type {Map<string, { label: string, year: string }>} */
  const byNorm = new Map();
  /** @type {Map<string, { label: string, year: string }>} */
  const byLoose = new Map();
  /** @type {Map<string, string>} */
  const aliasToCanonical = new Map();

  function remember(keyMap, key, hit) {
    if (!key) return;
    if (!keyMap.has(key)) keyMap.set(key, hit);
  }

  function titleBase(title) {
    return String(title || "")
      .replace(/\s*\(\s*Saison\s+\d+\s*\)\s*$/i, "")
      .trim();
  }

  /** @type {{ label: string, year: string }[]} */
  const allHits = [];

  for (const [year, titles] of Object.entries(orderByYear)) {
    for (const title of titles || []) {
      const hit = { label: title, year: String(year) };
      allHits.push(hit);
      remember(byNorm, appearanceKey(title), hit);
      remember(byLoose, looseKey(title), hit);
      aliasToCanonical.set(appearanceKey(title), title);
      if (!/\(\s*Saison\s+\d+\s*\)/i.test(title)) {
        aliasToCanonical.set(normKey(title), title);
      }
    }
  }

  function hitsForBaseLabel(label) {
    const base = titleBase(label);
    const baseAk = appearanceKey(base);
    const baseLk = looseKey(base);
    return allHits.filter((h) => {
      const hb = titleBase(h.label);
      return appearanceKey(hb) === baseAk || looseKey(hb) === baseLk || appearanceKey(h.label) === appearanceKey(label);
    });
  }

  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const [a, b] = pair;
    const hitsA = hitsForBaseLabel(a);
    const hitsB = hitsForBaseLabel(b);
    const orderHits = hitsA.length ? hitsA : hitsB;
    if (!orderHits.length) continue;

    const frenchBase = titleBase(orderHits[0].label);
    // Bases EN ↔ FR (même sans entrée « film » nue)
    aliasToCanonical.set(normKey(a), frenchBase);
    aliasToCanonical.set(normKey(b), frenchBase);
    aliasToCanonical.set(normKey(frenchBase), frenchBase);

    for (const hit of orderHits) {
      byNorm.set(appearanceKey(hit.label), hit);
      byLoose.set(looseKey(hit.label), hit);
      // Variantes EN de chaque saison / titre
      const seasonM = hit.label.match(/\(\s*Saison\s+(\d+)\s*\)$/i);
      if (seasonM) {
        const n = seasonM[1];
        for (const alias of [a, b]) {
          const aliasSeason = `${titleBase(alias)} (Saison ${n})`;
          byNorm.set(appearanceKey(aliasSeason), hit);
          byLoose.set(looseKey(aliasSeason), hit);
        }
      } else {
        byNorm.set(appearanceKey(a), hit);
        byNorm.set(appearanceKey(b), hit);
        byLoose.set(looseKey(a), hit);
        byLoose.set(looseKey(b), hit);
      }
    }
  }

  function lookupRaw(title) {
    if (!title) return null;
    return byNorm.get(appearanceKey(title)) || byLoose.get(looseKey(title)) || null;
  }

  /**
   * @param {string} rawFirst
   * @returns {{ label: string, year: string, cleaned: string }}
   */
  function resolve(rawFirst) {
    const cleaned = cleanWikiFirstAppearance(rawFirst);
    if (!cleaned) return { label: "", year: "", cleaned: "" };

    let hit = lookupRaw(cleaned);
    if (hit) return { label: hit.label, year: hit.year, cleaned };

    const seasonMatch = cleaned.match(/^(.*?)\s*\(\s*Saison\s+(\d+)\s*\)\s*$/i);
    if (seasonMatch) {
      const base = seasonMatch[1].trim();
      const season = seasonMatch[2];
      const frenchBase = aliasToCanonical.get(normKey(base)) || lookupRaw(base)?.label || "";
      if (frenchBase) {
        hit = lookupRaw(`${frenchBase} (Saison ${season})`);
        if (hit) return { label: hit.label, year: hit.year, cleaned };
      }
    }

    return { label: cleaned, year: "", cleaned };
  }

  return { resolve, orderByYear };
}
