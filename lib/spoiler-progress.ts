import type { Character, UniverseData } from "@/types/game";
import { rankInOrderedList } from "@/lib/orderLabelEquivalence";
import {
  fieldOrderHasItems,
  flattenFieldOrder,
  getOrderGroups,
  type OrderGroup,
} from "@/lib/progress-order";

export const SPOILER_PROGRESS_STORAGE_KEY = "worlddle-spoiler-progress";

/** Legacy sentinel — all characters eligible. */
export const SPOILER_PROGRESS_NO_LIMIT = "__all__";

export interface ProgressFieldConfig {
  key: string;
  label: string;
  /** Flat chronological labels (comparison + filtering). */
  order: string[];
  /** When order is grouped in JSON (e.g. seasons → episodes). */
  groups?: OrderGroup[];
  orderLabelEquivalence?: [string, string][];
}

export interface SpoilerProgressPersisted {
  universeId: string;
  allSeen?: boolean;
  seenLabels?: string[];
  /** @deprecated Ancien format (cutoff unique). */
  cutoffLabel?: string;
}

export type SpoilerProgressSelection =
  | { mode: "all" }
  | { mode: "seen"; labels: string[] };

const PROGRESS_FIELD_PRIORITY = ["firstAppearance", "arc"] as const;

function configFromFieldEntry(
  key: string,
  entry: NonNullable<UniverseData["fieldMapping"]>[string],
): ProgressFieldConfig | null {
  if (entry.fonction !== "Comparaison" || !fieldOrderHasItems(entry.order)) return null;
  const order = flattenFieldOrder(entry.order);
  const groups = getOrderGroups(entry.order) ?? undefined;
  return {
    key,
    label: entry.header,
    order,
    ...(groups?.length ? { groups } : {}),
    ...(entry.orderLabelEquivalence?.length
      ? { orderLabelEquivalence: [...entry.orderLabelEquivalence] as [string, string][] }
      : {}),
  };
}

export function getProgressFieldConfig(universeData: UniverseData): ProgressFieldConfig | null {
  const fm = universeData.fieldMapping;
  if (!fm) return null;

  for (const key of PROGRESS_FIELD_PRIORITY) {
    const entry = fm[key];
    if (!entry) continue;
    const config = configFromFieldEntry(key, entry);
    if (config) return config;
  }

  for (const [key, entry] of Object.entries(fm)) {
    if (key === "ninjaRank") continue;
    const config = configFromFieldEntry(key, entry);
    if (config) return config;
  }

  return null;
}

export function universeHasSpoilerProgress(universeData: UniverseData): boolean {
  return getProgressFieldConfig(universeData) !== null;
}

export function getCharacterProgressRank(
  character: Character,
  config: ProgressFieldConfig,
): number {
  const raw = character[config.key];
  if (raw === undefined || raw === null) return -1;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return rankInOrderedList(value, config.order, config.orderLabelEquivalence);
}

function seenLabelRanks(
  seenLabels: string[],
  config: ProgressFieldConfig,
): Set<number> {
  const ranks = new Set<number>();
  for (const label of seenLabels) {
    const rank = rankInOrderedList(label, config.order, config.orderLabelEquivalence);
    if (rank !== -1) ranks.add(rank);
  }
  return ranks;
}

/** Labels from order[] up to and including cutoff (legacy migration). */
export function labelsUpToCutoff(
  cutoffLabel: string,
  config: ProgressFieldConfig,
): string[] {
  const cutoffRank = rankInOrderedList(
    cutoffLabel,
    config.order,
    config.orderLabelEquivalence,
  );
  if (cutoffRank === -1) return [];
  return config.order.slice(0, cutoffRank + 1);
}

export function selectionFromPersisted(
  persisted: SpoilerProgressPersisted,
  config: ProgressFieldConfig | null,
): SpoilerProgressSelection | null {
  if (persisted.allSeen || persisted.cutoffLabel === SPOILER_PROGRESS_NO_LIMIT) {
    return { mode: "all" };
  }
  if (persisted.seenLabels && persisted.seenLabels.length > 0) {
    return { mode: "seen", labels: [...persisted.seenLabels] };
  }
  if (persisted.cutoffLabel && config) {
    const labels = labelsUpToCutoff(persisted.cutoffLabel, config);
    if (labels.length > 0) return { mode: "seen", labels };
  }
  return null;
}

export function isProgressConfigured(
  config: ProgressFieldConfig | null,
  selection: SpoilerProgressSelection | null,
): boolean {
  if (!config) return true;
  if (!selection) return false;
  if (selection.mode === "all") return true;
  return selection.labels.length > 0;
}

/** True if character may be chosen as mystery target. */
export function isCharacterPlayable(
  character: Character,
  config: ProgressFieldConfig,
  selection: SpoilerProgressSelection,
): boolean {
  if (selection.mode === "all") return true;
  const charRank = getCharacterProgressRank(character, config);
  if (charRank === -1) return false;
  return seenLabelRanks(selection.labels, config).has(charRank);
}

export function filterPlayableCharacters(
  characters: Character[],
  config: ProgressFieldConfig | null,
  selection: SpoilerProgressSelection | null,
): Character[] {
  if (!config || !selection || selection.mode === "all") {
    return characters;
  }
  if (selection.labels.length === 0) return [];
  return characters.filter((c) => isCharacterPlayable(c, config, selection));
}

export function loadSpoilerProgress(universeId: string): SpoilerProgressPersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SPOILER_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpoilerProgressPersisted;
    if (parsed.universeId !== universeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSpoilerProgress(state: SpoilerProgressPersisted): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SPOILER_PROGRESS_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function persistedFromSelection(
  universeId: string,
  selection: SpoilerProgressSelection,
): SpoilerProgressPersisted {
  if (selection.mode === "all") {
    return { universeId, allSeen: true, seenLabels: [] };
  }
  return { universeId, allSeen: false, seenLabels: [...selection.labels] };
}

export function clearGameStorageForUniverse(universeId: string): void {
  if (typeof window === "undefined") return;
  const keys = ["worlddle-game"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { universeId?: string };
      if (parsed.universeId === universeId) localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function formatProgressSummary(
  selection: SpoilerProgressSelection,
  config: ProgressFieldConfig | null,
): string {
  if (selection.mode === "all") return "Tout l'univers";
  const n = selection.labels.length;
  if (n === 0) return "Rien de sélectionné";
  if (n === 1) return selection.labels[0];
  if (config && n === config.order.length) return "Tout vu";
  return `${n} sélectionné${n > 1 ? "s" : ""}`;
}
