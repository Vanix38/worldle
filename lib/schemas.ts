import type {
  AttributeSchemaEntry,
  AttributeType,
  FieldMappingEntry,
  HintTierDef,
  UniverseData,
} from "@/types/game";

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
    case "Comparaison":
      type = "categorical";
      order = entry.order;
      ordered = Boolean(order && order.length > 0);
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
  return {
    key,
    label: entry.header,
    type,
    ordered,
    ...(order && order.length > 0 && { order }),
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
    .filter(([, e]) => e.fonction === "Recherche")
    .map(([key]) => key);
}

/**
 * Hint tiers in fieldMapping key order (only entries with `hint` set).
 */
export function getHintTiers(universeData: UniverseData): HintTierDef[] {
  const fm = universeData.fieldMapping;
  if (!fm) return [];
  const out: HintTierDef[] = [];
  for (const [fieldKey, entry] of Object.entries(fm)) {
    if (entry.hint?.prompt && entry.hint?.icon) {
      out.push({
        fieldKey,
        prompt: entry.hint.prompt,
        icon: entry.hint.icon,
      });
    }
  }
  return out;
}
