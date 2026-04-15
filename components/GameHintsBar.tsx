"use client";

import { useState, useEffect } from "react";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { HintIcon } from "@/lib/hint-icons";
import { stripAccents } from "@/lib/utils";

/** Guesses required between each hint tier (1st at 5, 2nd at 10, …). */
export const HINT_INTERVAL = 5;

interface GameHintsBarProps {
  target: Character;
  guessCount: number;
}

export function GameHintsBar({ target, guessCount }: GameHintsBarProps) {
  const { hintTiers } = useUniverseData();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (guessCount === 0) setExpanded({});
  }, [guessCount]);

  if (hintTiers.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-3"
      role="region"
      aria-label="Indices"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-500/90">
        Indices (un palier tous les {HINT_INTERVAL} tentatives)
      </p>
      <ul className="flex flex-wrap gap-2">
        {hintTiers.map((tier, index) => {
          const unlocked = guessCount >= (index + 1) * HINT_INTERVAL;
          const isOpen = Boolean(expanded[tier.fieldKey]);
          const raw = target[tier.fieldKey];
          const display =
            raw !== undefined && raw !== "" && String(raw).trim()
              ? String(raw)
              : "—";

          return (
            <li key={tier.fieldKey} className="flex min-w-[8rem] flex-col gap-1">
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
                aria-label={`Indice : ${tier.prompt}, ${!unlocked ? "verrouillé" : isOpen ? "affiché" : "masqué"}`}
                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition-colors ${
                  unlocked
                    ? isOpen
                      ? "border-amber-500/60 bg-amber-900/40 text-amber-100"
                      : "border-amber-600/40 bg-amber-950/40 text-amber-200 hover:bg-amber-900/30"
                    : "cursor-not-allowed border-gray-700 bg-gray-900/50 text-gray-500"
                }`}
              >
                <HintIcon name={tier.icon} className="h-5 w-5 shrink-0 opacity-90" />
                <span className="font-medium leading-tight">{stripAccents(tier.prompt)}</span>
              </button>
              {unlocked && isOpen && (
                <div
                  className="rounded border border-amber-600/30 bg-gray-900/60 px-2 py-1.5 text-sm text-amber-100"
                  role="status"
                  aria-live="polite"
                >
                  {stripAccents(display)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
