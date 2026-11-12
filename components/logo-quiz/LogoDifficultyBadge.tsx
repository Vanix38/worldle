"use client";

import { stripAccents } from "@/lib/utils";
import { difficultyShortLabel } from "@/lib/logo-quiz-difficulty";
import type { LogoQuizDifficulty } from "@/types/logo-quiz";

interface LogoDifficultyBadgeProps {
  difficulty: LogoQuizDifficulty;
  /** Compact = short code (TF/F/M/D/I), full = full label. */
  variant?: "compact" | "full";
  className?: string;
}

/** Kept in this file so Tailwind content scanning always sees the classes. */
const BADGE_CLASSES: Record<LogoQuizDifficulty, string> = {
  "Très facile": "bg-emerald-600 text-white shadow-sm shadow-black/25",
  Facile: "bg-sky-600 text-white shadow-sm shadow-black/25",
  Moyen: "bg-amber-500 text-gray-950 shadow-sm shadow-black/25",
  Difficile: "bg-orange-600 text-white shadow-sm shadow-black/25",
  Impossible: "bg-rose-600 text-white shadow-sm shadow-black/25",
};

export function LogoDifficultyBadge({
  difficulty,
  variant = "compact",
  className = "",
}: LogoDifficultyBadgeProps) {
  const label =
    variant === "full" ? difficulty : difficultyShortLabel(difficulty);

  return (
    <span
      className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${BADGE_CLASSES[difficulty]} ${className}`}
      title={stripAccents(difficulty)}
      aria-label={stripAccents(`Difficulté ${difficulty}`)}
    >
      {stripAccents(label)}
    </span>
  );
}
