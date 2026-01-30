"use client";

import type { FeedbackStatus } from "@/types/game";

interface AttributeCellProps {
  label: string;
  value: string | number;
  status: FeedbackStatus;
}

const statusClasses: Record<FeedbackStatus, string> = {
  exact: "bg-green-700 text-white border-green-800",
  partial: "bg-amber-600 text-white border-amber-700",
  none: "bg-red-700 text-white border-red-800",
  higher: "bg-amber-600 text-white border-amber-700",
  lower: "bg-amber-600 text-white border-amber-700",
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
      title={label}
      role="img"
      aria-label={`${label}: ${value} (${status})`}
    >
      <span className="mr-1 opacity-90" aria-hidden>{symbol}</span>
      {String(value)}
    </div>
  );
}
