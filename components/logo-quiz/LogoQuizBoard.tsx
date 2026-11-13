"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { stripAccents } from "@/lib/utils";
import { resolveLogoDisplayUrl } from "@/lib/logo-quiz-display";
import { buildAnswerPattern, resolveSlotLetters } from "@/lib/logo-quiz-letters";
import { useLogoQuizProgress } from "@/hooks/useLogoQuizProgress";
import { getNextLogoId, useLogoQuizState } from "@/hooks/useLogoQuizState";
import type { LogoQuizPack } from "@/types/logo-quiz";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LogoDifficultyBadge } from "./LogoDifficultyBadge";
import { LogoLetterSlot } from "./LogoLetterSlot";
import { LogoLetterTileButton } from "./LogoLetterTile";

interface LogoQuizBoardProps {
  pack: LogoQuizPack;
  logoId: string;
}

export function LogoQuizBoard({ pack, logoId }: LogoQuizBoardProps) {
  const router = useRouter();
  const {
    state,
    target,
    hydrated,
    wrongFlash,
    availableBank,
    selectFromBank,
    removeFromSlot,
    resetGame,
    isMissingLogo,
  } = useLogoQuizState(pack, logoId);
  const { isCompleted } = useLogoQuizProgress(pack.id);

  const [victoryDismissed, setVictoryDismissed] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const won = state?.won ?? false;
  const nextLogoId = getNextLogoId(pack, logoId);
  const listHref = `/logo/${pack.id}`;

  useEffect(() => {
    setIsReplaying(false);
  }, [logoId]);

  useEffect(() => {
    if (won) {
      setVictoryDismissed(false);
      setIsReplaying(false);
    }
  }, [won]);

  const handleReset = () => {
    setIsReplaying(true);
    setVictoryDismissed(true);
    resetGame();
  };

  const handleNext = () => {
    if (nextLogoId) router.push(`/logo/${pack.id}/${nextLogoId}`);
    else router.push(listHref);
  };

  if (isMissingLogo) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-gray-400">{stripAccents("Logo introuvable dans ce pack.")}</p>
        <Link
          href={listHref}
          className="inline-flex text-sm font-medium text-ocean-500 hover:text-ocean-400"
        >
          {stripAccents("← Retour a la liste")}
        </Link>
      </div>
    );
  }

  if (!hydrated || !state || !target) {
    return (
      <p className="py-8 text-center text-gray-400" aria-live="polite">
        {stripAccents("Chargement…")}
      </p>
    );
  }

  const pattern = buildAnswerPattern(target.name);
  const slotLetters = resolveSlotLetters(state.slots, state.bank);
  const victoryOpen = won && !victoryDismissed;
  const showFullLogo = won || (isCompleted(logoId) && !isReplaying);
  const displayUrl = resolveLogoDisplayUrl(target, showFullLogo);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <Link
          href={listHref}
          className="text-sm font-medium text-gray-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
        >
          {stripAccents("← Liste")}
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            aria-label={stripAccents("Recommencer ce logo")}
          >
            {stripAccents("Recommencer")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleNext}
            aria-label={
              nextLogoId
                ? stripAccents("Logo suivant")
                : stripAccents("Retour a la liste")
            }
          >
            {nextLogoId
              ? stripAccents("Suivant")
              : stripAccents("Liste")}
          </Button>
        </div>
      </div>

      {target.difficulty ? (
        <div className="flex items-center justify-center">
          <LogoDifficultyBadge difficulty={target.difficulty} variant="full" />
        </div>
      ) : null}

      <div
        className="flex aspect-square w-full max-w-[16rem] items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-white/95 p-4 sm:max-w-[18rem]"
        aria-label={
          showFullLogo
            ? stripAccents(`Logo ${target.name}`)
            : stripAccents("Logo à deviner")
        }
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="px-4 text-center text-sm text-gray-500">
            {stripAccents("Image manquante")}
          </span>
        )}
      </div>

      <div
        className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${
          wrongFlash ? "animate-logo-shake" : ""
        }`}
        role="group"
        aria-label={stripAccents("Réponse")}
      >
        {pattern.map((slot, index) => {
          if (slot.kind === "separator") {
            return (
              <LogoLetterSlot
                key={`sep-${index}`}
                letter={null}
                separator={slot.char}
              />
            );
          }
          const playableIndex = slot.playableIndex ?? 0;
          const isLocked = state.lockedSlots[playableIndex] ?? false;
          return (
            <LogoLetterSlot
              key={`slot-${playableIndex}`}
              letter={slotLetters[playableIndex] || null}
              onClear={() => removeFromSlot(playableIndex)}
              disabled={won}
              locked={isLocked}
            />
          );
        })}
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-2"
        role="group"
        aria-label={stripAccents("Lettres disponibles")}
      >
        {state.bank.map((tile) =>
          tile.used ? (
            <span
              key={tile.id}
              className="size-10 rounded-lg border border-transparent sm:size-11"
              aria-hidden
            />
          ) : (
            <LogoLetterTileButton
              key={tile.id}
              letter={tile.letter}
              hint={tile.hint}
              onSelect={() => selectFromBank(tile.id)}
              disabled={
                won ||
                tile.hint === "absent" ||
                !availableBank.some((t) => t.id === tile.id)
              }
            />
          )
        )}
      </div>

      <Modal
        isOpen={victoryOpen}
        onClose={() => setVictoryDismissed(true)}
        title={stripAccents("Bravo !")}
      >
        <div className="space-y-3 text-left">
          <p>
            {stripAccents("Tu as trouvé :")}{" "}
            <span className="font-semibold text-white">{stripAccents(target.name)}</span>
          </p>
          {nextLogoId ? (
            <Button type="button" variant="primary" onClick={handleNext} className="w-full">
              {stripAccents("Logo suivant")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={nextLogoId ? "secondary" : "primary"}
            onClick={() => router.push(listHref)}
            className="w-full"
          >
            {stripAccents("Retour a la liste")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
