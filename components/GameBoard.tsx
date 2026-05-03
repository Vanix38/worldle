"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { motion, type Variants } from "framer-motion";
import { FaFlag, FaRedo } from "react-icons/fa";
import { useGameState } from "@/hooks/useGameState";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { fieldColumnWidthClass } from "@/lib/field-column-width";
import type { Character, FieldColumnWidth, UniverseId } from "@/types/game";
import { CharacterSearch, getFirstDisplayAlias } from "./CharacterSearch";
import { AttributeCell } from "./AttributeCell";
import { ShareResult } from "./ShareResult";
import { GameHintsBar } from "./GameHintsBar";
import { CharacterAvatar } from "./CharacterAvatar";
import { stripAccents } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/** Décale l’apparition de chaque cellule dans une ligne nouvellement ajoutée. */
const guessRowVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.12,
    },
  },
};

const guessCellVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Séquence clavier classique (↑↑↓↓←→←→BA), sans Start. */
const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

function konamiNormalizeKey(e: KeyboardEvent): string | null {
  const t = e.target as HTMLElement | null;
  if (!t) return null;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) {
    return null;
  }
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight") {
    return k;
  }
  if (k.length === 1 && /[a-zA-Z]/.test(k)) return k.toLowerCase();
  return null;
}

