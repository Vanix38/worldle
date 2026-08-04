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
  /** Max difficulty label (inclusive); characters harder than this are excluded. */
  maxDifficulty?: string;
  /** @deprecated Ancien format (cutoff unique). */
  cutoffLabel?: string;
}

export type SpoilerProgressSelection =
  | { mode: "all" }
  | { mode: "seen"; labels: string[] };

export interface DifficultyConfig {
  key: string;
  label: string;
  /** Easiest → hardest. */
  order: string[];
}

const PROGRESS_FIELD_PRIORITY = ["firstAppearance", "arc"] as const;
const DIFFICULTY_FIELD_KEY = "difficulty";

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
    if (key === "ninjaRank" || key === DIFFICULTY_FIELD_KEY) continue;
    const config = configFromFieldEntry(key, entry);
    if (config) return config;
  }

  return null;
}

export function universeHasSpoilerProgress(universeData: UniverseData): boolean {
  return getProgressFieldConfig(universeData) !== null;
}

/** Difficulty field (Comparaison + order), independent from spoiler progress. */
export function getDifficultyConfig(universeData: UniverseData): DifficultyConfig | null {
  const entry = universeData.fieldMapping?.[DIFFICULTY_FIELD_KEY];
  if (!entry || entry.fonction !== "Comparaison" || !fieldOrderHasItems(entry.order)) {
    return null;
  }
  return {
    key: DIFFICULTY_FIELD_KEY,
    label: entry.header,
    order: flattenFieldOrder(entry.order),
  };
}

export function getCharacterDifficultyRank(
  character: Character,
  config: DifficultyConfig,
): number {
  const raw = character[config.key];
  if (raw === undefined || raw === null) return -1;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return rankInOrderedList(value, config.order);
}

/** Keep characters whose difficulty rank is ≤ selected max (inclusive). */
export function isCharacterWithinMaxDifficulty(
  character: Character,
  config: DifficultyConfig,
  maxDifficulty: string,
): boolean {
  const maxRank = rankInOrderedList(maxDifficulty, config.order);
  if (maxRank === -1) return false;
  const charRank = getCharacterDifficultyRank(character, config);
  if (charRank === -1) return false;
  return charRank <= maxRank;
}

/**
 * Resolve persisted max difficulty; default to hardest when config exists
 * but no valid saved value (migration / first run after feature).
 */
export function resolveMaxDifficulty(
  persisted: SpoilerProgressPersisted | null | undefined,
  config: DifficultyConfig | null,
): string | null {
  if (!config || config.order.length === 0) return null;
  if (persisted?.maxDifficulty) {
    const rank = rankInOrderedList(persisted.maxDifficulty, config.order);
    if (rank !== -1) return config.order[rank];
  }
  return config.order[config.order.length - 1];
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
  difficultyConfig: DifficultyConfig | null = null,
  maxDifficulty: string | null = null,
): Character[] {
  let pool = characters;

  if (config && selection) {
    if (selection.mode === "seen") {
      if (selection.labels.length === 0) return [];
      pool = pool.filter((c) => isCharacterPlayable(c, config, selection));
    }
  }

  if (difficultyConfig && maxDifficulty) {
    pool = pool.filter((c) =>
      isCharacterWithinMaxDifficulty(c, difficultyConfig, maxDifficulty),
    );
  }

  return pool;
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
  maxDifficulty?: string | null,
): SpoilerProgressPersisted {
  const difficulty =
    maxDifficulty && maxDifficulty.trim() ? { maxDifficulty: maxDifficulty.trim() } : {};
  if (selection.mode === "all") {
    return { universeId, allSeen: true, seenLabels: [], ...difficulty };
  }
  return { universeId, allSeen: false, seenLabels: [...selection.labels], ...difficulty };
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
  maxDifficulty?: string | null,
): string {
  let base: string;
  if (selection.mode === "all") base = "Tout l'univers";
  else {
    const n = selection.labels.length;
    if (n === 0) base = "Rien de sélectionné";
    else if (n === 1) base = selection.labels[0];
    else if (config && n === config.order.length) base = "Tout vu";
    else base = `${n} sélectionné${n > 1 ? "s" : ""}`;
  }
  if (maxDifficulty) return `${base} · ${maxDifficulty}`;
  return base;
}
