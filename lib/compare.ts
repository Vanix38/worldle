import type { Character, AttributeFeedback, FeedbackStatus, AttributeSchemaEntry } from "@/types/game";

function compareCategorical(guessVal: unknown, targetVal: unknown): FeedbackStatus {
  const g = String(guessVal ?? "").trim();
  const t = String(targetVal ?? "").trim();
  if (g === t) return "exact";
  return "none";
}

function compareNumeric(guessVal: unknown, targetVal: unknown): FeedbackStatus {
  const g = Number(guessVal);
  const t = Number(targetVal);
  if (Number.isNaN(g) || Number.isNaN(t)) return "none";
  if (g === t) return "exact";
  return g < t ? "higher" : "lower";
}

function compareDevilFruitType(guessVal: unknown, targetVal: unknown): FeedbackStatus {
  const g = String(guessVal ?? "").trim();
  const t = String(targetVal ?? "").trim();
  if (g === t) return "exact";
  const guessHas = g.length > 0;
  const targetHas = t.length > 0;
  if (guessHas && targetHas) return "partial";
  return "none";
}

function parseMultivalue(val: unknown): Set<string> {
  const s = String(val ?? "").trim();
  if (!s) return new Set();
  return new Set(s.split(",").map((x) => x.trim()).filter(Boolean));
}

function compareMultivalue(guessVal: unknown, targetVal: unknown): FeedbackStatus {
  const gSet = parseMultivalue(guessVal);
  const tSet = parseMultivalue(targetVal);
  if (gSet.size === 0 && tSet.size === 0) return "exact";
  if (gSet.size === 0 || tSet.size === 0) return "none";
  const intersection = Array.from(gSet).filter((x) => tSet.has(x));
  if (intersection.length === gSet.size && intersection.length === tSet.size) return "exact";
  if (intersection.length > 0) return "partial";
  return "none";
}

export function getFeedback(
  guess: Character,
  target: Character,
  schema: AttributeSchemaEntry[]
): AttributeFeedback[] {
  return schema.map((entry) => {
    const guessVal = guess[entry.key];
    const targetVal = target[entry.key];
    let status: FeedbackStatus;

    if (entry.key === "devilFruitType") {
      status = compareDevilFruitType(guessVal, targetVal);
    } else if (entry.type === "multivalue") {
      status = compareMultivalue(guessVal, targetVal);
    } else if (entry.type === "numeric" && entry.ordered) {
      status = compareNumeric(guessVal, targetVal);
    } else {
      status = compareCategorical(guessVal, targetVal);
    }

    let displayValue: string;
    if (entry.key === "devilFruitType") {
      displayValue = guessVal && String(guessVal).trim() ? String(guessVal).trim() : "Aucun";
    } else if (entry.key === "haki") {
      displayValue = guessVal && String(guessVal).trim() ? String(guessVal).trim() : "Aucun";
    } else {
      displayValue = guessVal !== undefined && guessVal !== "" ? String(guessVal) : "—";
    }

    return {
      key: entry.key,
      label: entry.label,
      value: displayValue,
      status,
    };
  });
}
