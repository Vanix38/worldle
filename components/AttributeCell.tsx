"use client";

import { FaHeart, FaMars, FaQuestion, FaSkull, FaVenus } from "react-icons/fa";
import type { FeedbackStatus } from "@/types/game";
import { resolveGenderDisplay } from "@/lib/gender-display";
import { resolveVitalityDisplay } from "@/lib/vitality-display";
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
  partial: "bg-gold-600 text-white border-gold-600",
  none: "bg-crimson-500 text-white border-crimson-600",
  higher: "bg-gold-600 text-white border-gold-600",
  lower: "bg-gold-600 text-white border-gold-600",
};

const statusSymbol: Record<FeedbackStatus, string> = {
  exact: "✓",
  partial: "~",
  none: "✗",
  higher: "↑",
  lower: "↓",
};

export function AttributeCell({ label, fieldKey, value, status }: AttributeCellProps) {
  const className = statusClasses[status];
  const symbol = statusSymbol[status];
  const vitality = resolveVitalityDisplay(value, fieldKey);
  const gender = vitality === null ? resolveGenderDisplay(value, fieldKey) : null;

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
    ) : (
      stripAccents(String(value))
    );

  return (
    <div
      className={`flex min-h-[2.25rem] items-center gap-1.5 rounded border px-2 py-1.5 text-sm font-medium ${className}`}
      title={stripAccents(`${label}: ${value}`)}
      aria-label={stripAccents(`${label}: ${value} (${status})`)}
    >
      <span className="shrink-0 opacity-90" aria-hidden>
        {symbol}
      </span>
      <span className="min-w-0 flex-1">{valueNode}</span>
    </div>
  );
}
