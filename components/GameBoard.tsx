"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGameState } from "@/hooks/useGameState";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import type { UniverseId } from "@/types/game";
import { CharacterSearch } from "./CharacterSearch";
import { AttributeCell } from "./AttributeCell";
import { ShareResult } from "./ShareResult";
import { GameHintsBar } from "./GameHintsBar";
import { CharacterAvatar } from "./CharacterAvatar";
import { stripAccents } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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

interface GameBoardProps {
  universeId: UniverseId;
}

export function GameBoard({ universeId }: GameBoardProps) {
  const { hintTiers } = useUniverseData();
  const {
    state,
    target,
    guessRows,
    schema,
    submitGuess,
    startNewGame,
  } = useGameState(universeId);

  const [newGameModalOpen, setNewGameModalOpen] = useState(false);

  const openNewGameModal = useCallback(() => setNewGameModalOpen(true), []);
  const closeNewGameModal = useCallback(() => setNewGameModalOpen(false), []);

  const confirmNewGame = useCallback(() => {
    startNewGame();
    setNewGameModalOpen(false);
  }, [startNewGame]);

  if (!state) {
    return (
      <div className="flex justify-center py-12 text-gray-400">Chargement...</div>
    );
  }

  const won = state.won;
  const guessedIds = state.guesses;
  const showHintsBar = Boolean(target && !won && hintTiers.length > 0);

  return (
    <div className="space-y-6">
      <div
        className={`flex flex-wrap items-start gap-3 ${showHintsBar ? "justify-between" : "justify-end"}`}
      >
        {showHintsBar && target ? (
          <div className="min-w-0 flex-1">
            <GameHintsBar target={target} guessCount={guessRows.length} />
          </div>
        ) : null}
        <div className="flex w-full max-w-[13.5rem] shrink-0 flex-col gap-2 self-end sm:w-[13.5rem]">
          <Link
            href={`/game/${universeId}/hard`}
            className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Mode difficile
          </Link>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={openNewGameModal}
            aria-label="Nouvelle partie"
          >
            Nouvelle partie
          </Button>
        </div>
      </div>

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

      <Modal
        isOpen={newGameModalOpen}
        onClose={closeNewGameModal}
        title="Nouvelle partie ?"
        closeLabel="Fermer la boîte de dialogue"
      >
        <p className="mb-6 text-sm leading-relaxed">
          Commencer une nouvelle partie ? La progression actuelle sera perdue.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="md" type="button" onClick={closeNewGameModal}>
            Annuler
          </Button>
          <Button variant="primary" size="md" type="button" onClick={confirmNewGame}>
            Commencer
          </Button>
        </div>
      </Modal>

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
          onNewGame={openNewGameModal}
        />
      )}
    </div>
  );
}
