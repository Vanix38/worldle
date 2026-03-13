"use client";

import type { FeedbackStatus } from "@/types/game";
import { stripAccents } from "@/lib/utils";

interface AttributeCellProps {
  label: string;
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

export function AttributeCell({ label, value, status }: AttributeCellProps) {
  const className = statusClasses[status];
  const symbol = statusSymbol[status];

  return (
    <div
      className={`rounded border px-2 py-1.5 text-sm font-medium ${className}`}
      title={`${label}: ${value}`}
      aria-label={`${label}: ${value} (${status})`}
    >
      <span className="mr-1 opacity-90" aria-hidden>{symbol}</span>
      {stripAccents(String(value))}
    </div>
  );
}
