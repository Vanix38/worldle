"use client";

import type { Character } from "@/types/game";
import { getHintAttribute } from "@/lib/schemas";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { stripAccents } from "@/lib/utils";

interface GameHintProps {
  universeId: string;
  target: Character;
  wrongGuessCount: number;
  /** Number of wrong guesses before showing the first hint (e.g. 3). */
  threshold?: number;
}

export function GameHint({
  universeId,
  target,
  wrongGuessCount,
  threshold = 3,
}: GameHintProps) {
  const { schema } = useUniverseData();
  const hintKey = getHintAttribute(universeId, schema);
  if (!hintKey || wrongGuessCount < threshold) return null;

  const entry = schema.find((e) => e.key === hintKey);
  const value = target[hintKey];
  const displayValue =
    value !== undefined && value !== "" && String(value).trim()
      ? String(value)
      : "—";

  return (
    <div
      className="rounded-lg border border-gold-600/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200"
      role="status"
      aria-live="polite"
      aria-label={`Indice après ${wrongGuessCount} tentatives`}
    >
      <span className="font-medium">Indice :</span>{" "}
      {entry ? `${stripAccents(entry.label)} = ${stripAccents(displayValue)}` : stripAccents(displayValue)}
    </div>
  );
}
