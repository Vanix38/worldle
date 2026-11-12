import { stripAccents } from "@/lib/utils";
import type { LogoQuizDifficulty } from "@/types/logo-quiz";

/** Canonical difficulty scale (aligned with Worlddle universes). */
export const LOGO_QUIZ_DIFFICULTY_ORDER: readonly LogoQuizDifficulty[] = [
  "Très facile",
  "Facile",
  "Moyen",
  "Difficile",
  "Impossible",
];

function normalizeKey(value: string): string {
  return stripAccents(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeLogoDifficulty(
  value: unknown
): LogoQuizDifficulty | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const key = normalizeKey(value);
  return LOGO_QUIZ_DIFFICULTY_ORDER.find((d) => normalizeKey(d) === key);
}

export function difficultyRank(difficulty: LogoQuizDifficulty): number {
  return LOGO_QUIZ_DIFFICULTY_ORDER.indexOf(difficulty);
}

/** Short label for compact badges. */
export function difficultyShortLabel(difficulty: LogoQuizDifficulty): string {
  switch (difficulty) {
    case "Très facile":
      return "TF";
    case "Facile":
      return "F";
    case "Moyen":
      return "M";
    case "Difficile":
      return "D";
    case "Impossible":
      return "I";
  }
}
