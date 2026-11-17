"use client";

import { stripAccents } from "@/lib/utils";

interface LogoLetterSlotProps {
  letter: string | null;
  separator?: string;
  onClear?: () => void;
  disabled?: boolean;
  locked?: boolean;
  /** Width formula (may use %). Height follows via aspect-ratio so cells stay square. */
  sizeCss?: string;
}

export function LogoLetterSlot({
  letter,
  separator,
  onClear,
  disabled,
  locked,
  sizeCss = "2.75rem",
}: LogoLetterSlotProps) {
  if (separator !== undefined) {
    return (
      <span
        className="flex w-[0.5rem] shrink-0 items-center justify-center self-stretch text-base font-semibold text-gray-500 sm:text-lg"
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
      className={`box-border flex shrink-0 grow-0 items-center justify-center self-center rounded-lg border-2 text-[length:clamp(0.625rem,2.5vw,1.125rem)] font-bold uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 ${
        locked && isFilled
          ? "border-green-500 bg-green-600 text-white"
          : isFilled
            ? "border-ocean-500 bg-gray-800 text-white hover:border-ocean-400"
            : "border-gray-600 bg-gray-900/80 text-transparent"
      } disabled:cursor-default`}
      style={{
        width: sizeCss,
        aspectRatio: "1 / 1",
        height: "auto",
      }}
    >
      {letter || "·"}
    </button>
  );
}
