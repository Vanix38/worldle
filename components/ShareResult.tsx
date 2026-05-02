"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaCheck, FaCopy, FaShareAlt } from "react-icons/fa";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { stripAccents } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { CharacterAvatar } from "@/components/CharacterAvatar";

interface ShareResultProps {
  character: Character;
  guessCount: number;
  onNewGame: () => void;
}

function buildGameUrl(universeId: string): string {
  if (typeof window === "undefined") return "";
  const bp = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/^\/+|\/+$/g, "");
  const path = `${bp ? `/${bp}` : ""}/game/${universeId}`.replace(/\/+/g, "/");
  return `${window.location.origin}${path}`;
}

export function ShareResult({ character, guessCount, onNewGame }: ShareResultProps) {
  const { universeId, universeName } = useUniverseData();
  const displayName = stripAccents(character.name);
  const displayUniverse = stripAccents(universeName);

  const shareUrl = useMemo(() => buildGameUrl(universeId), [universeId]);

  const victoryLine = stripAccents(
    `J'ai trouvé ${displayName} en ${guessCount} coup${guessCount > 1 ? "s" : ""} !`
  );

  const shareTitle = stripAccents(`Worlddle — ${universeName}`);
  /** Texte complet : titre + résultat + lien (même contenu pour copier et natif share). */
  const shareFullText = useMemo(() => {
    const lines = [shareTitle, victoryLine];
    if (shareUrl) lines.push(shareUrl);
    return lines.join("\n\n");
  }, [shareTitle, victoryLine, shareUrl]);

  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareFullText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  }, [shareFullText]);

  const handleShare = useCallback(async () => {
    // Ne pas passer `url` seul : beaucoup de cibles n’affichent que le lien et ignorent `text`.
    const payload: ShareData = {
      title: shareTitle,
      text: shareFullText,
    };

    if (!navigator.share) {
      await copyToClipboard();
      return;
    }

    try {
      if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
        await copyToClipboard();
        return;
      }
      await navigator.share(payload);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyToClipboard();
    }
  }, [copyToClipboard, shareFullText, shareTitle]);

  const coupLabel = stripAccents(guessCount > 1 ? "coups" : "coup");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Victoire : ${displayName} en ${guessCount} coup${guessCount > 1 ? "s" : ""}`}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-2xl bg-green-500/20 blur-xl" aria-hidden />
          <CharacterAvatar
            character={character}
            size="lg"
            className="relative rounded-2xl ring-2 ring-green-400/50 shadow-lg shadow-green-900/30"
          />
        </motion.div>
        <div className="inline-flex items-center rounded-full bg-green-500/15 px-3 py-1 text-sm font-semibold tabular-nums text-green-300 ring-1 ring-green-500/35">
          {guessCount} {coupLabel}
        </div>
      </div>

      <div className="space-y-1 text-center">
        <p className="text-lg leading-snug text-white sm:text-xl">
          {stripAccents("C'était")}{" "}
          <strong className="font-semibold text-green-100">{displayName}</strong>
        </p>
        <p className="text-sm text-gray-400">{displayUniverse}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          variant="primary"
          size="md"
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 sm:w-auto sm:min-w-[9rem]"
          onClick={handleShare}
          aria-label={stripAccents("Partager le résultat")}
        >
          <FaShareAlt className="h-4 w-4 shrink-0" aria-hidden />
          {stripAccents("Partager")}
        </Button>
        <Button
          variant="secondary"
          size="md"
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 sm:w-auto sm:min-w-[9rem]"
          onClick={copyToClipboard}
          aria-label={stripAccents("Copier le texte du résultat")}
        >
          {copyState === "copied" ? (
            <FaCheck className="h-4 w-4 shrink-0 text-green-400" aria-hidden />
          ) : (
            <FaCopy className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {copyState === "copied"
            ? stripAccents("Copié !")
            : copyState === "error"
              ? stripAccents("Erreur")
              : stripAccents("Copier")}
        </Button>
      </div>

      <Button
        variant="success"
        size="md"
        type="button"
        className="inline-flex w-full items-center justify-center gap-2"
        onClick={onNewGame}
        aria-label={stripAccents("Nouvelle partie")}
      >
        {stripAccents("Nouvelle partie")}
      </Button>
    </div>
  );
}
