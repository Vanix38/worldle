"use client";

import { stripAccents } from "@/lib/utils";
import type { LogoLetterHint } from "@/types/logo-quiz";

interface LogoLetterTileProps {
  letter: string;
  onSelect: () => void;
  disabled?: boolean;
  hint?: LogoLetterHint;
}

export function LogoLetterTileButton({
  letter,
  onSelect,
  disabled,
  hint,
}: LogoLetterTileProps) {
  const hintClasses =
    hint === "present"
      ? "border-amber-400 bg-amber-500/90 text-gray-900 hover:border-amber-300 hover:bg-amber-400"
      : hint === "absent"
        ? "border-gray-700 bg-gray-700/70 text-gray-500 opacity-60"
        : "border-gray-600 bg-gray-800 text-white hover:border-ocean-500 hover:bg-gray-700";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || hint === "absent"}
      aria-label={
        hint === "present"
          ? stripAccents(`Lettre ${letter}, presente dans le mot`)
          : hint === "absent"
            ? stripAccents(`Lettre ${letter}, absente du mot`)
            : stripAccents(`Lettre ${letter}`)
      }
      className={`flex size-10 items-center justify-center rounded-lg border text-base font-bold uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 disabled:cursor-not-allowed sm:size-11 sm:text-lg ${hintClasses}`}
    >
      {letter}
    </button>
  );
}