function useScrollOverflowFade(scrollRef: RefObject<HTMLDivElement | null>) {
  const [showRightFade, setShowRightFade] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    const gapEnd = el.scrollWidth - el.clientWidth - el.scrollLeft;
    const notAtEnd = gapEnd > 4;
    setShowRightFade(overflow && notAtEnd);
  }, [scrollRef]);

  useLayoutEffect(() => {
    update();
  }, [update]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef, update]);

  return { showRightFade, update };
}

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
  const [abandonModalOpen, setAbandonModalOpen] = useState(false);
  /** Personnage mystère de la partie qu’on vient d’abandonner (affiché après la nouvelle partie). */
  const [abandonedReveal, setAbandonedReveal] = useState<Character | null>(null);
  const [victoryModalDismissed, setVictoryModalDismissed] = useState(false);
  const [konamiModalOpen, setKonamiModalOpen] = useState(false);
  const konamiProgressRef = useRef(0);

  const columnWidthByKey = useMemo(() => {
    const m = new Map<string, FieldColumnWidth | undefined>();
    for (const e of schema) {
      m.set(e.key, e.columnWidth);
    }
    return m;
  }, [schema]);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const { showRightFade, update: updateScrollFade } = useScrollOverflowFade(tableScrollRef);

  const openNewGameModal = useCallback(() => setNewGameModalOpen(true), []);
  const closeNewGameModal = useCallback(() => setNewGameModalOpen(false), []);
  const openAbandonModal = useCallback(() => setAbandonModalOpen(true), []);
  const closeAbandonModal = useCallback(() => setAbandonModalOpen(false), []);

  const confirmNewGame = useCallback(() => {
    startNewGame();
    setNewGameModalOpen(false);
  }, [startNewGame]);

  const confirmAbandon = useCallback(() => {
    if (!target) {
      setAbandonModalOpen(false);
      return;
    }
    const previousTarget = target;
    startNewGame();
    setAbandonModalOpen(false);
    setAbandonedReveal(previousTarget);
  }, [startNewGame, target]);

  const won = state?.won ?? false;
  useEffect(() => {
    if (won) setVictoryModalDismissed(false);
  }, [won]);

  useEffect(() => {
    konamiProgressRef.current = 0;
  }, [target?.id]);

  useEffect(() => {
    if (!target) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = konamiNormalizeKey(e);
      if (k === null) return;

      const seq = KONAMI_SEQUENCE;
      let i = konamiProgressRef.current;

      if (k === seq[i]) {
        i += 1;
        if (i >= seq.length) {
          konamiProgressRef.current = 0;
          setKonamiModalOpen(true);
        } else {
          konamiProgressRef.current = i;
        }
      } else {
        konamiProgressRef.current = k === seq[0] ? 1 : 0;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [target]);

  useLayoutEffect(() => {
    updateScrollFade();
  }, [guessRows.length, schema.length, updateScrollFade]);

  if (!state) {
    return (
      <div className="flex justify-center py-12 text-gray-400">
        {stripAccents("Chargement...")}
      </div>
    );
  }

  const guessedIds = state.guesses;
  const showHintsBar = Boolean(target && !won && hintTiers.length > 0);
  const victoryModalOpen = Boolean(won && target && !victoryModalDismissed);

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div
        className={`flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-start ${showHintsBar ? "sm:justify-between" : "sm:justify-end"}`}
      >
        {showHintsBar && target ? (
          <div className="w-full min-w-0 sm:flex-1">
            <GameHintsBar target={target} guessCount={guessRows.length} />
          </div>
        ) : null}
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[13.5rem] sm:max-w-[13.5rem] sm:self-end">
          {target && !won ? (
            <Button
              variant="secondary"
              size="md"
              className="min-h-[2.75rem] w-full"
              type="button"
              onClick={openAbandonModal}
              aria-label={stripAccents("Abandonner la partie")}
            >
              <span className="flex items-center justify-center gap-2">
                <FaFlag className="h-4 w-4 shrink-0" aria-hidden />
                {stripAccents("Abandonner")}
              </span>
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="md"
            className="min-h-[2.75rem] w-full"
            onClick={openNewGameModal}
            aria-label={stripAccents("Nouvelle partie")}
          >
            <span className="flex items-center justify-center gap-2">
              <FaRedo className="h-4 w-4 shrink-0" aria-hidden />
              {stripAccents("Nouvelle partie")}
            </span>
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
        isOpen={victoryModalOpen}
        onClose={() => setVictoryModalDismissed(true)}
        title={stripAccents("Bravo !")}
        closeLabel={stripAccents("Fermer la boîte de dialogue")}
        contentClassName="text-gray-100"
      >
        {target ? (
          <ShareResult
            character={target}
            guessCount={guessRows.length}
            onNewGame={() => {
              setVictoryModalDismissed(true);
              openNewGameModal();
            }}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={konamiModalOpen}
        onClose={() => setKonamiModalOpen(false)}
        title={stripAccents("Konami")}
        closeLabel={stripAccents("Fermer la boîte de dialogue")}
      >
        <p className="text-sm leading-relaxed text-gray-300">
          {stripAccents("Personnage à trouver :")}{" "}
          {target ? (
            <strong className="text-lg text-white">{stripAccents(target.name)}</strong>
          ) : null}
        </p>
      </Modal>

      <Modal
        isOpen={abandonModalOpen}
        onClose={closeAbandonModal}
        title={stripAccents("Abandonner ?")}
        closeLabel={stripAccents("Fermer la boîte de dialogue")}
      >
        <p className="mb-6 text-sm leading-relaxed text-gray-300">
          {stripAccents(
            "Abandonner cette partie ? La progression actuelle sera perdue et une nouvelle partie commencera."
          )}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="md" type="button" onClick={closeAbandonModal}>
            {stripAccents("Annuler")}
          </Button>
          <Button variant="danger" size="md" type="button" onClick={confirmAbandon}>
            {stripAccents("Abandonner")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={abandonedReveal !== null}
        onClose={() => setAbandonedReveal(null)}
        title={stripAccents("Partie abandonnée")}
        closeLabel={stripAccents("Fermer la boîte de dialogue")}
      >
        {abandonedReveal ? (
          <>
            <p className="mb-3 text-sm leading-relaxed text-gray-300">
              {stripAccents("Tu devais trouver :")}
            </p>
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-gray-600 bg-gray-800/60 px-3 py-2">
              <CharacterAvatar character={abandonedReveal} size="md" />
              <strong className="text-lg text-white">{stripAccents(abandonedReveal.name)}</strong>
            </div>
            <div className="flex flex-wrap justify-end">
              <Button variant="primary" size="md" type="button" onClick={() => setAbandonedReveal(null)}>
                {stripAccents("OK")}
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        isOpen={newGameModalOpen}
        onClose={closeNewGameModal}
        title={stripAccents("Nouvelle partie ?")}
        closeLabel={stripAccents("Fermer la boîte de dialogue")}
      >
        <p className="mb-6 text-sm leading-relaxed">
          {stripAccents(
            "Commencer une nouvelle partie ? La progression actuelle sera perdue."
          )}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="md" type="button" onClick={closeNewGameModal}>
            {stripAccents("Annuler")}
          </Button>
          <Button variant="primary" size="md" type="button" onClick={confirmNewGame}>
            {stripAccents("Commencer")}
          </Button>
        </div>
      </Modal>

      <div className="relative max-w-full overflow-hidden rounded-lg border border-gray-600 bg-gray-900/80 shadow-xl">
        <div
          ref={tableScrollRef}
          onScroll={updateScrollFade}
          className="overflow-x-auto lg:overflow-x-hidden"
        >
          <table
            className="w-full min-w-0 table-fixed border-collapse text-center"
            role="grid"
            aria-label={stripAccents("Tentatives et feedback par catégorie")}
          >
            <thead>
              <tr className="min-h-12 border-b border-gray-600 bg-gray-800/80">
                <th className="w-44 min-w-[8rem] max-w-[32%] border border-gray-600 px-2 py-2 text-left align-top font-semibold uppercase leading-tight text-gray-300 md:px-3 md:py-2.5 lg:px-4 lg:py-3">
                  <span className="block break-words text-[clamp(0.5rem,2vmin+0.35rem,0.85rem)]">
                    {stripAccents("Personnage")}
                  </span>
                </th>
                {schema.map((entry) => (
                  <th
                    key={entry.key}
                    className={`min-w-0 border border-gray-600 px-2 py-2 text-center align-top font-semibold uppercase leading-tight text-gray-300 md:px-3 md:py-2.5 lg:px-4 lg:py-3 ${fieldColumnWidthClass(columnWidthByKey.get(entry.key))}`}
                  >
                    <span className="block break-words text-[clamp(0.5rem,2vmin+0.35rem,0.85rem)]">
                      {stripAccents(entry.label)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...guessRows].reverse().map((row) => {
                const firstAlias = getFirstDisplayAlias(row.character);
                return (
                  <motion.tr
                    key={row.character.id}
                    variants={guessRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b border-gray-700 bg-gray-800/30 hover:bg-gray-800/50"
                  >
                    <motion.td
                      variants={guessCellVariants}
                      className="w-44 min-w-[8rem] max-w-[32%] border border-gray-600 px-2 py-1.5 text-left align-top md:px-3 md:py-2 lg:px-4 lg:py-2"
                    >
                      <div className="flex min-h-11 min-w-0 items-start justify-start gap-2">
                        <CharacterAvatar character={row.character} size="sm" />
                        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                          <span className="break-words text-sm font-medium text-white">
                            {stripAccents(row.character.name)}
                          </span>
                          {firstAlias ? (
                            <span className="break-words text-sm text-gray-400">
                              {stripAccents(firstAlias)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </motion.td>
                    {row.feedback.map((item) => (
                      <motion.td
                        key={item.key}
                        variants={guessCellVariants}
                        className={`min-w-0 border border-gray-600 px-2 py-1.5 text-center align-top break-words md:px-3 md:py-2 lg:px-4 lg:py-2 ${fieldColumnWidthClass(columnWidthByKey.get(item.key))}`}
                      >
                        <AttributeCell
                          label={item.label}
                          fieldKey={item.key}
                          value={item.value}
                          status={item.status}
                        />
                      </motion.td>
                    ))}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 z-30 w-10 bg-gradient-to-l from-gray-900 via-gray-900/85 to-transparent transition-opacity duration-200 sm:w-12 md:w-14 ${showRightFade ? "opacity-100" : "opacity-0"}`}
          aria-hidden
        />
      </div>
    </div>
  );
}
