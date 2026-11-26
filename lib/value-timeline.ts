import type { Character, ValueTimelineStep } from "@/types/game";
import { rankInOrderedList } from "@/lib/orderLabelEquivalence";
import type { ProgressFieldConfig, SpoilerProgressSelection } from "@/lib/spoiler-progress";

/**
 * Valeurs sans spoiler : un champ `X` peut avoir une chronologie `XTimeline`
 * ([{ value }, { value, from: "Chapitre 574" }, …]). Le jeu affiche la dernière
 * étape dont le `from` a été vu par le joueur (sa progression), sinon la valeur
 * de départ. Ex. Ace : « Vivant » tant que le chapitre 574 n'est pas sélectionné.
 */
const TIMELINE_SUFFIX = "Timeline";

function isTimeline(value: unknown): value is ValueTimelineStep[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((s) => s !== null && typeof s === "object" && typeof (s as ValueTimelineStep).value === "string")
  );
}

/**
 * Rang de progression le plus avancé que le joueur a vu.
 * null = tout vu (pas de restriction) ; -1 = rien de vu.
 */
export function maxSeenProgressRank(
  config: ProgressFieldConfig | null,
  selection: SpoilerProgressSelection | null,
): number | null {
  if (!config || !selection || selection.mode === "all") return null;
  let max = -1;
  const side = new Set(config.nonChronologicalLabels ?? []);
  for (const label of selection.labels) {
    if (side.has(label)) continue;
    const rank = rankInOrderedList(label, config.order, config.orderLabelEquivalence);
    if (rank > max) max = rank;
  }
  return max;
}

/** Valeur de la chronologie connue au rang `maxRank` (null = dernière valeur). */
export function resolveTimelineValue(
  steps: ValueTimelineStep[],
  config: ProgressFieldConfig | null,
  maxRank: number | null,
): string {
  if (maxRank === null || !config) return steps[steps.length - 1].value;
  let value = steps[0].value;
  for (const step of steps.slice(1)) {
    if (!step.from) continue;
    const rank = rankInOrderedList(step.from, config.order, config.orderLabelEquivalence);
    // Libellé inconnu : on ne révèle rien.
    if (rank === -1 || rank > maxRank) break;
    value = step.value;
  }
  return value;
}

/** Remplace chaque champ qui a une chronologie par sa valeur connue à la progression du joueur. */
export function applyValueTimelines(
  character: Character,
  config: ProgressFieldConfig | null,
  maxRank: number | null,
): Character {
  let out: Character | null = null;
  for (const [key, raw] of Object.entries(character)) {
    if (!key.endsWith(TIMELINE_SUFFIX) || key === TIMELINE_SUFFIX || !isTimeline(raw)) continue;
    const field = key.slice(0, -TIMELINE_SUFFIX.length);
    const value = resolveTimelineValue(raw, config, maxRank);
    if (character[field] === value) continue;
    out ??= { ...character };
    out[field] = value;
  }
  return out ?? character;
}

export function applyValueTimelinesToAll(
  characters: Character[],
  config: ProgressFieldConfig | null,
  selection: SpoilerProgressSelection | null,
): Character[] {
  const maxRank = maxSeenProgressRank(config, selection);
  if (maxRank === null) return characters;
  return characters.map((c) => applyValueTimelines(c, config, maxRank));
}
