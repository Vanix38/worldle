"use client";

import { useState, useEffect } from "react";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { HintIcon } from "@/lib/hint-icons";
import { NarutoChakraMixedDisplay } from "@/lib/naruto-chakra-display";
import { stripAccents } from "@/lib/utils";

/** Guesses required between each hint tier (1st at 5, 2nd at 10, …). */
export const HINT_INTERVAL = 5;

interface GameHintsBarProps {
  target: Character;
  guessCount: number;
}

export function GameHintsBar({ target, guessCount }: GameHintsBarProps) {
  const { hintTiers, universeId } = useUniverseData();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (guessCount === 0) setExpanded({});
  }, [guessCount]);

  if (hintTiers.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-3"
      role="region"
      aria-label={stripAccents("Indices")}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-500/90">
        {stripAccents(`Indices (un palier tous les ${HINT_INTERVAL} tentatives)`)}
      </p>
      <ul className="flex w-full flex-row flex-wrap gap-2 max-sm:items-stretch sm:items-start sm:justify-start">
        {hintTiers.map((tier, index) => {
          const unlocked = guessCount >= (index + 1) * HINT_INTERVAL;
          const isOpen = Boolean(expanded[tier.fieldKey]);
          const raw = target[tier.fieldKey];
          const display =
            raw !== undefined && raw !== "" && String(raw).trim()
              ? String(raw)
              : "—";

          return (
            <li
              key={tier.fieldKey}
              className="flex min-w-0 max-w-full flex-1 flex-col gap-1 max-sm:min-w-[2.5rem] sm:w-auto sm:min-w-[8rem] sm:flex-none"
            >
              <button
                type="button"
                disabled={!unlocked}
                onClick={() =>
                  unlocked &&
                  setExpanded((prev) => ({
                    ...prev,
                    [tier.fieldKey]: !prev[tier.fieldKey],
                  }))
                }
                aria-expanded={unlocked ? isOpen : undefined}
                aria-label={stripAccents(
                  `Indice : ${tier.prompt}, ${!unlocked ? "verrouillé" : isOpen ? "affiché" : "masqué"}`
                )}
                className={`flex w-full items-center justify-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition-colors max-sm:min-h-[3rem] max-sm:px-3 max-sm:py-3 sm:w-auto sm:justify-start sm:px-2 sm:py-2 ${
                  unlocked
                    ? isOpen
                      ? "border-amber-500/60 bg-amber-900/40 text-amber-100"
                      : "border-amber-600/40 bg-amber-950/40 text-amber-200 hover:bg-amber-900/30"
                    : "cursor-not-allowed border-gray-700 bg-gray-900/50 text-gray-500"
                }`}
              >
                <HintIcon
                  name={tier.icon}
                  className="h-8 w-8 shrink-0 opacity-90 sm:h-5 sm:w-5"
                />
                <span className="hidden font-medium leading-tight sm:inline">
                  {stripAccents(tier.prompt)}
                </span>
              </button>
              {unlocked && isOpen && (
                <div
                  className="rounded border border-amber-600/30 bg-gray-900/60 px-2 py-1.5 text-center text-sm text-amber-100"
                  role="status"
                  aria-live="polite"
                >
                  {universeId === "naruto" && tier.fieldKey === "indice2" ? (
                    <NarutoChakraMixedDisplay value={display} iconClassName="mx-auto h-8 w-8 shrink-0 rounded-sm object-contain" />
                  ) : (
                    stripAccents(display)
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
