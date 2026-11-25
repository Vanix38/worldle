"use client";

import { useState, useEffect } from "react";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { HintIcon } from "@/lib/hint-icons";
import {
  DEFAULT_HINT_INTERVAL,
  formatHintValue,
  getHintUnlockAfter,
} from "@/lib/schemas";
import { stripAccents } from "@/lib/utils";
import { CHARACTER_IMAGE_EXTENSIONS, characterImageSrc } from "@/lib/character-image";

/** Charge la première image existante du perso (webp, png, jpg…) ; null s'il n'en a pas. */
function useCharacterImage(universeId: string, characterId: string, enabled: boolean): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(null);
    if (!enabled) return;
    let cancelled = false;
    const tryExt = (i: number) => {
      if (cancelled || i >= CHARACTER_IMAGE_EXTENSIONS.length) return;
      const url = characterImageSrc(universeId, characterId, i);
      const img = new Image();
      img.onload = () => !cancelled && setSrc(url);
      img.onerror = () => tryExt(i + 1);
      img.src = url;
    };
    tryExt(0);
    return () => {
      cancelled = true;
    };
  }, [universeId, characterId, enabled]);
  return src;
}

const SILHOUETTE_KEY = "__silhouette";

interface GameHintsBarProps {
  target: Character;
  guessCount: number;
}

export function GameHintsBar({ target, guessCount }: GameHintsBarProps) {
  const { hintTiers, hintInterval, silhouetteHint, universeId } = useUniverseData();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const interval = hintInterval > 0 ? hintInterval : DEFAULT_HINT_INTERVAL;
  const imageSrc = useCharacterImage(universeId, target.id, silhouetteHint);
  // Indice visuel ultime : un palier après le dernier indice texte.
  const silhouetteUnlockAfter =
    Math.max(0, ...hintTiers.map((tier, i) => getHintUnlockAfter(tier, i, interval))) + interval;
  const silhouetteUnlocked = guessCount >= silhouetteUnlockAfter;
  const silhouetteOpen = Boolean(expanded[SILHOUETTE_KEY]);

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
        {stripAccents(`Indices (un palier tous les ${interval} tentatives)`)}
      </p>
      <ul className="flex w-full flex-row flex-wrap gap-2 max-sm:items-stretch sm:items-start sm:justify-start">
        {hintTiers.map((tier, index) => {
          const unlockAfter = getHintUnlockAfter(tier, index, interval);
          const unlocked = guessCount >= unlockAfter;
          const isOpen = Boolean(expanded[tier.fieldKey]);
          const display = formatHintValue(target[tier.fieldKey]);

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
                  {stripAccents(display)}
                </div>
              )}
            </li>
          );
        })}
        {imageSrc && (
          <li className="flex min-w-0 max-w-full flex-1 flex-col gap-1 max-sm:min-w-[2.5rem] sm:w-auto sm:min-w-[8rem] sm:flex-none">
            <button
              type="button"
              disabled={!silhouetteUnlocked}
              onClick={() =>
                silhouetteUnlocked &&
                setExpanded((prev) => ({ ...prev, [SILHOUETTE_KEY]: !prev[SILHOUETTE_KEY] }))
              }
              aria-expanded={silhouetteUnlocked ? silhouetteOpen : undefined}
              aria-label={stripAccents(
                `Indice : Silhouette floutée, ${!silhouetteUnlocked ? "verrouillé" : silhouetteOpen ? "affiché" : "masqué"}`
              )}
              className={`flex w-full items-center justify-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition-colors max-sm:min-h-[3rem] max-sm:px-3 max-sm:py-3 sm:w-auto sm:justify-start sm:px-2 sm:py-2 ${
                silhouetteUnlocked
                  ? silhouetteOpen
                    ? "border-amber-500/60 bg-amber-900/40 text-amber-100"
                    : "border-amber-600/40 bg-amber-950/40 text-amber-200 hover:bg-amber-900/30"
                  : "cursor-not-allowed border-gray-700 bg-gray-900/50 text-gray-500"
              }`}
            >
              <HintIcon name="FaUserSecret" className="h-8 w-8 shrink-0 opacity-90 sm:h-5 sm:w-5" />
              <span className="hidden font-medium leading-tight sm:inline">
                {stripAccents("Silhouette floutée")}
              </span>
            </button>
            {silhouetteUnlocked && silhouetteOpen && (
              <div
                className="mx-auto h-32 w-32 overflow-hidden rounded border border-amber-600/30 bg-gray-900/60"
                role="img"
                aria-label={stripAccents("Image floutée du personnage")}
              >
                <img
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  className="pointer-events-none h-full w-full select-none object-cover object-top"
                  style={{ filter: "blur(5px)", transform: "scale(1.15)" }}
                />
              </div>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
