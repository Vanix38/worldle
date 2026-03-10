import type { Character, AttributeFeedback, FeedbackStatus, AttributeSchemaEntry } from "@/types/game";

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
};

/** Parse "Mois YYYY" or "YYYY" to a comparable number (YYYY * 12 + month). */
function parseDateOrder(val: unknown): number {
  const s = String(val ?? "").trim();
  if (!s) return 0;
  const parts = s.split(/\s+/);
  const year = parseInt(parts[parts.length - 1], 10);
  if (Number.isNaN(year)) return 0;
  if (parts.length === 1) return year * 12;
  const monthName = parts[0].toLowerCase();
  const month = FRENCH_MONTHS[monthName] ?? 0;
  return year * 12 + month;
}

function compareCategorical(guessVal: unknown, targetVal: unknown): FeedbackStatus {
  const g = String(guessVal ?? "").trim();
  const t = String(targetVal ?? "").trim();
  if (g === t) return "exact";
  return "none";
}

function compareWithOrder(
  guessVal: unknown,
  targetVal: unknown,
  order: string[]
): FeedbackStatus {
  const g = String(guessVal ?? "").trim();
  const t = String(targetVal ?? "").trim();
  const gi = order.indexOf(g);
  const ti = order.indexOf(t);
  if (gi === -1 || ti === -1) return g === t ? "exact" : "none";
  if (gi === ti) return "exact";
  return gi < ti ? "higher" : "lower";
}

function compareNumeric(guessVal: unknown, targetVal: unknown): FeedbackStatus {
  const g = Number(guessVal);
  const t = Number(targetVal);
  if (Number.isNaN(g) || Number.isNaN(t)) return "none";
  if (g === t) return "exact";
  return g < t ? "higher" : "lower";
}

function compareDate(guessVal: unknown, targetVal: unknown): FeedbackStatus {
  const g = parseDateOrder(guessVal);
  const t = parseDateOrder(targetVal);
  if (g === 0 && t === 0) return "none";
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
  if (Array.isArray(val)) {
    return new Set(val.map((x) => String(x).trim()).filter(Boolean));
  }
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

    if (entry.type === "multivalue") {
      status = compareMultivalue(guessVal, targetVal);
    } else if (entry.key === "devilFruitType") {
      status = compareDevilFruitType(guessVal, targetVal);
    } else if (entry.type === "date") {
      status = compareDate(guessVal, targetVal);
    } else if (entry.type === "categorical" && entry.order && entry.order.length > 0) {
      status = compareWithOrder(guessVal, targetVal, entry.order);
    } else if (entry.type === "numeric" && entry.ordered) {
      status = compareNumeric(guessVal, targetVal);
    } else {
      status = compareCategorical(guessVal, targetVal);
    }

    let displayValue: string;
    if (entry.type === "multivalue") {
      const set = parseMultivalue(guessVal);
      displayValue = set.size > 0 ? Array.from(set).join(", ") : "Aucun";
    } else {
      const raw = guessVal !== undefined && guessVal !== "" ? String(guessVal).trim() : "";
      displayValue = raw || "—";
    }

    return {
      key: entry.key,
      label: entry.label,
      value: displayValue,
      status,
    };
  });
}
