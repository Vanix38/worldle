"use client";

import { FaHeart, FaMars, FaQuestion, FaSkull, FaVenus } from "react-icons/fa";
import { TbArrowBigDownFilled, TbArrowBigUpFilled } from "react-icons/tb";
import type { FeedbackStatus } from "@/types/game";
import { resolveGenderDisplay } from "@/lib/gender-display";
import { resolveVitalityDisplay } from "@/lib/vitality-display";
import { SpecificSymbolsMixedDisplay } from "@/lib/specific-symbols-display";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { stripAccents } from "@/lib/utils";

interface AttributeCellProps {
  label: string;
  /** Clé du champ JSON (ex. status). */
  fieldKey: string;
  value: string | number;
  status: FeedbackStatus;
}

const statusClasses: Record<FeedbackStatus, string> = {
  exact: "bg-green-700 text-white border-green-800",
  partial: "bg-orange-600 text-white border-orange-700",
  none: "bg-crimson-500 text-white border-crimson-600",
  higher: "bg-crimson-500 text-white border-crimson-600",
  lower: "bg-crimson-500 text-white border-crimson-600",
};

const arrowIconClass =
  "pointer-events-none h-full min-h-0 max-h-full w-auto max-w-full shrink-0 text-black/35";

export function AttributeCell({ label, fieldKey, value, status }: AttributeCellProps) {
  const { specificSymbols } = useUniverseData();
  const className = statusClasses[status];
  const vitality = resolveVitalityDisplay(value, fieldKey);
  const gender = vitality === null ? resolveGenderDisplay(value, fieldKey) : null;

  const stringForSymbols =
    typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
  const symbolNode =
    specificSymbols.length > 0 && stringForSymbols !== "" ? (
      <SpecificSymbolsMixedDisplay
        value={stringForSymbols}
        specificSymbols={specificSymbols}
        iconClassName="h-6 w-6 shrink-0 rounded-sm object-contain sm:h-7 sm:w-7"
      />
    ) : null;

  const valueNode =
    vitality === "alive" ? (
      <FaHeart className="inline-block h-4 w-4 shrink-0 text-red-100" aria-hidden />
    ) : vitality === "dead" ? (
      <FaSkull className="inline-block h-4 w-4 shrink-0 text-gray-100" aria-hidden />
    ) : vitality === "unknown" ? (
      <FaQuestion className="inline-block h-4 w-4 shrink-0 text-amber-100" aria-hidden />
    ) : gender === "male" ? (
      <FaMars className="inline-block h-4 w-4 shrink-0 text-sky-200" aria-hidden />
    ) : gender === "female" ? (
      <FaVenus className="inline-block h-4 w-4 shrink-0 text-pink-200" aria-hidden />
    ) : symbolNode !== null ? (
      symbolNode
    ) : (
      <span className="w-full break-words text-center">{stripAccents(String(value))}</span>
    );

  const showArrowIcon = status === "higher" || status === "lower";

  return (
    <div
      className={`relative flex min-h-11 min-w-0 w-full items-center justify-center gap-1.5 overflow-hidden rounded border px-2 py-1.5 text-center text-sm font-medium ${className}`}
      title={stripAccents(`${label}: ${value}`)}
      aria-label={stripAccents(`${label}: ${value} (${status})`)}
    >
      {showArrowIcon ? (
        <span
          className="pointer-events-none absolute inset-0 z-0 flex items-stretch justify-center px-0.5"
          aria-hidden
        >
          {status === "higher" ? (
            <TbArrowBigUpFilled className={arrowIconClass} />
          ) : (
            <TbArrowBigDownFilled className={arrowIconClass} />
          )}
        </span>
      ) : null}
      <span className="relative z-[1] flex min-w-0 w-full flex-1 flex-col items-center justify-center gap-1 text-center break-words">
        {valueNode}
      </span>
    </div>
  );
}
