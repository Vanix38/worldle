"use client";

import { useState, useMemo, useEffect } from "react";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import type { HardModeApi } from "@/hooks/useHardModeState";
import { CharacterAvatar } from "./CharacterAvatar";
import { HardModeCharacterImage } from "./HardModeCharacterImage";
import { Button } from "@/components/ui/Button";
import { stripAccents } from "@/lib/utils";

interface HardModeSectionProps {
  hardMode: HardModeApi;
  /** When set, « Démarrer » ouvre la confirmation parente au lieu de lancer tout de suite. */
  onRequestStartWithConfirm?: () => void;
  /** When set, « Nouvelle série » ouvre la confirmation parente (ex. série terminée). */
  onRequestNewSeriesWithConfirm?: () => void;
}

export function HardModeSection({
  hardMode,
  onRequestStartWithConfirm,
  onRequestNewSeriesWithConfirm,
}: HardModeSectionProps) {
  const { characters } = useUniverseData();
  const {
    hydrated,
    foundIds,
    currentId,
    challengeOpen,
    remainingCount,
    allFound,
    submitGuess,
    skip,
    closeChallenge,
    openChallenge,
    resetAndStartNewSeries,
  } = hardMode;

  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "wrong">("idle");

  const current = useMemo(
    () => (currentId ? characters.find((c) => c.id === currentId) : undefined),
    [characters, currentId]
  );

  const foundCharacters = useMemo((): Character[] => {
    const out: Character[] = [];
    for (const id of foundIds) {
      const c = characters.find((x) => x.id === id);
      if (c) out.push(c);
    }
    return out;
  }, [foundIds, characters]);

  useEffect(() => {
    if (!hydrated || characters.length === 0) return;
    if (!currentId && foundIds.length === 0) {
      setInput("");
      setFeedback("idle");
    }
  }, [hydrated, characters.length, currentId, foundIds.length]);

  if (!hydrated || characters.length === 0) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !input.trim()) return;
    const ok = submitGuess(input);
    if (ok) {
      setInput("");
      setFeedback("idle");
    } else {
      setFeedback("wrong");
    }
  };

  const sessionActive = Boolean(currentId || foundIds.length > 0);

  return (
    <section
      id="hard-mode-section"
      className="rounded-xl border border-gray-600 bg-gray-900/70 p-4 shadow-lg"
      aria-label="Portrait mystère"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Portrait mystère</h2>
        <p className="text-sm text-gray-400">
          {foundIds.length} / {characters.length}{" "}
          {stripAccents(`trouvé${foundIds.length !== 1 ? "s" : ""}`)}
          {remainingCount > 0
            ? stripAccents(` · ${remainingCount} restant${remainingCount > 1 ? "s" : ""}`)
            : null}
        </p>
      </div>

      {allFound && (
        <div className="mb-4 rounded-lg border border-green-600/40 bg-green-950/30 px-3 py-3 text-center text-sm text-green-200">
          <p className="mb-2 font-medium">
            {stripAccents("Tous les personnages ont été trouvés.")}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() =>
              onRequestNewSeriesWithConfirm
                ? onRequestNewSeriesWithConfirm()
                : resetAndStartNewSeries()
            }
          >
            {stripAccents("Nouvelle série")}
          </Button>
        </div>
      )}

      {!allFound && !sessionActive && onRequestStartWithConfirm && (
        <div className="mb-4">
          <Button type="button" variant="primary" size="md" onClick={onRequestStartWithConfirm}>
            {stripAccents("Démarrer")}
          </Button>
        </div>
      )}

      {foundCharacters.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            {stripAccents("Trouvés (ordre)")}
          </p>
          <ul className="flex flex-wrap gap-3">
            {foundCharacters.map((c) => (
              <li key={c.id} className="flex w-20 flex-col items-center gap-1 text-center">
                <CharacterAvatar character={c} size="md" />
                <span className="line-clamp-2 text-[10px] leading-tight text-gray-400">
                  {stripAccents(c.name)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!allFound && sessionActive && challengeOpen && current && (
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <HardModeCharacterImage character={current} className="mx-auto" />
          <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="hard-mode-guess" className="sr-only">
              {stripAccents("Nom du personnage")}
            </label>
            <input
              id="hard-mode-guess"
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setFeedback("idle");
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={stripAccents("Nom ou alias (sans aide)")}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder:text-gray-500 focus:border-ocean-500 focus:outline-none focus:ring-1 focus:ring-ocean-500"
            />
            {feedback === "wrong" && (
              <p className="text-sm text-red-400" role="status">
                {stripAccents("Ce n'est pas assez proche. Réessaie ou passe au suivant.")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" size="md">
                Valider
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  skip();
                  setInput("");
                  setFeedback("idle");
                }}
              >
                Passer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  closeChallenge();
                  setFeedback("idle");
                }}
              >
                Fermer
              </Button>
            </div>
          </form>
        </div>
      )}

      {!allFound && sessionActive && !challengeOpen && currentId && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {stripAccents(
              "Défi en pause. Clique sur « Continuer » pour afficher à nouveau l'image et la saisie."
            )}
          </p>
          <Button type="button" variant="primary" size="md" onClick={() => openChallenge()}>
            Continuer
          </Button>
        </div>
      )}
    </section>
  );
}
