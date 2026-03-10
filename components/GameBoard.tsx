"use client";

import { useState, useEffect } from "react";
import { useGameState } from "@/hooks/useGameState";
import type { UniverseId } from "@/types/game";
import { CharacterSearch } from "./CharacterSearch";
import { AttributeCell } from "./AttributeCell";
import { ShareResult } from "./ShareResult";
import { GameHint } from "./GameHint";
import { CharacterAvatar } from "./CharacterAvatar";

const HINT_THRESHOLD = 3;

interface GameBoardProps {
  universeId: UniverseId;
}

export function GameBoard({ universeId }: GameBoardProps) {
  const {
    state,
    target,
    guessRows,
    schema,
    submitGuess,
    startNewGame,
  } = useGameState(universeId);
  const [hintRevealed, setHintRevealed] = useState(false);

  useEffect(() => {
    if (guessRows.length === 0) setHintRevealed(false);
  }, [guessRows.length]);

  if (!state) {
    return (
      <div className="flex justify-center py-12 text-gray-400">Chargement...</div>
    );
  }

  const won = state.won;
  const guessedIds = state.guesses;

  const hintUnlocked = !won && guessRows.length >= HINT_THRESHOLD;

  return (
    <div className="space-y-6">
      {/* Barre de recherche : élément principal en haut */}
      <div className="w-full">
        <CharacterSearch
          universeId={universeId}
          onSubmit={submitGuess}
          disabled={won}
          guessedIds={guessedIds}
          className="w-full"
          size="lg"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={startNewGame}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          aria-label="Nouvelle partie"
        >
          Nouvelle partie
        </button>
      </div>

      {hintUnlocked && target && (
        hintRevealed ? (
          <GameHint
            universeId={universeId}
            target={target}
            wrongGuessCount={guessRows.length}
            threshold={HINT_THRESHOLD}
          />
        ) : (
          <button
            type="button"
            onClick={() => setHintRevealed(true)}
            className="w-full rounded-lg border border-amber-600/50 bg-amber-950/20 px-4 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Révéler l'indice"
          >
            Indice disponible — cliquer pour révéler
          </button>
        )
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-600 bg-gray-900/80 shadow-xl">
        <table
          className="w-full min-w-[600px] border-collapse text-left"
          role="grid"
          aria-label="Tentatives et feedback par catégorie"
        >
          <thead>
            <tr className="border-b border-gray-600 bg-gray-800/80">
              <th className="px-4 py-3 text-sm font-semibold text-gray-300">
                Personnage
              </th>
              {schema.map((entry) => (
                <th
                  key={entry.key}
                  className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-gray-300"
                >
                  {entry.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...guessRows].reverse().map((row) => (
              <tr
                key={row.character.id}
                className="border-b border-gray-700 bg-gray-800/30 hover:bg-gray-800/50"
              >
                <td className="px-4 py-2 align-middle">
                  <div className="flex items-center gap-2">
                    <CharacterAvatar character={row.character} size="sm" />
                    <span className="font-medium text-white">
                      {row.character.name}
                    </span>
                  </div>
                </td>
                {row.feedback.map((item) => (
                  <td key={item.key} className="px-3 py-2">
                    <AttributeCell
                      label={item.label}
                      value={item.value}
                      status={item.status}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-gray-500">
        Vert = identique · Orange = partiel / plus haut ou plus bas · Rouge = différent
      </p>

      {won && target && (
        <ShareResult
          characterName={target.name}
          guessCount={guessRows.length}
          onNewGame={startNewGame}
        />
      )}
    </div>
  );
}
