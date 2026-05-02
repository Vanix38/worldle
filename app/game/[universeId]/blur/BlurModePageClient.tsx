"use client";

import Link from "next/link";
import { useCallback, useState, useEffect } from "react";
import { stripAccents } from "@/lib/utils";
import type { UniverseData } from "@/types/game";
import { UniverseDataProvider } from "@/contexts/UniverseDataContext";
import { useBlurGuessState } from "@/hooks/useBlurGuessState";
import { BlurCharacterImage } from "@/components/BlurCharacterImage";
import { CharacterSearch } from "@/components/CharacterSearch";
import { ShareResult } from "@/components/ShareResult";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface BlurModePageClientProps {
  universeId: string;
  universeData: UniverseData;
}

function BlurModeContent({ universeId }: { universeId: string }) {
  const { state, target, blurPx, submitGuess, startNewGame } = useBlurGuessState(universeId);
  const [newGameModalOpen, setNewGameModalOpen] = useState(false);
  const [victoryDismissed, setVictoryDismissed] = useState(false);

  const won = state?.won ?? false;
  useEffect(() => {
    if (won) setVictoryDismissed(false);
  }, [won]);

  const openNewGameModal = useCallback(() => setNewGameModalOpen(true), []);
  const closeNewGameModal = useCallback(() => setNewGameModalOpen(false), []);
  const confirmNewGame = useCallback(() => {
    startNewGame();
    setNewGameModalOpen(false);
  }, [startNewGame]);

  const guessedIds = state?.guesses ?? [];
  const victoryModalOpen = Boolean(won && target && !victoryDismissed);
  const wrongCount = state && !state.won ? state.guesses.length : state?.won ? state.guesses.length - 1 : 0;
  const blurDescription =
    blurPx === 0
      ? stripAccents("Image nette.")
      : stripAccents(`Flou ${blurPx} pixels (${wrongCount} mauvaise${wrongCount > 1 ? "s" : ""} réponse${wrongCount > 1 ? "s" : ""}).`);

  if (!state || !target) {
    return (
      <div className="flex justify-center py-12 text-gray-400">{stripAccents("Chargement...")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex w-full max-w-none flex-col gap-2 self-stretch sm:max-w-[13.5rem] sm:self-end">
        <Link
          href={`/game/${universeId}`}
          className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          {stripAccents("Mode classique")}
        </Link>
        <Button
          variant="primary"
          size="md"
          className="w-full"
          type="button"
          onClick={openNewGameModal}
          aria-label={stripAccents("Nouvelle partie")}
        >
          {stripAccents("Nouvelle partie")}
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        {blurDescription}
      </p>

      <div className="flex flex-col items-center gap-2">
        <BlurCharacterImage character={target} blurPx={blurPx} />
        <p className="text-center text-xs text-gray-500" aria-hidden>
          {blurDescription}
        </p>
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
        onClose={() => setVictoryDismissed(true)}
        title={stripAccents("Bravo !")}
        closeLabel={stripAccents("Fermer la boîte de dialogue")}
        contentClassName="text-gray-100"
      >
        {target ? (
          <ShareResult
            character={target}
            guessCount={state.guesses.length}
            onNewGame={() => {
              setVictoryDismissed(true);
              openNewGameModal();
            }}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={newGameModalOpen}
        onClose={closeNewGameModal}
        title={stripAccents("Nouvelle partie ?")}
        closeLabel={stripAccents("Fermer la boîte de dialogue")}
      >
        <p className="mb-6 text-sm leading-relaxed text-gray-300">
          {stripAccents("La partie en cours sera effacée et un nouveau personnage sera tiré au hasard.")}
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
    </div>
  );
}

export function BlurModePageClient({ universeId, universeData }: BlurModePageClientProps) {
  const hasBackground = Boolean(universeData.backgroundImage?.trim());
  const font = universeData.font;

  return (
    <UniverseDataProvider universeData={universeData}>
      {font && (
        <style
          dangerouslySetInnerHTML={{
            __html: `@font-face{font-family:"${font.family}";src:url("${font.url}") format("${font.format}");font-display:swap;}`,
          }}
        />
      )}
      <div
        className="relative min-h-screen"
        style={font ? { fontFamily: `"${font.family}", sans-serif` } : undefined}
      >
        {hasBackground ? (
          <>
            <div
              className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${universeData.backgroundImage!.trim()})` }}
            />
            <div className="fixed inset-0 -z-10 bg-black/50" aria-hidden />
          </>
        ) : (
          <>
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950" />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-transparent to-transparent" />
          </>
        )}

        <div className="mx-auto px-2 py-4 sm:px-4 sm:py-6 md:px-6">
          <header className="mb-4 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 justify-start">
              <Link
                href="/"
                className="min-h-[2.75rem] min-w-[2.75rem] text-sm font-medium text-gray-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                {stripAccents("← Accueil")}
              </Link>
            </div>
            <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold text-white sm:text-lg md:text-xl">
              {stripAccents(`Défloutage — ${universeData.name}`)}
            </h1>
            <div className="flex min-w-0 flex-1 justify-end" aria-hidden />
          </header>

          <BlurModeContent universeId={universeId} />
        </div>
      </div>
    </UniverseDataProvider>
  );
}
