import type {
  AttributeSchemaEntry,
  AttributeType,
  Character,
  FieldMappingEntry,
  HintTierDef,
  UniverseData,
} from "@/types/game";
import { flattenFieldOrder } from "@/lib/progress-order";

const RESERVED_KEYS = new Set(["id", "name", "imageUrl", "aliases"]);

function inferType(value: unknown): AttributeType {
  if (Array.isArray(value)) return "multivalue";
  if (typeof value === "number" && !Number.isNaN(value)) return "numeric";
  return "categorical";
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function schemaEntryFromFieldMapping(
  key: string,
  entry: FieldMappingEntry
): AttributeSchemaEntry | null {
  if (entry.fonction === "Recherche" || entry.fonction === "Indice") return null;
  let type: AttributeType = "categorical";
  let ordered = false;
  let order: string[] | undefined;
  switch (entry.fonction) {
    case "Classique":
      type = "categorical";
      break;
    case "Multivalue":
      type = "multivalue";
      break;
    case "Comparaison":
      type = "categorical";
      order = flattenFieldOrder(entry.order);
      ordered = order.length > 0;
      break;
    case "ComparaisonDate":
      type = "date";
      ordered = true;
      break;
    case "ComparaisonChiffre":
      type = "numeric";
      ordered = true;
      break;
    default:
      type = "categorical";
  }
  const pairs = entry.orderLabelEquivalence;
  return {
    key,
    label: entry.header,
    type,
    ordered,
    ...(order && order.length > 0 && { order }),
    ...(pairs && pairs.length > 0 && { orderLabelEquivalence: pairs }),
    ...(entry.columnWidth ? { columnWidth: entry.columnWidth } : {}),
  };
}

/**
 * Build schema from fieldMapping (only non-Recherche fields), or fallback to inference.
 */
export function getSchemaFromUniverseData(universeData: UniverseData): AttributeSchemaEntry[] {
  if (universeData.fieldMapping && Object.keys(universeData.fieldMapping).length > 0) {
    const entries: AttributeSchemaEntry[] = [];
    for (const [key, mappingEntry] of Object.entries(universeData.fieldMapping)) {
      const entry = schemaEntryFromFieldMapping(key, mappingEntry);
      if (entry) entries.push(entry);
    }
    if (entries.length > 0) return entries;
  }
  if (universeData.schema && universeData.schema.length > 0) {
    return universeData.schema;
  }
  const first = universeData.characters[0];
  if (!first) return [];
  const result: AttributeSchemaEntry[] = [];
  for (const key of Object.keys(first)) {
    if (RESERVED_KEYS.has(key)) continue;
    const value = first[key];
    const type = inferType(value);
    result.push({
      key,
      label: formatLabel(key),
      type,
      ordered: type === "numeric",
    });
  }
  return result;
}

/** Keys with fonction Recherche (used for search only). */
export function getSearchFieldKeys(universeData: UniverseData): string[] {
  if (!universeData.fieldMapping) return [];
  return Object.entries(universeData.fieldMapping)
    .filter(([, e]) => e.fonction === "Recherche" || e.includeInSearch)
    .map(([key]) => key);
}

/**
 * Hint tiers from every fieldMapping entry with `fonction: "Indice"` and hint meta.
 * Unlimited count; any field keys (hint1, hint4, actor, …).
 * Order: `hint.order` ascending (undefined last), then fieldMapping key order.
 */
export function getHintTiers(universeData: UniverseData): HintTierDef[] {
  const fm = universeData.fieldMapping;
  if (!fm) return [];
  const out: { tier: HintTierDef; order: number; index: number }[] = [];
  let index = 0;
  for (const [fieldKey, entry] of Object.entries(fm)) {
    if (entry.fonction !== "Indice") continue;
    const prompt = entry.hint?.prompt?.trim();
    const icon = entry.hint?.icon?.trim();
    if (!prompt || !icon) continue;
    const tier: HintTierDef = {
      fieldKey,
      prompt,
      icon,
      ...(typeof entry.hint?.unlockAfter === "number" && Number.isFinite(entry.hint.unlockAfter)
        ? { unlockAfter: entry.hint.unlockAfter }
        : {}),
    };
    out.push({
      tier,
      order: typeof entry.hint?.order === "number" ? entry.hint.order : Number.POSITIVE_INFINITY,
      index: index++,
    });
  }
  out.sort((a, b) => a.order - b.order || a.index - b.index);
  return out.map((x) => x.tier);
}

/** Default guesses between successive auto-scheduled hints. */
export const DEFAULT_HINT_INTERVAL = 5;

export function getHintInterval(universeData: UniverseData): number {
  const n = universeData.hintInterval;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return Math.floor(n);
  return DEFAULT_HINT_INTERVAL;
}

/** Guesses required to unlock the tier at `tierIndex` (0-based). */
export function getHintUnlockAfter(tier: HintTierDef, tierIndex: number, interval: number): number {
  if (typeof tier.unlockAfter === "number" && Number.isFinite(tier.unlockAfter)) {
    return Math.max(0, Math.floor(tier.unlockAfter));
  }
  return (tierIndex + 1) * interval;
}

/** Display string for a character hint field value. */
export function formatHintValue(raw: Character[string] | undefined): string {
  if (raw === undefined || raw === null || raw === "") return "—";
  if (Array.isArray(raw)) {
    const parts = raw.map((v) => String(v).trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  const s = String(raw).trim();
  return s || "—";
}
