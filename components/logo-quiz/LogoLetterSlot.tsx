"use client";

import { stripAccents } from "@/lib/utils";

interface LogoLetterSlotProps {
  letter: string | null;
  separator?: string;
  onClear?: () => void;
  disabled?: boolean;
  locked?: boolean;
}

export function LogoLetterSlot({
  letter,
  separator,
  onClear,
  disabled,
  locked,
}: LogoLetterSlotProps) {
  if (separator !== undefined) {
    return (
      <span
        className="flex h-10 w-3 items-center justify-center text-lg font-semibold text-gray-500 sm:h-11"
        aria-hidden={separator === " "}
      >
        {separator === " " ? "" : separator}
      </span>
    );
  }

  const isFilled = Boolean(letter);
  const canClear = isFilled && !locked && !disabled;

  return (
    <button
      type="button"
      onClick={() => {
        if (canClear && onClear) onClear();
      }}
      disabled={!canClear}
      aria-label={
        locked && isFilled
          ? stripAccents(`Lettre ${letter} bien placee`)
          : isFilled
            ? stripAccents(`Retirer la lettre ${letter}`)
            : stripAccents("Emplacement vide")
      }
      className={`flex size-10 items-center justify-center rounded-lg border-2 text-base font-bold uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 sm:size-11 sm:text-lg ${
        locked && isFilled
          ? "border-green-500 bg-green-600 text-white"
          : isFilled
            ? "border-ocean-500 bg-gray-800 text-white hover:border-ocean-400"
            : "border-gray-600 bg-gray-900/80 text-transparent"
      } disabled:cursor-default`}
    >
      {letter || "·"}
    </button>
  );
}
