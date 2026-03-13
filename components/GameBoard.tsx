"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameState } from "@/hooks/useGameState";
import type { UniverseId } from "@/types/game";
import { CharacterSearch } from "./CharacterSearch";
import { AttributeCell } from "./AttributeCell";
import { ShareResult } from "./ShareResult";
import { GameHint } from "./GameHint";
import { CharacterAvatar } from "./CharacterAvatar";
import { stripAccents } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0 },
};

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
        <Button variant="primary" size="md" onClick={startNewGame} aria-label="Nouvelle partie">
          Nouvelle partie
        </Button>
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
          <Button
            variant="warning"
            size="lg"
            className="w-full"
            onClick={() => setHintRevealed(true)}
            aria-label="Révéler l'indice"
          >
            Indice disponible — cliquer pour révéler
          </Button>
        )
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-600 bg-gray-900/80 shadow-xl">
        <table
          className="w-max min-w-full border-collapse text-left"
          role="grid"
          aria-label="Tentatives et feedback par catégorie"
        >
          <thead>
            <tr className="min-h-12 border-b border-gray-600 bg-gray-800/80">
              <th className="border border-gray-600 px-4 py-3 font-semibold uppercase leading-tight text-gray-300">
                <span className="block break-words text-[clamp(0.5rem,2vmin+0.4rem,0.9rem)]">
                  Personnage
                </span>
              </th>
              {schema.map((entry) => (
                <th
                  key={entry.key}
                  className="border border-gray-600 px-3 py-3 font-semibold uppercase leading-tight text-gray-300"
                >
                  <span className="block break-words text-[clamp(0.5rem,2vmin+0.4rem,0.9rem)]">
                    {stripAccents(entry.label)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody variants={tableVariants} initial="hidden" animate="show">
            {[...guessRows].reverse().map((row) => (
              <motion.tr
                key={row.character.id}
                variants={rowVariants}
                className="border-b border-gray-700 bg-gray-800/30 hover:bg-gray-800/50"
              >
                <td className="px-4 py-2 align-middle">
                  <div className="flex items-center gap-2">
                    <CharacterAvatar character={row.character} size="sm" />
                    <span className="font-medium text-white">
                      {stripAccents(row.character.name)}
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
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

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
