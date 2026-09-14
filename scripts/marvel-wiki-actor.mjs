/**
 * Extraction d’acteur / voice actor depuis wikitext Marvel Database (+ fallback MCU wiki).
 */

const MARVEL_API = "https://marvel.fandom.com/api.php";
const MCU_API = "https://marvelcinematicuniverse.fandom.com/api.php";
const UA = "worlddle-marvel-actor/1.0";

export async function apiGet(api, params) {
  const u = new URL(api);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

export async function fetchWikitext(api, title) {
  const data = await apiGet(api, {
    action: "parse",
    format: "json",
    page: title,
    prop: "wikitext",
    redirects: "1",
  });
  if (data.error) return { error: data.error.info || "parse error", wikitext: "", resolvedTitle: title };
  return {
    error: null,
    wikitext: data.parse?.wikitext?.["*"] || "",
    resolvedTitle: data.parse?.title || title,
  };
}

function cleanActorName(name) {
  let n = String(name || "")
    .replace(/_/g, " ")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/^wikipedia:/i, "")
    .replace(/\s+/g, " ")
    .trim();
  // Drop parenthetical role notes
  n = n.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  if (!n) return "";
  if (/Earth-\d|Symbiote|Category:|https?:|Template:|\.jpg|\.png/i.test(n)) return "";
  if (n.length < 2 || n.length > 70) return "";
  if (/^\d+$/.test(n)) return "";
  // Reject sentence fragments
  if (/^(the|a|an|this|that|who|which|and|or)\b/i.test(n)) return "";
  return n;
}

/**
 * Parse casting lines from raw wikitext / Notes / Trivia.
 */
export function extractActorFromText(text) {
  if (!text || !String(text).trim()) return "";

  const patterns = [
    // {{WP|Name}} or {{WP|page|Display}} portrayed/portrays/voices/provides the voice
    /\{\{WP\|([^}|]+)(?:\|([^}]*))?\}\}[^\n]{0,80}(?:also\s+)?(?:portray(?:ed|s)|provides?\s+(?:the\s+)?voice|voices?\b|voiced\b)/gi,
    // [[Name]] or [[wikipedia:Name|Display]] portrayed/…
    /\[\[(?:wikipedia:)?([^\]|#\/]+)(?:\|([^\]]+))?\]\][^\n]{0,80}(?:also\s+)?(?:portray(?:ed|s)|provides?\s+(?:the\s+)?voice|voices?\b|voiced\b)/gi,
    // portrayed/voiced/played by {{WP|Name|Display?}}
    /(?:is\s+)?(?:portrayed|voiced|played)\s+by\s+(?:actor\s+)?\{\{WP\|([^}|]+)(?:\|([^}]*))?\}\}/gi,
    // portrayed/voiced/played by [[wikipedia:X|Y]] or [[X]]
    /(?:is\s+)?(?:portrayed|voiced|played)\s+by\s+(?:actor\s+)?\[\[(?:wikipedia:)?([^\]|#\/]+)(?:\|([^\]]+))?\]\]/gi,
    // portrayed/played by [https://imdb… Name]
    /(?:is\s+)?(?:portrayed|voiced|played)\s+by\s+(?:actor\s+)?\[[^\s\]]+\s+([^\]]+)\]/gi,
    // "played by actor Mark Stevens" / "played by First Last"
    /(?:was\s+)?played\s+by\s+(?:actor\s+)?([A-Z][a-zA-Z''\-]+(?:\s+[A-Z][a-zA-Z''\-]+)+)\b/g,
    // Bare "First Last portrays/voices …" (no WP/wikilink)
    /(?:^|\n|\*\s*)([A-Z][a-zA-Z''\-]+(?:\s+[A-Z][a-zA-Z''\-]+)+)\s+(?:also\s+)?(?:portray(?:ed|s)|voices)\b/g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      // Prefer display text after | when present (group 2)
      const raw = m[2] && m[2].trim() ? m[2] : m[1];
      const name = cleanActorName(raw);
      if (name) return name;
    }
  }
  return "";
}

/** First actor from MCU wiki |actor= / |voice actor= lines. */
export function extractActorFromMcuInfobox(wikitext) {
  if (!wikitext) return "";
  const lines = String(wikitext).match(/^\|\s*(?:voice\s*)?actor\s*=\s*(.+)$/gim) || [];
  for (const line of lines) {
    const val = line.replace(/^\|\s*(?:voice\s*)?actor\s*=\s*/i, "");
    // First [[link]] or [[wiki|label]]
    const link = val.match(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/);
    if (link) {
      const name = cleanActorName(link[1]);
      if (name) return name;
    }
    // Plain text before <br>
    const plain = cleanActorName(val.split(/<br\s*\/?>/i)[0]);
    if (plain && !/[{}]/.test(plain)) return plain;
  }
  return "";
}

/**
 * hint1 depuis Notes/Trivia, sinon tout le wikitext, sinon MCU wiki (si demandé).
 */
export async function resolveHint1({
  params = {},
  wikitext = "",
  wikiTitle = "",
  displayName = "",
  currentAlias = "",
  useMcuFallback = false,
  delayMs = 0,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const fromNotes = extractActorFromText([params.Notes, params.Trivia].filter(Boolean).join("\n"));
  if (fromNotes) return fromNotes;

  const fromPage = extractActorFromText(wikitext);
  if (fromPage) return fromPage;

  if (!useMcuFallback) return "";

  const base = String(wikiTitle || "")
    .replace(/\s*\(Earth-[^)]+\)\s*$/i, "")
    .trim();
  const candidates = [
    ...new Set(
      [base, displayName, currentAlias]
        .map((s) =>
          String(s || "")
            .replace(/\{\{WP\|([^}|]+)(?:\|[^}]*)?\}\}/g, "$1")
            .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
            .replace(/_/g, " ")
            .trim(),
        )
        .filter(Boolean),
    ),
  ];

  // Search MCU wiki if direct titles fail
  const searchSeeds = [...candidates];

  for (const page of candidates) {
    try {
      const { error, wikitext: mcuWt } = await fetchWikitext(MCU_API, page);
      if (delayMs) await sleep(delayMs);
      if (error || !mcuWt) continue;
      const actor = extractActorFromMcuInfobox(mcuWt);
      if (actor) return actor;
    } catch {
      // try next
    }
  }

  for (const seed of searchSeeds.slice(0, 2)) {
    try {
      const data = await apiGet(MCU_API, {
        action: "query",
        format: "json",
        list: "search",
        srsearch: seed,
        srlimit: "3",
      });
      if (delayMs) await sleep(delayMs);
      const hits = data.query?.search || [];
      for (const hit of hits) {
        const { error, wikitext: mcuWt } = await fetchWikitext(MCU_API, hit.title);
        if (delayMs) await sleep(delayMs);
        if (error || !mcuWt) continue;
        const actor = extractActorFromMcuInfobox(mcuWt);
        if (actor) return actor;
      }
    } catch {
      // ignore
    }
  }
  return "";
}

export function shouldUseMcuFallback(wikiEarth) {
  const e = String(wikiEarth || "");
  // MCU + What If + crossovers souvent présents sur le MCU wiki (actor / voice actor)
  return (
    e === "199999" ||
    e === "838" ||
    e === "828" ||
    e === "617" ||
    e === "21818" ||
    e === "72124" ||
    e === "82111" ||
    e === "86445" ||
    e === "91233" ||
    e === "TRN954" ||
    e === "10005" ||
    e === "688B" ||
    e === "96283" ||
    e === "120703" ||
    e === "1610B" ||
    e === "121698"
  );
}

export { MARVEL_API, MCU_API };
